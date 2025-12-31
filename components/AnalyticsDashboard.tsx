import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Calendar, DollarSign,
    Users, Clock, ShoppingBag, Download, ChevronLeft, ChevronRight,
    Filter, PieChart, ArrowUpRight, ArrowDownRight, Printer, Search,
    Wallet, CreditCard, Banknote, Plus, Trash2, Save, X, FileText
} from 'lucide-react';
import { Order, OrderStatus, Category, Department, Deposit, PaymentMethod, Expense, Reservation, ReservationStatus } from '../types';
import { getOrders } from '../services/storageService';
import { supabase } from '../services/supabase';

interface AnalyticsDashboardProps {
    onClose?: () => void;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    isIntegrated?: boolean;
}

// Helper per determinare il reparto in base alla categoria
const getDepartmentByCategory = (cat: Category): Department => {
    switch (cat) {
        case Category.PIZZE: return 'Pizzeria';
        case Category.PANINI: return 'Pub';
        case Category.BEVANDE: return 'Sala'; // Le bevande vanno in Sala
        case Category.PRIMI:
        case Category.SECONDI:
        case Category.ANTIPASTI:
        case Category.DOLCI:
        case Category.MENU_COMPLETO:
            return 'Cucina';
        default: return 'Sala';
    }
};


export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose, showToast, isIntegrated = false }) => {
    // State
    const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'finance' | 'staff' | 'departments' | 'cash' | 'statement'>('overview');
    const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
    const [customDateStart, setCustomDateStart] = useState(new Date().toISOString().split('T')[0]);
    const [customDateEnd, setCustomDateEnd] = useState(new Date().toISOString().split('T')[0]);

    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const [loading, setLoading] = useState(true);

    // Expense Form State
    const [isAddingExpense, setIsAddingExpense] = useState(false);

    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        category: 'Fornitori',
        paymentMethod: 'cash',
        deductFrom: 'cassa',
        date: new Date().toISOString().split('T')[0]
    });

    // --- FETCH DATA ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date();

            switch (timeFilter) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                    break;
                case 'yesterday':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
                    startDate.setHours(0, 0, 0, 0);
                    endDate = now;
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = now;
                    break;
                case 'custom':
                    startDate = new Date(customDateStart);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(customDateEnd);
                    endDate.setHours(23, 59, 59, 999);
                    break;
            }

            console.log(`📊 Fetching Analytics: ${startDate.toLocaleString()} - ${endDate.toLocaleString()}`);

            // 1. ORDERS
            let fetchedOrders: Order[] = [];
            // Try Supabase first
            if (supabase) {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .in('status', ['Consegnato', 'Servito', 'DELIVERED', 'delivered', 'Pagato']);

                if (data && !error) {
                    fetchedOrders = data.map((row: any) => ({
                        ...row,
                        timestamp: new Date(row.created_at).getTime(), // Ensure timestamp is number
                        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
                    }));
                }
            }

            // Fallback Local Storage (merge or use if empty)
            const localOrders = getOrders().filter(o => {
                const t = new Date(o.timestamp);
                return t >= startDate && t <= endDate &&
                    ['Consegnato', 'Servito', 'DELIVERED', 'delivered', 'Pagato'].includes(o.status);
            });

            // Merge unique orders (prefer Supabase)
            const orderMap = new Map<string, Order>();
            localOrders.forEach(o => orderMap.set(o.id, o));
            fetchedOrders.forEach(o => orderMap.set(o.id, o));
            setOrders(Array.from(orderMap.values()));

            // 2. RESERVATIONS (for Deposits)
            // Load from localStorage since reservations are not yet in Supabase
            const { getReservations } = await import('../services/storageService');
            const allReservations = getReservations();

            // Filter by date range
            const fetchedReservations = allReservations.filter(r => {
                const createdTime = r.createdAt || 0;
                return createdTime >= startDate.getTime() && createdTime <= endDate.getTime();
            });

            // Extract valid deposits from reservations
            const validDeposits: Deposit[] = fetchedReservations
                .filter(r => r.depositAmount && Number(r.depositAmount) > 0 && r.status !== 'Cancellato' && r.status !== 'CANCELLED' && r.status !== ReservationStatus.CANCELLED)
                .map(r => ({
                    id: r.id + '_deposit',
                    reservationId: r.id,
                    amount: Number(r.depositAmount),
                    paymentMethod: r.depositMethod || 'cash',
                    paidAt: r.createdAt || Date.now(),
                    notes: `Acconto ${r.customerName} (Tav. ${r.tableNumber})`
                }));

            setDeposits(validDeposits);

            // 3. EXPENSES (Spese)
            if (supabase) {
                // Try fetch
                const { data: expData } = await supabase
                    .from('expenses')
                    .select('*')
                    .gte('date', startDate.toISOString().split('T')[0])
                    .lte('date', endDate.toISOString().split('T')[0]);

                if (expData) {
                    setExpenses(expData);
                } else {
                    // Local Storage Fallback
                    const localExp = JSON.parse(localStorage.getItem('expenses') || '[]');
                    const filteredExp = localExp.filter((e: Expense) => {
                        return e.date >= startDate.toISOString().split('T')[0] &&
                            e.date <= endDate.toISOString().split('T')[0];
                    });
                    setExpenses(filteredExp);
                }
            }

        } catch (err) {
            console.error("Analytics fetch error:", err);
            showToast("Errore caricamento dati storici", 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [timeFilter, customDateStart, customDateEnd]);

    // --- AGGREGATION LOGIC ---

    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalOrdersCount = orders.length;
        let totalCovers = 0;
        let hourlyDist: Record<number, number> = {};
        let itemSales: Record<string, { count: number, revenue: number }> = {};

        let departmentRevenue: Record<Department, number> = {
            'Cucina': 0, 'Pizzeria': 0, 'Pub': 0, 'Sala': 0
        };

        orders.forEach(order => {
            const orderTotal = order.items?.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0) || 0;
            totalRevenue += orderTotal;
            // totalCovers += (order.coperti || 0); // Coperti not in Order type yet

            // Hourly Distribution
            const hour = new Date(order.timestamp).getHours();
            hourlyDist[hour] = (hourlyDist[hour] || 0) + orderTotal;

            // Department Revenue
            order.items?.forEach(item => {
                const dept = getDepartmentByCategory(item.menuItem.category);
                if (departmentRevenue[dept] !== undefined) {
                    departmentRevenue[dept] += (item.menuItem.price * item.quantity);
                }

                // Item Sales
                const key = item.menuItem.name;
                if (!itemSales[key]) itemSales[key] = { count: 0, revenue: 0 };
                itemSales[key].count += item.quantity;
                itemSales[key].revenue += (item.menuItem.price * item.quantity);
            });
        });

        // Add Deposits to Revenue (if confirmed)
        const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);

        // Expenses
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const expensesCassa = expenses.filter(e => e.deductFrom === 'cassa').reduce((sum, e) => sum + e.amount, 0);
        const expensesAcconti = expenses.filter(e => e.deductFrom === 'acconti').reduce((sum, e) => sum + e.amount, 0);

        const netCashFlow = totalRevenue + totalDeposits - expensesCassa - expensesAcconti;
        // Logic for netDepositsFlow can be refined
        const netDepositsFlow = totalDeposits - expensesAcconti;

        return {
            totalRevenue,
            totalOrdersCount,
            totalCovers,
            averageCheck: totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0,
            hourlyDist,
            itemSales,
            departmentRevenue,
            totalDeposits,
            totalExpenses,
            expensesCassa,
            expensesAcconti,
            netCashFlow: netCashFlow,
            netDepositsFlow
        };
    }, [orders, deposits, expenses]);

    // --- ACTIONS ---

    const handleSaveExpense = async () => {
        if (!newExpense.amount || !newExpense.description) {
            showToast("Inserisci importo e descrizione", 'error');
            return;
        }

        const expenseToSave: Expense = {
            id: crypto.randomUUID(),
            amount: Number(newExpense.amount),
            description: newExpense.description || '',
            category: newExpense.category || 'Fornitori',
            date: newExpense.date || new Date().toISOString().split('T')[0],
            paymentMethod: newExpense.paymentMethod || 'cash',
            deductFrom: newExpense.deductFrom || 'cassa',
            notes: newExpense.notes,
            createdAt: Date.now() // Added createdAt
        };

        // Save to Supabase
        if (supabase) {
            const { error } = await supabase.from('expenses').insert(expenseToSave);
            if (error) {
                console.error("Error saving expense:", error);
                showToast("Errore salvataggio spesa", 'error');
                return;
            }
        } else {
            // Local Storage
            const localExp = JSON.parse(localStorage.getItem('expenses') || '[]');
            localExp.push(expenseToSave);
            localStorage.setItem('expenses', JSON.stringify(localExp));
        }

        setExpenses(prev => [...prev, expenseToSave]);
        setIsAddingExpense(false);
        setNewExpense({
            category: 'Fornitori',
            paymentMethod: 'cash',
            deductFrom: 'cassa',
            date: new Date().toISOString().split('T')[0]
        });
        showToast("Spesa registrata", 'success');
    };

    const handleDeleteExpense = async (id: string) => {
        if (supabase) {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) {
                showToast("Errore eliminazione spesa", 'error');
                return;
            }
        } else {
            const localExp = JSON.parse(localStorage.getItem('expenses') || '[]');
            const updated = localExp.filter((e: Expense) => e.id !== id);
            localStorage.setItem('expenses', JSON.stringify(updated));
        }

        setExpenses(prev => prev.filter(e => e.id !== id));
        showToast("Spesa eliminata", 'success');
    };

    // --- RENDER HELPERS ---

    const renderKPICard = (title: string, value: string, icon: any, colorClass: string, subValue?: string) => (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 opacity-10 ${colorClass} transition-transform group-hover:scale-110`}>
                {React.createElement(icon, { size: 100 })}
            </div>
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg bg-opacity-20 ${colorClass.replace('text-', 'bg-')}`}>
                    {React.createElement(icon, { size: 20, className: colorClass })}
                </div>
                <h3 className="text-slate-400 font-bold text-sm uppercase">{title}</h3>
            </div>
            <p className="text-3xl font-black text-white mb-1">{value}</p>
            {subValue && <p className="text-sm text-slate-500">{subValue}</p>}
        </div>
    );

    // --- MAIN RENDER ---

    const containerClass = isIntegrated
        ? "w-full min-h-full bg-slate-950 text-white flex flex-col"
        : "fixed inset-0 bg-slate-950 z-50 overflow-y-auto";

    return (
        <div className={containerClass}>
            {/* Header */}
            {!isIntegrated && (
                <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <BarChart3 className="text-blue-500" />
                        Analytics Dashboard
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
            )}

            <div className="p-6 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">

                {/* Controls & Filters */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
                        {[
                            { id: 'overview', label: 'Panoramica', icon: BarChart3 },
                            { id: 'departments', label: 'Reparti', icon: PieChart },
                            { id: 'cash', label: 'Cassa & Spese', icon: Wallet },
                            { id: 'statement', label: 'Estratto Conto', icon: FileText },
                            { id: 'tables', label: 'Tavoli', icon: ShoppingBag },
                            { id: 'finance', label: 'Finanze', icon: DollarSign },
                            //{ id: 'staff', label: 'Staff', icon: Users },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-lg  shadow-blue-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        {(['today', 'yesterday', 'week', 'month'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeFilter(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === t ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {t === 'today' ? 'Oggi' : t === 'yesterday' ? 'Ieri' : t === 'week' ? '7gg' : 'Mese'}
                            </button>
                        ))}
                        <button
                            onClick={() => setTimeFilter('custom')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === 'custom' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Custom
                        </button>
                    </div>

                    {/* Custom Date Inputs */}
                    {timeFilter === 'custom' && (
                        <div className="flex items-center gap-2 animate-fade-in bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                            <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
                            <span className="text-slate-500">-</span>
                            <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
                        </div>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-8">

                        {/* KPI SUMMARIES (Always visible on Overview) */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {renderKPICard('Fatturato', `€ ${stats.totalRevenue.toFixed(2)}`, DollarSign, 'text-green-500', `${stats.totalOrdersCount} ordini`)}
                                {renderKPICard('Scontrino Medio', `€ ${stats.averageCheck.toFixed(2)}`, TrendingUp, 'text-blue-500', 'Per tavolo')}
                                {renderKPICard('Saldo Acconti', `€ ${stats.netDepositsFlow.toFixed(2)}`, Wallet, stats.netDepositsFlow >= 0 ? 'text-purple-500' : 'text-red-400', 'Deposits - Spese')}
                                {renderKPICard('Saldo Cassa', `€ ${stats.netCashFlow.toFixed(2)}`, TrendingUp, stats.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400', 'Ordini - Spese Cassa')}
                            </div>
                        )}

                        {/* TAB: DEPARTMENTS */}
                        {(activeTab === 'departments' || activeTab === 'overview') && (activeTab === 'departments' || activeTab === 'overview') && (
                            <div className={activeTab === 'overview' ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
                                {activeTab === 'overview' && <h3 className="text-xl font-bold text-white mb-4 mt-8">Performance Reparti</h3>}

                                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <PieChart className="text-orange-500" />
                                        Fatturato per Reparto
                                    </h3>
                                    <p className="text-2xl font-bold mt-1">
                                        €{(stats.departmentRevenue['Cucina'] || 0).toFixed(2)}
                                    </p>
                                    <div className="space-y-4">
                                        {(Object.keys(stats.departmentRevenue) as Department[]).map(dept => {
                                            const rev = stats.departmentRevenue[dept as 'Cucina']; // Cast to a known key or use a hardcoded key
                                            const percent = stats.totalRevenue > 0 ? (rev / stats.totalRevenue) * 100 : 0;
                                            if (rev === 0 && activeTab === 'overview') return null; // Hide empty in overview
                                            return (
                                                <div key={dept} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-bold text-slate-300">{dept}</span>
                                                        <span className="font-bold text-white">€ {rev.toFixed(2)}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-800 rounded-full h-2">
                                                        <div
                                                            className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 text-right">{percent.toFixed(1)}%</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {activeTab === 'departments' && (
                                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                                        <h3 className="text-xl font-bold text-white mb-6">Dettagli Reparti</h3>
                                        <p className="text-slate-400">
                                            Ogni categoria di prodotto è mappata al reparto di produzione corrispondente.
                                            Cucina (Primi, Secondi), Pizzeria (Pizze), Pub (Panini, Bevande).
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB: CASH & EXPENSES */}
                        {activeTab === 'cash' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                        <h4 className="text-slate-400 uppercase text-xs font-bold mb-2">Entrate Totali (Ordini + Acconti)</h4>
                                        <p className="text-3xl font-black text-green-500">€ {(stats.totalRevenue + stats.totalDeposits).toFixed(2)}</p>
                                        <span className="text-xs text-slate-500">Ordini: €{stats.totalRevenue.toFixed(2)} + Acconti: €{stats.totalDeposits.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                        <h4 className="text-slate-400 uppercase text-xs font-bold mb-2">Uscite Totali (Spese)</h4>
                                        <p className="text-3xl font-black text-red-500">€ {stats.totalExpenses.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                        <h4 className="text-slate-400 uppercase text-xs font-bold mb-2">Saldo Netto</h4>
                                        <p className={`text-3xl font-black ${stats.netCashFlow >= 0 ? 'text-white' : 'text-red-400'}`}>
                                            € {stats.netCashFlow.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Spese List */}
                                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                <ArrowDownRight className="text-red-500" />
                                                Registro Spese
                                            </h3>
                                            <button
                                                onClick={() => setIsAddingExpense(!isAddingExpense)}
                                                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                            >
                                                <Plus size={16} /> Nuova Spesa
                                            </button>
                                        </div>

                                        {isAddingExpense && (
                                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 mb-6 animate-slide-down">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <input
                                                        type="text" placeholder="Descrizione"
                                                        value={newExpense.description || ''}
                                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                                                    />
                                                    <input
                                                        type="number" placeholder="Importo €"
                                                        value={newExpense.amount || ''}
                                                        onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                                                    />
                                                    <select
                                                        value={newExpense.category}
                                                        onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                                                    >
                                                        <option value="Fornitori">Fornitori</option>
                                                        <option value="Personale">Personale</option>
                                                        <option value="Utenze">Utenze</option>
                                                        <option value="Altro">Altro</option>
                                                    </select>
                                                    <select
                                                        value={newExpense.deductFrom || 'cassa'}
                                                        onChange={e => setNewExpense({ ...newExpense, deductFrom: e.target.value as any })}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                                                    >
                                                        <option value="cassa">Scala da Cassa</option>
                                                        <option value="acconti">Scala da Acconti</option>
                                                    </select>
                                                    <select
                                                        value={newExpense.paymentMethod}
                                                        onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value as PaymentMethod })}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                                                    >
                                                        <option value="cash">Contanti</option>
                                                        <option value="card">Carta/Bancomat</option>
                                                        <option value="bank_transfer">Bonifico</option>
                                                    </select>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setIsAddingExpense(false)} className="px-4 py-2 text-slate-400 hover:text-white">Annulla</button>
                                                    <button onClick={handleSaveExpense} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold flex items-center gap-2">
                                                        <Save size={16} /> Salva Spesa
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {expenses.length === 0 ? (
                                                <p className="text-slate-500 text-center py-8">Nessuna spesa registrata.</p>
                                            ) : (
                                                expenses.map(exp => (
                                                    <div key={exp.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                                        <div>
                                                            <p className="font-bold text-white text-sm">{exp.description}</p>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{exp.category}</span>
                                                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase ${exp.deductFrom === 'acconti' ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                                                                    {exp.deductFrom === 'acconti' ? 'Da Acconti' : 'Da Cassa'}
                                                                </span>
                                                                <span>• {new Date(exp.date).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-red-400">- € {exp.amount.toFixed(2)}</span>
                                                            <button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Depositi List */}
                                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                            <Wallet className="text-green-500" />
                                            Acconti Ricevuti
                                        </h3>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {deposits.length === 0 ? (
                                                <div className="text-slate-500 text-center py-8">
                                                    Nessun acconto da prenotazioni in questo periodo.
                                                    <br />
                                                    <span className="text-xs">Usa "Nuova Prenotazione" per aggiungere acconti.</span>
                                                </div>
                                            ) : (
                                                deposits.map((dep, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                                                        <div>
                                                            <p className="font-bold text-white text-sm">{dep.notes || 'Acconto'}</p>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <span>{new Date(dep.paidAt).toLocaleDateString()}</span>
                                                                <span>• {dep.paymentMethod}</span>
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-green-400">+ € {dep.amount.toFixed(2)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'statement' && (
                            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 min-h-[500px]">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <FileText className="text-blue-500" />
                                    Estratto Conto
                                </h3>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase font-bold">
                                                <th className="p-3">Data</th>
                                                <th className="p-3">Descrizione</th>
                                                <th className="p-3">Categoria</th>
                                                <th className="p-3 text-right">Entrate</th>
                                                <th className="p-3 text-right">Uscite</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {(() => {
                                                const allTransactions = [
                                                    ...orders.map(o => {
                                                        // Pulisci il numero tavolo da _HISTORY e undefined
                                                        let cleanTableNumber = (o.tableNumber || '')
                                                            .replace(/_HISTORY/gi, '')
                                                            .replace(/undefined/gi, '')
                                                            .trim();

                                                        // Determina il tipo di ordine dal numero tavolo
                                                        let orderType = 'Ordine Tavolo';
                                                        const lowerTable = cleanTableNumber.toLowerCase();
                                                        if (lowerTable.includes('delivery') || lowerTable.includes('consegna')) {
                                                            orderType = 'Ordine Delivery';
                                                        } else if (lowerTable.includes('asporto') || lowerTable.includes('takeaway')) {
                                                            orderType = 'Ordine Asporto';
                                                        }

                                                        // Se il tavolo è vuoto, mostra solo "Ordine"
                                                        const description = cleanTableNumber
                                                            ? `${orderType} ${cleanTableNumber}`
                                                            : 'Ordine';

                                                        return {
                                                            id: o.id,
                                                            date: o.timestamp,
                                                            desc: description,
                                                            category: 'Vendita',
                                                            in: o.items.reduce((sum, i) => sum + (i.menuItem.price * i.quantity), 0),
                                                            out: 0,
                                                            type: 'order'
                                                        };
                                                    }),
                                                    ...deposits.map(d => ({
                                                        id: d.id,
                                                        date: d.paidAt || new Date().getTime(),
                                                        desc: d.notes || 'Acconto',
                                                        category: 'Acconto',
                                                        in: d.amount,
                                                        out: 0,
                                                        type: 'deposit'
                                                    })),
                                                    ...expenses.map(e => ({
                                                        id: e.id,
                                                        date: new Date(e.date).getTime(),
                                                        desc: e.description,
                                                        category: e.category,
                                                        in: 0,
                                                        out: e.amount,
                                                        type: 'expense'
                                                    }))
                                                ].sort((a, b) => b.date - a.date);

                                                if (allTransactions.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                                                Nessun movimento nel periodo selezionato.
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return allTransactions.map(t => (
                                                    <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                                        <td className="p-3 text-slate-300 font-mono text-xs">{new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                        <td className="p-3 text-white font-bold">{t.desc}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${t.type === 'order' ? 'bg-green-900/30 text-green-400' :
                                                                t.type === 'deposit' ? 'bg-purple-900/30 text-purple-400' :
                                                                    'bg-red-900/30 text-red-400'
                                                                }`}>
                                                                {t.category}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-mono text-green-400 font-bold">
                                                            {t.in > 0 ? `+ € ${t.in.toFixed(2)}` : '-'}
                                                        </td>
                                                        <td className="p-3 text-right font-mono text-red-400 font-bold">
                                                            {t.out > 0 ? `- € ${t.out.toFixed(2)}` : '-'}
                                                        </td>
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                        <tfoot className="bg-slate-950 border-t border-slate-700">
                                            <tr>
                                                <td colSpan={3} className="p-4 text-right font-bold text-white uppercase">Totale Periodo</td>
                                                <td className="p-4 text-right font-black text-green-500 text-lg">
                                                    € {(stats.totalRevenue + stats.totalDeposits).toFixed(2)}
                                                </td>
                                                <td className="p-4 text-right font-black text-red-500 text-lg">
                                                    € {stats.totalExpenses.toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'finance' && (
                            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center">
                                <h3 className="text-xl font-bold text-white mb-4">Finanze Avanzate</h3>
                                <p className="text-slate-400">Implementazione futura: connessione bancaria e report fiscali.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
