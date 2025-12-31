import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { DailyClosure, PaymentMethod, Order, Deposit, Expense } from '../types';
import { getOrders, getAppSettings } from '../services/storageService';
import { Calculator, Save, AlertTriangle, CheckCircle, Banknote, Coins, X, MessageCircle } from 'lucide-react';

interface DailyClosureManagerProps {
    onClose: () => void;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DailyClosureManager: React.FC<DailyClosureManagerProps> = ({ onClose, showToast }) => {
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'review' | 'count' | 'confirm'>('review');

    // Data for calculation
    const [todayOrders, setTodayOrders] = useState<Order[]>([]);
    const [todayDeposits, setTodayDeposits] = useState<Deposit[]>([]);
    const [todayExpenses, setTodayExpenses] = useState<Expense[]>([]);
    const [previousClosure, setPreviousClosure] = useState<DailyClosure | null>(null);

    // Inputs
    const [startCash, setStartCash] = useState<number>(0);
    const [actualCash, setActualCash] = useState<number>(0);
    const [notes, setNotes] = useState('');

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchDailyData();
    }, []);

    const fetchDailyData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Previous Closure (for start cash suggestion)
            if (supabase) {
                const { data: prevData } = await supabase
                    .from('daily_closures')
                    .select('*')
                    .lt('date', today)
                    .order('date', { ascending: false })
                    .limit(1)
                    .single();

                if (prevData) {
                    setPreviousClosure({
                        ...prevData,
                        totalSales: Number(prevData.total_sales),
                        totalExpenses: Number(prevData.total_expenses),
                        startCash: Number(prevData.start_cash),
                        endCash: Number(prevData.end_cash),
                        actualCash: Number(prevData.actual_cash),
                        closedAt: prevData.closed_at
                    });
                    setStartCash(Number(prevData.actual_cash || 0)); // Suggest starting cash from last closure
                }
            }

            // 2. Fetch Orders (Today) - Using local/sync service logic
            // In a real app we'd fetch from Supabase if online, else local.
            // Here we assume synced data or fetch from Supabase if integrated.
            let orders: Order[] = [];
            if (supabase) {
                const start = new Date(today); start.setHours(0, 0, 0, 0);
                const end = new Date(today); end.setHours(23, 59, 59, 999);
                const { data } = await supabase.from('orders')
                    .select('*')
                    .gte('created_at', start.toISOString())
                    .lte('created_at', end.toISOString())
                    .in('status', ['Consegnato', 'Servito', 'DELIVERED', 'delivered', 'Pagato']);
                if (data) orders = data.map((r: any) => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items }));
            } else {
                orders = getOrders().filter(o =>
                    new Date(o.timestamp).toISOString().split('T')[0] === today &&
                    ['Consegnato', 'Servito', 'DELIVERED', 'delivered', 'Pagato'].includes(o.status)
                );
            }
            setTodayOrders(orders);

            // 3. Fetch Expenses (Today)
            let expenses: Expense[] = [];
            if (supabase) {
                const { data } = await supabase
                    .from('expenses')
                    .select('*')
                    .eq('expense_date', today);

                if (data) expenses = data.map((r: any) => ({
                    id: r.id,
                    description: r.description,
                    amount: Number(r.amount),
                    date: r.expense_date,
                    paymentMethod: r.payment_method,
                    deductFrom: r.deduct_from,
                    category: r.category_id,
                    createdAt: new Date(r.created_at).getTime()
                }));
            }
            setTodayExpenses(expenses);

            // 4. Fetch Deposits (Not implemented fully in DB yet, usually from reservations)
            // Placeholder: Assume 0 or implement similar logic to Analytics
            setTodayDeposits([]);

        } catch (err) {
            console.error(err);
            showToast('Errore recupero dati giornalieri', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Calculations
    const totalSales = todayOrders.reduce((sum, o) => {
        // Calculate total from items
        return sum + (o.items?.reduce((s, i) => s + (i.menuItem.price * i.quantity), 0) || 0);
    }, 0);

    const cashSales = totalSales; // Assuming all orders are cash for now unless PaymentMethod is stored on Order (it usually is not in this model yet, defaulted to 'cash')

    // Expenses
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cashExpenses = todayExpenses
        .filter(e => e.paymentMethod === 'cash' && e.deductFrom === 'cassa')
        .reduce((sum, e) => sum + e.amount, 0);

    const expectedEndCash = startCash + cashSales - cashExpenses; // Add deposits if needed
    const difference = actualCash - expectedEndCash;

    const handleSaveClosure = async () => {
        if (!supabase) return;

        const closureData = {
            date: today,
            total_sales: totalSales,
            total_expenses: totalExpenses,
            start_cash: startCash,
            end_cash: expectedEndCash,
            actual_cash: actualCash,
            difference: difference,
            notes: notes,
            closed_at: new Date().toISOString()
        };

        const { error } = await supabase.from('daily_closures').upsert(closureData, { onConflict: 'date' });

        if (error) {
            console.error(error);
            showToast('Errore salvataggio chiusura', 'error');
        } else {
            showToast('Chiusura salvata correttamente', 'success');
            onClose();
        }
    };

    const handleSendWhatsApp = async () => {
        const settings = getAppSettings();
        const recipients = settings.restaurantProfile?.closureReportRecipients || [];
        const wpConfig = settings.restaurantProfile?.whatsappApiConfig;

        if (recipients.length === 0) {
            showToast('Nessun destinatario configurato. Vai in Gestione Spese > Destinatari Report', 'error');
            return;
        }

        if (!wpConfig?.phoneNumberId || !wpConfig?.accessToken) {
            showToast('API WhatsApp non configurate in Admin', 'error');
            return;
        }

        const config = {
            phoneNumberId: wpConfig.phoneNumberId,
            accessToken: wpConfig.accessToken,
            businessAccountId: wpConfig.businessAccountId,
            apiVersion: wpConfig.apiVersion
        };

        const message = `📊 *Chiusura Cassa ${new Date().toLocaleDateString('it-IT')}*\n\n` +
            `💰 Vendite: € ${totalSales.toFixed(2)}\n` +
            `💸 Spese: € ${totalExpenses.toFixed(2)}\n` +
            `💵 Cassa Iniziale: € ${startCash.toFixed(2)}\n` +
            `✅ Cassa Attesa: € ${expectedEndCash.toFixed(2)}\n` +
            `🔢 Cassa Reale: € ${actualCash.toFixed(2)}\n` +
            `${difference >= 0 ? '✅' : '⚠️'} Differenza: € ${difference.toFixed(2)}\n\n` +
            (notes ? `📝 Note: ${notes}` : '');

        try {
            const { sendTextMessage } = await import('../services/whatsappService');
            let successCount = 0;
            for (const recipient of recipients) {
                const res = await sendTextMessage(config as any, recipient.phone, message);
                if (res.success) successCount++;
                else console.error(`WhatsApp Error for ${recipient.name}:`, res.error);
            }
            if (successCount > 0) showToast(`Inviato a ${successCount} destinatari`, 'success');
            else showToast('Errore invio messaggi', 'error');
        } catch (error) {
            console.error(error);
            showToast('Errore sistema WhatsApp', 'error');
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Caricamento dati...</div>;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            <Calculator className="text-blue-500" />
                            Chiusura Cassa
                        </h2>
                        <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Step 1: Riepilogo Teorico */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-white font-bold text-lg border-b border-slate-800 pb-2">1. Flusso Teorico</h3>

                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Fondo Cassa Iniziale</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 text-xs">Modifica</span>
                                        <input
                                            type="number"
                                            value={startCash}
                                            onChange={e => setStartCash(Number(e.target.value))}
                                            className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-white font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-green-400">
                                    <span className="text-sm flex items-center gap-2"><Banknote size={14} /> Vendite (Contanti)</span>
                                    <span className="font-mono">+ € {cashSales.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-400">
                                    <span className="text-sm flex items-center gap-2"><Coins size={14} /> Spese (da Cassa)</span>
                                    <span className="font-mono">- € {cashExpenses.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-slate-800 pt-2 flex justify-between items-center font-bold text-white text-lg">
                                    <span>Totale Atteso</span>
                                    <span className="font-mono text-blue-400">€ {expectedEndCash.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Conteggio Reale */}
                        <div className="space-y-4">
                            <h3 className="text-white font-bold text-lg border-b border-slate-800 pb-2">2. Conteggio Reale</h3>

                            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col gap-4">
                                <label className="text-slate-400 text-sm font-bold uppercase">Importo contato nel cassetto</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl font-light">€</span>
                                    <input
                                        type="number"
                                        value={actualCash || ''}
                                        onChange={e => setActualCash(Number(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-4 text-3xl font-black text-white focus:border-blue-500 outline-none text-right font-mono"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-slate-500 text-center">Inserisci il totale delle banconote e monete presenti.</p>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Verifica Differenza */}
                    <div className={`p-4 rounded-xl border ${difference === 0 ? 'bg-green-900/20 border-green-500/30' : 'bg-yellow-900/20 border-yellow-500/30'} transition-all`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                {difference === 0 ? <CheckCircle className="text-green-500" size={24} /> : <AlertTriangle className="text-yellow-500" size={24} />}
                                <div>
                                    <h4 className={`font-bold ${difference === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {difference === 0 ? 'Quadratura Perfetta' : difference > 0 ? 'Eccedenza di Cassa' : 'Ammanco di Cassa'}
                                    </h4>
                                    <p className="text-xs text-slate-400">Differenza tra atteso e reale</p>
                                </div>
                            </div>
                            <span className={`text-2xl font-black font-mono ${difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {difference > 0 ? '+' : ''} € {difference.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-slate-500 text-xs font-bold uppercase block mb-2">Note Chiusura (Opzionale)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm h-20 resize-none outline-none focus:border-slate-600"
                            placeholder="Es. Mancano 50 cent, o prelievo titolare..."
                        />
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        Annulla
                    </button>
                    <button
                        onClick={handleSendWhatsApp}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center gap-2"
                    >
                        <MessageCircle size={20} /> Invia su WhatsApp
                    </button>
                    <button
                        onClick={handleSaveClosure}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transform active:scale-95 transition-all"
                    >
                        <Save size={20} /> Conferma & Chiudi Cassa
                    </button>
                </div>
            </div>
        </div>
    );
};
