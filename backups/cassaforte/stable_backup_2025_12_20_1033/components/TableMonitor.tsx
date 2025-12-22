import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { getOrders, getTableCount, getAppSettings, resetAllTableDataService } from '../services/storageService';
import { User, ChefHat, CheckCircle, Clock, AlertTriangle, Home, Users, Calendar, X, Receipt, Trash2 } from 'lucide-react';
import { Category } from '../types';

interface TableMonitorProps {
    onExit: () => void;
}

const TableMonitor: React.FC<TableMonitorProps> = ({ onExit }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [tableCount, setTableCount] = useState(12);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const loadData = () => {
        setOrders(getOrders() || []);
        setTableCount(getTableCount() || 12);
    };

    useEffect(() => {
        loadData();
        const handleStorage = () => loadData();
        window.addEventListener('local-storage-update', handleStorage);
        window.addEventListener('local-settings-update', handleStorage);

        // Update time every second
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        // Refresh data every 2 seconds
        const dataInterval = setInterval(loadData, 2000);

        return () => {
            window.removeEventListener('local-storage-update', handleStorage);
            window.removeEventListener('local-settings-update', handleStorage);
            clearInterval(timeInterval);
            clearInterval(dataInterval);
        };
    }, []);

    const getTableStatus = (tableNum: string) => {
        const tableOrders = orders.filter(o => o.tableNumber === tableNum && o.status !== OrderStatus.DELIVERED);

        if (tableOrders.length === 0) {
            // Check reservation
            const settings = getAppSettings();
            const reservations = settings.tableReservations || [];
            if (reservations.includes(tableNum)) return 'reserved';
            return 'free';
        }

        const allItemsServed = tableOrders.every(order => (order.items || []).every(item => item.served));
        if (allItemsServed) return 'completed';

        const hasItemsToServe = tableOrders.some(o => (o.items || []).some(i => i.completed && !i.served));
        if (hasItemsToServe) return 'ready';

        const hasItemsCooking = tableOrders.some(o => (o.items || []).some(i => !i.completed));
        if (hasItemsCooking) return 'cooking';

        return 'occupied';
    };

    const getTableWaiter = (tableNum: string): string | null => {
        const tableOrder = orders.find(o => o.tableNumber === tableNum && o.status !== OrderStatus.DELIVERED);
        return tableOrder?.waiterName || null;
    };

    const getElapsedTime = (tableNum: string): string | null => {
        const tableOrders = orders.filter(o => o.tableNumber === tableNum && o.status !== OrderStatus.DELIVERED);
        if (tableOrders.length === 0) return null;

        const oldestOrder = tableOrders.reduce((oldest, current) => {
            const oldestTime = new Date(oldest.createdAt || oldest.timestamp).getTime();
            const currentTime = new Date(current.createdAt || current.timestamp).getTime();
            return currentTime < oldestTime ? current : oldest;
        });

        const orderTime = new Date(oldestOrder.createdAt || oldestOrder.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - orderTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins}m`;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    const getSharedWaiters = (tableNum: string): string[] => {
        const settings = getAppSettings();
        return settings.sharedTables?.[tableNum] || [];
    };

    const getStatusCounts = () => {
        const counts = { free: 0, occupied: 0, cooking: 0, ready: 0, completed: 0, reserved: 0 };
        for (let i = 1; i <= tableCount; i++) {
            const status = getTableStatus(i.toString());
            counts[status as keyof typeof counts]++;
        }
        return counts;
    };

    const statusCounts = getStatusCounts();

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col overflow-hidden">
            {/* Header Bar */}
            <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Users size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Monitor Tavoli</h1>
                        <p className="text-slate-400 text-sm font-medium">Coordinamento Sala in Tempo Reale</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Live Clock */}
                    <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
                        <Clock size={20} className="text-blue-400" />
                        <span className="text-white font-mono text-xl font-bold">
                            {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>

                    {/* Exit Button */}
                    <button
                        onClick={onExit}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-all border border-slate-600 flex items-center gap-2"
                    >
                        <Home size={20} />
                        Esci
                    </button>
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="bg-red-900/40 hover:bg-red-600 text-red-200 hover:text-white p-3 rounded-xl font-bold transition-all border border-red-800 ml-2 shadow-lg hover:shadow-red-900/40"
                        title="Reset Emergenza Dati"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Status Summary Bar */}
            <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-3">
                <div className="flex items-center justify-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-slate-700"></div>
                        <span className="text-slate-300 font-bold text-sm">Liberi: {statusCounts.free}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span className="text-blue-300 font-bold text-sm">Occupati: {statusCounts.occupied}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                        <span className="text-purple-300 font-bold text-sm">Prenotati: {statusCounts.reserved}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                        <span className="text-orange-300 font-bold text-sm">In Cucina: {statusCounts.cooking}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-green-300 font-bold text-sm">Pronti: {statusCounts.ready}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-700"></div>
                        <span className="text-orange-300 font-bold text-sm">Serviti: {statusCounts.completed}</span>
                    </div>
                </div>
            </div>

            {/* Tables Grid */}
            <div className="flex-1 overflow-auto p-8">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4 max-w-[1920px] mx-auto">
                    {Array.from({ length: tableCount }, (_, i) => i + 1).map(num => {
                        const tableNum = num.toString();
                        const status = getTableStatus(tableNum);
                        const waiter = getTableWaiter(tableNum);
                        const elapsedTime = getElapsedTime(tableNum);
                        const sharedWaiters = getSharedWaiters(tableNum);
                        const isShared = sharedWaiters.length > 0;

                        let bgClass = "bg-slate-800 border-slate-700";
                        let statusIcon = null;
                        let statusText = "Libero";
                        let textColor = "text-slate-400";

                        if (status === 'occupied') {
                            bgClass = "bg-blue-900/40 border-blue-500/50";
                            statusIcon = <User size={16} className="text-blue-300" />;
                            statusText = "Occupato";
                            textColor = "text-blue-100";
                        }
                        if (status === 'reserved') {
                            bgClass = "bg-purple-900/40 border-purple-500/50 dashed-border";
                            statusIcon = <Calendar size={16} className="text-purple-300" />;
                            statusText = "Prenotato";
                            textColor = "text-purple-100";
                        }
                        if (status === 'cooking') {
                            bgClass = "bg-orange-900/40 border-orange-500/50";
                            statusIcon = <ChefHat size={16} className="text-orange-300" />;
                            statusText = "In Cucina";
                            textColor = "text-orange-100";
                        }
                        if (status === 'ready') {
                            bgClass = "bg-green-600 border-green-400 animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.6)]";
                            statusIcon = <AlertTriangle size={16} className="text-white animate-bounce" />;
                            statusText = "PRONTO!";
                            textColor = "text-white";
                        }
                        if (status === 'completed') {
                            bgClass = "bg-orange-700/80 border-orange-500";
                            statusIcon = <CheckCircle size={16} className="text-orange-100" />;
                            statusText = "Servito";
                            textColor = "text-white";
                        }

                        return (
                            <div
                                key={num}
                                onClick={() => setSelectedTable(tableNum)}
                                className={`aspect-square rounded-2xl border-2 flex flex-col p-2 shadow-xl transition-all relative cursor-pointer hover:scale-105 active:scale-95 ${bgClass} ${isShared ? 'ring-4 ring-purple-500/50' : ''}`}
                            >
                                {/* Top Bar: Shared & Elapsed Time */}
                                <div className="flex justify-between items-start w-full h-6">
                                    {isShared ? (
                                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center border-2 border-purple-400 shadow-lg">
                                            <Users size={12} className="text-white" />
                                        </div>
                                    ) : <div></div>}

                                    {elapsedTime && status !== 'free' && (
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${status === 'ready' ? 'bg-red-500 text-white animate-pulse' : 'bg-black/40 backdrop-blur-sm text-white'}`}>
                                            <Clock size={10} />
                                            {elapsedTime}
                                        </div>
                                    )}
                                </div>

                                {/* Center: Table Number & Status */}
                                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                                    <span className={`text-4xl font-black ${textColor} leading-none`}>{num}</span>
                                    <div className="flex flex-col items-center">
                                        {statusIcon}
                                        <span className={`text-[10px] font-bold ${textColor} uppercase tracking-wider text-center leading-tight`}>
                                            {statusText}
                                        </span>
                                    </div>
                                </div>

                                {/* Bottom: Waiter Name */}
                                <div className="h-6 w-full flex items-end justify-center">
                                    {waiter && (
                                        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-2 py-0.5 text-center w-full max-w-full">
                                            <p className="text-white text-[10px] font-bold truncate">
                                                {isShared ? `👥 ${sharedWaiters.join(', ')}` : `👤 ${waiter}`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Legend */}
            <div className="bg-slate-900/80 backdrop-blur-md border-t border-slate-700 px-6 py-3">
                <div className="flex items-center justify-center gap-8 text-xs text-slate-400">

                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-blue-400" />
                        <span>Tempo Trascorso</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-green-400" />
                        <span>Attenzione Richiesta</span>
                    </div>
                </div>
            </div>

            {/* TABLE DETAILS MODAL */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedTable(null)}>
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-slate-800 p-5 border-b border-slate-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                                    Tavolo {selectedTable}
                                    {getTableStatus(selectedTable) === 'reserved' && <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full uppercase tracking-wide">Prenotato</span>}
                                </h2>
                                <p className="text-slate-400 text-sm font-bold flex items-center gap-2 mt-1">
                                    <User size={14} /> {getTableWaiter(selectedTable) || 'Nessun cameriere'}
                                    {getSharedWaiters(selectedTable).length > 0 && <span className="text-purple-400"> (+{getSharedWaiters(selectedTable).join(', ')})</span>}
                                </p>
                            </div>
                            <button onClick={() => setSelectedTable(null)} className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto custom-scroll flex-1">
                            {orders.filter(o => o.tableNumber === selectedTable && o.status !== 'Servito').length > 0 ? (
                                <div className="space-y-4">
                                    {orders.filter(o => o.tableNumber === selectedTable && o.status !== 'Servito').map(order => (
                                        <div key={order.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-500" />
                                                    <span className="text-xs text-slate-500 font-mono">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-lg uppercase ${order.status === 'Pronto' ? 'bg-green-600 text-white animate-pulse' : order.status === 'In Preparazione' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-slate-400">{item.quantity}x</span>
                                                            <span className={item.served ? "text-slate-500 line-through decoration-slate-600" : "text-white"}>{item.menuItem.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {item.notes && <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 max-w-[100px] truncate">{item.notes}</span>}
                                                            {item.completed ? (
                                                                <CheckCircle size={14} className="text-green-500" />
                                                            ) : (
                                                                <div className="w-3.5 h-3.5 rounded-full border border-slate-600"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                                    <Receipt size={48} className="mb-4 opacity-20" />
                                    <p>Nessun ordine attivo</p>
                                    <p className="text-xs mt-2">Il tavolo è libero o l'ordine è stato completato.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* RESET CONFIRMATION MODAL */}
            {showResetConfirm && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border-2 border-red-500/50 w-full max-w-sm rounded-3xl p-8 shadow-2xl shadow-red-900/50 animate-bounce-in relative overflow-hidden">
                        {/* Background Effect */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col items-center text-center gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-full bg-red-900/30 border-2 border-red-500 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                                <AlertTriangle size={32} className="text-red-500 animate-pulse" />
                            </div>

                            <h3 className="text-2xl font-black text-white">Reset Totale?</h3>

                            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 w-full">
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Stai per cancellare tutte le <span className="text-purple-400 font-bold">Prenotazioni</span> e le <span className="text-blue-400 font-bold">Collaborazioni</span> attive.
                                    <br /><br />
                                    <span className="text-red-400 font-bold text-xs uppercase tracking-widest">Azione Irreversibile</span>
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all border border-slate-700"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={async () => {
                                        await resetAllTableDataService();
                                        setTimeout(() => window.location.reload(), 500);
                                    }}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 border border-red-500"
                                >
                                    CONFERMA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableMonitor;
