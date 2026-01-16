
import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, PaymentMethod } from '../types';
import {
    Wallet, Calendar, Plus, Trash2, Save,
    FileText, ChevronLeft, ChevronRight, TrendingDown,
    Calculator, Users
} from 'lucide-react';
import { DailyClosureManager } from './DailyClosureManager';
import { ClosureRecipientsManager } from './ClosureRecipientsManager';
import { getExpenses, addExpense as addExpenseService, deleteExpense as deleteExpenseService } from '../services/storageService';

interface ExpenseManagerProps {
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ showToast }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [showClosure, setShowClosure] = useState(false);
    const [showRecipients, setShowRecipients] = useState(false);

    // Filter State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [timeFilter, setTimeFilter] = useState<'month' | 'day'>('month');

    // New Expense State
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        date: Date.now(),
        paymentMethod: 'cash',
        // deductFrom: 'cassa' // Removed as it is not in the Expense interface in storageService yet, assumed logical handling
    });

    useEffect(() => {
        loadExpenses();

        // Listen for updates from other components (e.g. InventoryManager)
        const handleUpdate = () => loadExpenses();
        window.addEventListener('local-expenses-update', handleUpdate);
        return () => window.removeEventListener('local-expenses-update', handleUpdate);
    }, [selectedDate, timeFilter]);

    const loadExpenses = () => {
        setLoading(true);
        const allExpenses = getExpenses(); // Get from local storage

        // Filter locally
        const filtered = allExpenses.filter(e => {
            const expenseDate = new Date(e.date);
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();

            if (timeFilter === 'month') {
                return expenseDate.getFullYear() === year && expenseDate.getMonth() === month;
            } else {
                return expenseDate.toDateString() === selectedDate.toDateString();
            }
        });

        // Sort by date desc
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setExpenses(filtered);
        setLoading(false);
    };

    const handleSave = () => {
        if (!newExpense.description || !newExpense.amount) {
            showToast('Compila descrizione e importo', 'error');
            return;
        }

        addExpenseService({
            date: new Date(newExpense.date as any).getTime(), // Ensure timestamp
            description: newExpense.description,
            amount: Number(newExpense.amount),
            category: (newExpense.category as any) || 'other',
            notes: newExpense.notes,
            supplier: newExpense.supplier,
            invoiceNumber: newExpense.invoiceNumber,
            deductFrom: newExpense.deductFrom as any || 'cassa',
            paymentMethod: newExpense.paymentMethod as any || 'cash'
        });

        showToast('Spesa salvata con successo!', 'success');
        setIsAdding(false);
        setNewExpense({
            date: Date.now(),
            paymentMethod: 'cash',
            deductFrom: 'cassa'
        });
        loadExpenses();
    };

    const handleDelete = (id: string) => {
        deleteExpenseService(id);
        showToast('Spesa eliminata', 'success');
        loadExpenses();
    };

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in">
            {showClosure && <DailyClosureManager onClose={() => setShowClosure(false)} showToast={showToast} />}
            {showRecipients && <ClosureRecipientsManager onClose={() => setShowRecipients(false)} showToast={showToast} />}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Wallet className="text-red-500" size={32} />
                        Gestione Spese
                    </h2>
                    <p className="text-slate-400">Monitora e gestisci le uscite del tuo locale</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowClosure(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                    >
                        <Calculator size={20} /> Chiusura Cassa
                    </button>

                    <button
                        onClick={() => setShowRecipients(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                        <Users size={20} /> Destinatari Report
                    </button>

                    <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shadow-lg">
                        <button
                            onClick={() => {
                                const d = new Date(selectedDate);
                                if (timeFilter === 'month') d.setMonth(d.getMonth() - 1);
                                else d.setDate(d.getDate() - 1);
                                setSelectedDate(d);
                            }}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="relative flex items-center gap-3 px-2 min-w-[150px] justify-center group cursor-pointer">
                            <input
                                type={timeFilter === 'month' ? 'month' : 'date'}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                value={timeFilter === 'month'
                                    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
                                    : `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                }
                                onChange={(e) => {
                                    if (e.target.value) {
                                        // Parse local date components to avoid UTC shifts
                                        const parts = e.target.value.split('-');
                                        const year = parseInt(parts[0]);
                                        const month = parseInt(parts[1]) - 1;
                                        const day = parts[2] ? parseInt(parts[2]) : 1;
                                        const d = new Date(year, month, day);
                                        setSelectedDate(d);
                                    }
                                }}
                            />
                            <Calendar className="text-orange-500 group-hover:text-orange-400 transition-colors" size={20} />
                            <span className="font-bold text-lg capitalize text-white group-hover:text-blue-300 transition-colors">
                                {timeFilter === 'month'
                                    ? selectedDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
                                    : selectedDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })
                                }
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const d = new Date(selectedDate);
                                if (timeFilter === 'month') d.setMonth(d.getMonth() + 1);
                                else d.setDate(d.getDate() + 1);
                                setSelectedDate(d);
                            }}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>

                        <div className="h-6 w-px bg-slate-700 mx-2"></div>

                        <div className="flex bg-slate-950 p-1 rounded-lg">
                            <button
                                onClick={() => setTimeFilter('day')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${timeFilter === 'day' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                Giorno
                            </button>
                            <button
                                onClick={() => setTimeFilter('month')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${timeFilter === 'month' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                Mese
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingDown size={100} />
                    </div>
                    <div className="bg-red-500/20 p-4 rounded-xl text-red-500">
                        <TrendingDown size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Totale Uscite</p>
                        <p className="text-3xl font-black text-white">€ {totalAmount.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-slate-400" />
                        Registro Spese
                    </h3>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                    >
                        {isAdding ? <span className="text-white">Annulla</span> : <><Plus size={18} /> Aggiungi Spesa</>}
                    </button>
                </div>

                {isAdding && (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-700 mb-8 animate-slide-down">
                        <h4 className="text-white font-bold mb-4">Nuova Spesa</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Descrizione</label>
                                <input
                                    type="text"
                                    value={newExpense.description || ''}
                                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                                    placeholder="Es. Fornitura Bibite"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Importo</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-slate-500">€</span>
                                    <input
                                        type="number"
                                        value={newExpense.amount || ''}
                                        onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white outline-none focus:border-blue-500"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Categoria</label>
                                <select
                                    value={newExpense.category || ''}
                                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 appearance-none"
                                >
                                    <option value="other">Altro</option>
                                    <option value="inventory">Fornitori/Magazzino</option>
                                    <option value="utilities">Utenze</option>
                                    <option value="staff">Personale</option>
                                    <option value="rent">Affitto</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Data</label>
                                <input
                                    type="date"
                                    value={new Date(newExpense.date as any).toISOString().split('T')[0]}
                                    onChange={e => setNewExpense({ ...newExpense, date: new Date(e.target.value).getTime() })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Riga 2: Fonte, Metodo, Fornitore, Note */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Preleva Da</label>
                                <select
                                    value={newExpense.deductFrom || 'cassa'}
                                    onChange={e => setNewExpense({ ...newExpense, deductFrom: e.target.value as any })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 appearance-none"
                                >
                                    <option value="cassa">Cassa (Contanti)</option>
                                    <option value="acconti">Fondo Acconti</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Metodo Pagamento</label>
                                <select
                                    value={newExpense.paymentMethod || 'cash'}
                                    onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 appearance-none"
                                >
                                    <option value="cash">Contanti</option>
                                    <option value="card">Carta / POS</option>
                                    <option value="bonifico">Bonifico Bancario</option>
                                    <option value="check">Assegno</option>
                                    <option value="satispay">Satispay</option>
                                    <option value="paypal">PayPal</option>
                                    <option value="other">Altro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Fornitore (Opzionale)</label>
                                <input
                                    type="text"
                                    value={newExpense.supplier || ''}
                                    onChange={e => setNewExpense({ ...newExpense, supplier: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                                    placeholder="Es. Metro, Enel"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Note / Fattura</label>
                                <input
                                    type="text"
                                    value={newExpense.notes || ''}
                                    onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                                    placeholder="Es. Fattura #123"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleSave}
                                className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 transform active:scale-95 transition-all"
                            >
                                <Save size={20} /> Salva Spesa
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase font-bold">
                                <th className="p-4">Data</th>
                                <th className="p-4">Descrizione</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4">Fornitore / Note</th>
                                <th className="p-4 text-right">Importo</th>
                                <th className="p-4 text-center">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                                        Nessuna spesa registrata nel periodo selezionato.
                                    </td>
                                </tr>
                            ) : (
                                expenses.map(expense => (
                                    <tr key={expense.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 text-slate-300">
                                            {new Date(expense.date).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="p-4 text-white font-bold">{expense.description}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded text-xs font-bold text-white shadow-sm bg-slate-600 uppercase">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {expense.supplier && <span className="block text-blue-300 font-bold">{expense.supplier}</span>}
                                            {expense.invoiceNumber && <span className="block text-xs uppercase">{expense.invoiceNumber}</span>}
                                            {expense.notes && <span className="text-xs italic">{expense.notes}</span>}
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                {expense.deductFrom && (
                                                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${expense.deductFrom === 'acconti' ? 'bg-purple-900/30 border-purple-700 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                                        {expense.deductFrom === 'acconti' ? 'Fondo Acconti' : 'Cassa'}
                                                    </span>
                                                )}
                                                {expense.paymentMethod && (
                                                    <span className="text-[10px] uppercase bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
                                                        {expense.paymentMethod}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-black text-red-500">
                                            € {Number(expense.amount).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
