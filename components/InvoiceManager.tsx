import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText, User, Plus, Search, Send, Trash2, Printer,
    Check, X, Mail, ChevronDown, Calendar, AlertCircle, Edit
} from 'lucide-react';
import { Invoice, InvoiceItem, Customer, RestaurantProfile, Reservation } from '../types';
import { sendInvoiceToAccountant } from '../services/emailService';
import { supabase } from '../services/supabase';

interface InvoiceManagerProps {
    restaurantProfile?: RestaurantProfile;
    onSaveProfile?: (profile: RestaurantProfile) => void;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({ restaurantProfile, onSaveProfile, showToast, showConfirm }) => {
    // State
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [suggestedCustomers, setSuggestedCustomers] = useState<Customer[]>([]);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'sent_to_accountant'>('all');
    const [filterDate, setFilterDate] = useState('');

    const filteredInvoices = useMemo(() => {
        return invoices
            .filter(inv => {
                const term = searchTerm.toLowerCase();
                const matchSearch = (inv.customerName || '').toLowerCase().includes(term) ||
                    (inv.number || '').toLowerCase().includes(term);
                const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
                const matchDate = !filterDate || (inv.date && inv.date.startsWith(filterDate));
                return matchSearch && matchStatus && matchDate;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, searchTerm, filterStatus, filterDate]);

    // Form State
    const [formData, setFormData] = useState<Partial<Invoice>>({
        items: [],
        date: new Date().toISOString().split('T')[0],
        status: 'draft'
    });

    // Accountant Email State (local override if profile missing)
    const [accountantEmail, setAccountantEmail] = useState(restaurantProfile?.accountantEmail || '');

    // Load Invoices & Customers
    useEffect(() => {
        // Load Invoices local fallback
        const saved = localStorage.getItem('ristosync_invoices');
        if (saved) setInvoices(JSON.parse(saved));

        // Use Effect to update accountant email if profile changes
        if (restaurantProfile?.accountantEmail) {
            setAccountantEmail(restaurantProfile.accountantEmail);
        }
    }, [restaurantProfile]);

    // Derived Customer Search from Reservations (Smart Search)
    const searchCustomers = async (term: string) => {
        setCustomerSearch(term);
        if (term.length < 2) {
            setSuggestedCustomers([]);
            return;
        }

        let customers: Customer[] = [];

        // 1. From Reservations (Supabase)
        if (supabase) {
            const { data } = await supabase
                .from('reservations')
                .select('customerName, customerPhone, customerEmail')
                .ilike('customerName', `%${term}%`)
                .limit(10);

            if (data) {
                // Deduplicate
                const unique = new Map();
                data.forEach((r: any) => {
                    const key = r.customerPhone || r.customerEmail || r.customerName;
                    if (!unique.has(key)) {
                        const nameParts = (r.customerName || '').split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';

                        unique.set(key, {
                            id: crypto.randomUUID(),
                            firstName: firstName,
                            lastName: lastName,
                            phone: r.customerPhone,
                            email: r.customerEmail,
                            createdAt: Date.now(),
                            totalVisits: 0,
                            totalSpent: 0
                        } as Customer);
                    }
                });
                customers = Array.from(unique.values());
            }
        }

        // 2. From Local Storage Orders/Reservations if needed
        // (Simplified for now to rely on Supabase or Manual entry)

        setSuggestedCustomers(customers);
    };

    const handleSelectCustomer = (c: Customer) => {
        const fullName = c.businessName || `${c.firstName} ${c.lastName}`.trim();
        setFormData(prev => ({
            ...prev,
            customerName: fullName,
            customerEmail: c.email,
            customerVat: c.vatNumber
        }));
        setCustomerSearch(fullName);
        setSuggestedCustomers([]);
    };

    const handleAddItem = () => {
        const newItem: InvoiceItem = {
            id: crypto.randomUUID(),
            description: '',
            quantity: 1,
            unitPrice: 0,
            vatRate: 22,
            amount: 0
        };
        setFormData(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        const newItems = (formData.items || []).map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                // Auto-calc amount
                if (field === 'quantity' || field === 'unitPrice') {
                    updated.amount = updated.quantity * updated.unitPrice;
                }
                return updated;
            }
            return item;
        });
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const removeItem = (id: string) => {
        setFormData(prev => ({
            ...prev,
            items: (prev.items || []).filter(i => i.id !== id)
        }));
    };

    const calculateTotal = () => {
        const subtotal = (formData.items || []).reduce((sum, i) => sum + i.amount, 0);

        // Calculate VAT from vatRate
        const vatAmount = (formData.items || []).reduce((sum, i) => sum + (i.amount * (i.vatRate / 100)), 0);
        const total = subtotal + vatAmount;

        return { subtotal, vatAmount, total };
    };

    const totals = calculateTotal();

    const handleSaveInvoice = async (sendEmail: boolean) => {
        if (!formData.customerName || (formData.items || []).length === 0) {
            showToast("Inserisci cliente e almeno una riga", 'error');
            return;
        }

        if (sendEmail && !accountantEmail) {
            showToast("Inserisci l'email del commercialista", 'error');
            return;
        }

        // Save Accountant Email for future if changed
        if (onSaveProfile && accountantEmail && accountantEmail !== restaurantProfile?.accountantEmail) {
            showConfirm(
                "Nuova Email Commercialista",
                "Vuoi salvare questa email come predefinita nelle impostazioni?",
                () => {
                    onSaveProfile({ ...restaurantProfile, accountantEmail } as RestaurantProfile);
                    showToast("Email commercialista aggiornata!", 'success');
                }
            );
        }

        const newInvoice: Invoice = {
            id: formData.id || crypto.randomUUID(),
            number: formData.number || `INV-${new Date().getFullYear()}-${invoices.length + 1}`,
            date: formData.date || new Date().toISOString().split('T')[0],
            customerName: formData.customerName,
            customerVat: formData.customerVat,
            customerEmail: formData.customerEmail,
            customerAddress: formData.customerAddress,
            customerSdi: formData.customerSdi,
            customerPec: formData.customerPec,
            items: formData.items || [],
            subtotal: totals.subtotal,
            vatAmount: totals.vatAmount,
            total: totals.total,
            notes: formData.notes,
            status: sendEmail ? 'sent_to_accountant' : 'draft',
            year: new Date().getFullYear(),
            sentToAccountantAt: sendEmail ? Date.now() : undefined,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Save
        const updatedInvoices = [newInvoice, ...invoices];
        setInvoices(updatedInvoices);
        localStorage.setItem('ristosync_invoices', JSON.stringify(updatedInvoices));

        // Send Email
        if (sendEmail) {
            const sent = await sendInvoiceToAccountant(accountantEmail, newInvoice, restaurantProfile?.name || 'Ristorante');
            if (sent) {
                showToast("Fattura inviata al commercialista!", 'success');
            } else {
                showToast("Errore invio email (controlla console)", 'error');
            }
        } else {
            showToast("Bozza salvata", 'success');
        }

        setIsFormOpen(false);
        setFormData({ items: [], date: new Date().toISOString().split('T')[0], status: 'draft' });
    };

    const handlePrintInvoice = (inv: Invoice) => {
        setFormData(inv);
        setTimeout(() => window.print(), 200);
    };

    const handleDeleteInvoice = (id: string) => {
        showConfirm(
            "Elimina Fattura",
            "Sei sicuro di voler eliminare questa fattura definitivamente?",
            () => {
                const updated = invoices.filter(i => i.id !== id);
                setInvoices(updated);
                localStorage.setItem('ristosync_invoices', JSON.stringify(updated));
                showToast("Fattura eliminata", 'success');
            }
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <FileText className="text-blue-500" /> Gestione Fatture
                    </h2>
                    <p className="text-slate-400">Emetti fatture e inviale automaticamente.</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({ items: [], date: new Date().toISOString().split('T')[0], status: 'draft' });
                        setIsFormOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <Plus size={20} /> Nuova Fattura
                </button>
            </div>

            {/* Filters */}
            {invoices.length > 0 && (
                <div className="flex flex-col md:flex-row gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 mb-4">
                    <div className="relative flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Cerca cliente o numero..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                        <input
                            type="month"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none w-auto text-sm font-bold"
                        />
                    </div>
                    <div className="flex gap-2 text-sm overflow-x-auto pb-1 md:pb-0">
                        <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${filterStatus === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>Tutti</button>
                        <button onClick={() => setFilterStatus('sent_to_accountant')} className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${filterStatus === 'sent_to_accountant' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                            <div className="w-2 h-2 rounded-full bg-green-500" /> Inviate
                        </button>
                        <button onClick={() => setFilterStatus('draft')} className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${filterStatus === 'draft' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                            <div className="w-2 h-2 rounded-full bg-yellow-500" /> Bozze
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {invoices.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800">
                        <FileText size={48} className="mx-auto text-slate-700 mb-4" />
                        <h3 className="text-white font-bold text-lg">Nessuna fattura emessa</h3>
                        <p className="text-slate-500">Crea la tua prima fattura per iniziare.</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
                        <Search size={32} className="mx-auto text-slate-600 mb-2" />
                        <p className="text-slate-400">Nessuna fattura corrisponde ai criteri di ricerca.</p>
                    </div>
                ) : (
                    filteredInvoices.map(inv => (
                        <div key={inv.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${inv.status === 'sent_to_accountant' ? 'bg-green-500/10 text-green-500' : 'bg-slate-700/50 text-slate-400'}`}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-lg">{inv.number}</p>
                                    <p className="text-slate-400 text-sm">{new Date(inv.date).toLocaleDateString()} • {inv.customerName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="font-bold text-white text-xl">€ {inv.total.toFixed(2)}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'sent_to_accountant' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {inv.status === 'sent_to_accountant' ? 'Inviata' : 'Bozza'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setFormData(JSON.parse(JSON.stringify(inv))); setIsFormOpen(true); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-500" title="Modifica"><Edit size={18} /></button>
                                    <button onClick={() => handlePrintInvoice(inv)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white" title="Stampa"><Printer size={18} /></button>
                                    <button onClick={() => handleDeleteInvoice(inv.id!)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-500" title="Elimina"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL */}
            {
                isFormOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-slate-950 w-full max-w-4xl rounded-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-2xl">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileText className="text-blue-500" /> {formData.id ? 'Modifica Fattura' : 'Nuova Fattura'}
                                </h3>
                                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                            </div>

                            {/* Body */}
                            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">

                                {/* CUSTOMER SEARCH */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2"><User size={16} /> Dati Cliente (Debitore)</h4>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Cerca cliente per nome (es. Mario Rossi) o inserisci nuovo..."
                                            value={customerSearch}
                                            onChange={e => searchCustomers(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-blue-500 outline-none"
                                        />
                                        {suggestedCustomers.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                                {suggestedCustomers.map(c => (
                                                    <div
                                                        key={c.id || Math.random()}
                                                        onClick={() => handleSelectCustomer(c)}
                                                        className="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center text-sm border-b border-slate-800 last:border-0"
                                                    >
                                                        <span className="text-white font-bold">{c.businessName || `${c.firstName} ${c.lastName}`}</span>
                                                        <span className="text-slate-400">{c.phone || c.email}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" placeholder="Nome / Ragione Sociale" value={formData.customerName || ''} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
                                        <input type="text" placeholder="P.IVA / Codice Fiscale" value={formData.customerVat || ''} onChange={e => setFormData({ ...formData, customerVat: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
                                        <input type="text" placeholder="Indirizzo (Via, Città, CAP)" value={formData.customerAddress || ''} onChange={e => setFormData({ ...formData, customerAddress: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" placeholder="Codice SDI" value={formData.customerSdi || ''} onChange={e => setFormData({ ...formData, customerSdi: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
                                            <input type="text" placeholder="PEC" value={formData.customerPec || ''} onChange={e => setFormData({ ...formData, customerPec: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* INVOICE ITEMS */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2"><Check size={16} /> Righe Fattura</h4>
                                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-800 text-slate-400">
                                                <tr>
                                                    <th className="p-3">Descrizione</th>
                                                    <th className="p-3 w-20">Q.tà</th>
                                                    <th className="p-3 w-24">Prezzo Unit.</th>
                                                    <th className="p-3 w-24">Totale</th>
                                                    <th className="p-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {(formData.items || []).map(item => (
                                                    <tr key={item.id} className="text-white">
                                                        <td className="p-2">
                                                            <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="w-full bg-transparent outline-none" placeholder="Es. Servizio Catering" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} className="w-full bg-transparent outline-none text-center" min="1" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} className="w-full bg-transparent outline-none text-right" placeholder="0.00" />
                                                        </td>
                                                        <td className="p-3 font-mono text-right">
                                                            € {item.amount.toFixed(2)}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button onClick={() => removeItem(item.id)} className="text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button onClick={handleAddItem} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm font-bold">
                                            <Plus size={16} /> Aggiungi Riga
                                        </button>
                                    </div>
                                    <div className="flex justify-end gap-8 text-right p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase">Imponibile</p>
                                            <p className="font-bold text-white">€ {totals.subtotal.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase">IVA (22%)</p>
                                            <p className="font-bold text-white">€ {totals.vatAmount.toFixed(2)}</p>
                                        </div>
                                        <div className="border-l border-slate-700 pl-8">
                                            <p className="text-slate-400 text-xs uppercase font-bold">Totale</p>
                                            <p className="font-black text-2xl text-blue-400">€ {totals.total.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ACCOUNTANT CONFIG */}
                                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex items-center gap-4">
                                    <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-500"><Mail size={24} /></div>
                                    <div className="flex-1">
                                        <label className="text-yellow-200 text-xs font-bold uppercase mb-1 block">Email Commercialista</label>
                                        <input
                                            type="email"
                                            value={accountantEmail}
                                            onChange={e => setAccountantEmail(e.target.value)}
                                            placeholder="commercialista@studio.it"
                                            className="w-full bg-slate-950 border border-yellow-500/30 rounded-lg px-3 py-2 text-white focus:border-yellow-500 outline-none"
                                        />
                                        <p className="text-[10px] text-yellow-500/60 mt-1">La fattura verrà inviata automaticamente a questo indirizzo.</p>
                                    </div>
                                </div>

                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex justify-between items-center">
                                <div className="flex gap-3">
                                    <button onClick={() => setIsFormOpen(false)} className="px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 font-bold transition-colors">Annulla</button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition-colors flex items-center gap-2 border border-slate-700"
                                    >
                                        <Printer size={18} /> Stampa Cortesia
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleSaveInvoice(false)} className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors">Salva Bozza</button>
                                    <button onClick={() => handleSaveInvoice(true)} className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
                                        <Send size={18} /> Conferma e Invia
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

            <div id="printable-invoice" className="hidden">
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-invoice, #printable-invoice * { visibility: visible; }
                        #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; height: 100vh; display: block !important; background: white; color: black; padding: 40px; z-index: 9999; }
                        .no-print { display: none !important; }
                    }
                `}</style>
                {/* Intestazione */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{restaurantProfile?.name || 'Ristorante'}</h1>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>{restaurantProfile?.address || ''}</p>
                            <p>P.IVA: {restaurantProfile?.vatNumber || 'N/D'}</p>
                            <p>{restaurantProfile?.email || ''} {restaurantProfile?.phone ? `| ${restaurantProfile.phone}` : ''}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-slate-800 uppercase">Fattura di Cortesia</h2>
                        <p className="text-gray-500 text-sm mt-1">Data: {new Date(formData.date || Date.now()).toLocaleDateString()}</p>
                        <p className="text-gray-500 text-sm">Nr: {formData.number || 'BOZZA'}</p>
                    </div>
                </div>
                {/* Cliente */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Intestato a:</h3>
                    <p className="font-bold text-lg">{formData.customerName || 'Cliente Occasionale'}</p>
                    <p className="text-gray-600">{formData.customerAddress || ''}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                        {formData.customerVat && <p><span className="font-bold">P.IVA/CF:</span> {formData.customerVat}</p>}
                        {formData.customerSdi && <p><span className="font-bold">SDI:</span> {formData.customerSdi}</p>}
                        {formData.customerPec && <p><span className="font-bold">PEC:</span> {formData.customerPec}</p>}
                    </div>
                </div>
                {/* Tabella */}
                <table className="w-full text-left mb-8">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="py-2 text-sm font-black uppercase text-gray-600">Descrizione</th>
                            <th className="py-2 text-center w-20 text-sm font-black uppercase text-gray-600">Q.tà</th>
                            <th className="py-2 text-right w-32 text-sm font-black uppercase text-gray-600">Prezzo</th>
                            <th className="py-2 text-right w-32 text-sm font-black uppercase text-gray-600">Totale</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {(formData.items || []).map((item, i) => (
                            <tr key={i}>
                                <td className="py-3 text-sm">{item.description}</td>
                                <td className="py-3 text-center text-sm">{item.quantity}</td>
                                <td className="py-3 text-right text-sm">€ {item.unitPrice.toFixed(2)}</td>
                                <td className="py-3 text-right font-bold text-sm">€ {item.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Totali */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Imponibile:</span>
                            <span>€ {totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>IVA:</span>
                            <span>€ {totals.vatAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-black border-t border-slate-800 pt-2 mt-2">
                            <span>TOTALE:</span>
                            <span>€ {totals.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div className="mt-12 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
                    <p>Documento privo di valenza fiscale ai sensi dell'art 21 DPR 633/72</p>
                    <p>Emesso da RistoSync AI</p>
                </div>
            </div>
        </div >
    );
};
