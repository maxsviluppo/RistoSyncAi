import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, Send, Printer, Trash2, Edit2, X, Save,
    Mail, User, Search, Check, AlertCircle
} from 'lucide-react';
import { Invoice, InvoiceItem, Customer, RestaurantProfile } from '../types';
import { getAppSettings, saveAppSettings } from '../services/storageService';

interface InvoiceManagerProps {
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    restaurantProfile: RestaurantProfile;
    onUpdateProfile: (profile: RestaurantProfile) => void;
}

const VAT_RATES = [22, 10, 4, 0];

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({
    showToast,
    restaurantProfile,
    onUpdateProfile
}) => {
    const [activeTab, setActiveTab] = useState<'invoices' | 'settings'>('invoices');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [searchCustomer, setSearchCustomer] = useState('');
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
        date: new Date().toISOString().split('T')[0],
        items: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 22, total: 0 }],
        paymentStatus: 'pending'
    });

    const [newEmail, setNewEmail] = useState({ email: '', name: '', role: '' });

    useEffect(() => {
        // Load customers from localStorage
        const customersData = localStorage.getItem('ristosync_customers');
        if (customersData) {
            try {
                setCustomers(JSON.parse(customersData));
            } catch (e) {
                console.error('Error loading customers:', e);
            }
        }
        const savedInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        setInvoices(savedInvoices);
    }, []);

    const calculateItemTotal = (item: InvoiceItem) => {
        const base = item.quantity * item.unitPrice;
        const vat = base * (item.vatRate / 100);
        return base + vat;
    };

    const calculateTotals = (items: InvoiceItem[]) => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const vatTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.vatRate / 100), 0);
        return { subtotal, vatTotal, total: subtotal + vatTotal };
    };

    const addItem = () => {
        setNewInvoice(prev => ({
            ...prev,
            items: [...(prev.items || []), { description: '', quantity: 1, unitPrice: 0, vatRate: 22, total: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        setNewInvoice(prev => ({
            ...prev,
            items: prev.items?.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: number | string) => {
        setNewInvoice(prev => {
            const items = [...(prev.items || [])];
            if (field === 'description') {
                items[index] = { ...items[index], description: value as string };
            } else if (field === 'quantity') {
                items[index] = { ...items[index], quantity: value as number };
            } else if (field === 'unitPrice') {
                items[index] = { ...items[index], unitPrice: value as number };
            } else if (field === 'vatRate') {
                items[index] = { ...items[index], vatRate: value as number };
            }
            items[index].total = calculateItemTotal(items[index]);
            return { ...prev, items };
        });
    };

    const selectCustomer = (customer: Customer) => {
        setNewInvoice(prev => ({
            ...prev,
            customerId: customer.id,
            customerName: `${customer.lastName} ${customer.firstName}`,
            customerEmail: customer.email
        }));
        setShowCustomerSearch(false);
        setSearchCustomer('');
    };

    const saveInvoice = () => {
        if (!newInvoice.customerName) {
            showToast('Inserisci il nome del cliente', 'error');
            return;
        }
        if (!newInvoice.items || newInvoice.items.length === 0) {
            showToast('Aggiungi almeno una voce', 'error');
            return;
        }

        const totals = calculateTotals(newInvoice.items || []);
        const year = new Date().getFullYear();
        const invoiceNumber = `${year}/${String(invoices.length + 1).padStart(3, '0')}`;

        const invoice: Invoice = {
            id: editingInvoice?.id || crypto.randomUUID(),
            invoiceNumber: editingInvoice?.invoiceNumber || invoiceNumber,
            date: newInvoice.date || new Date().toISOString().split('T')[0],
            customerId: newInvoice.customerId,
            customerName: newInvoice.customerName || '',
            customerAddress: newInvoice.customerAddress,
            customerVat: newInvoice.customerVat,
            customerFiscalCode: newInvoice.customerFiscalCode,
            customerEmail: newInvoice.customerEmail,
            customerPec: newInvoice.customerPec,
            customerSdi: newInvoice.customerSdi,
            items: newInvoice.items || [],
            subtotal: totals.subtotal,
            vatTotal: totals.vatTotal,
            total: totals.total,
            paymentStatus: newInvoice.paymentStatus || 'pending',
            notes: newInvoice.notes,
            createdAt: editingInvoice?.createdAt || Date.now()
        };

        let updatedInvoices;
        if (editingInvoice) {
            updatedInvoices = invoices.map(inv => inv.id === editingInvoice.id ? invoice : inv);
            showToast('Fattura aggiornata', 'success');
        } else {
            updatedInvoices = [...invoices, invoice];
            showToast('Fattura creata', 'success');
        }

        setInvoices(updatedInvoices);
        localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
        resetForm();
    };

    const resetForm = () => {
        setIsCreating(false);
        setEditingInvoice(null);
        setNewInvoice({
            date: new Date().toISOString().split('T')[0],
            items: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 22, total: 0 }],
            paymentStatus: 'pending'
        });
    };

    const printInvoice = (invoice: Invoice) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fattura ${invoice.invoiceNumber}</title>
                <style>
                    @page { size: A4; margin: 15mm; }
                    body { font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .company { font-size: 20px; font-weight: bold; }
                    .invoice-title { font-size: 28px; color: #1a56db; }
                    .invoice-number { color: #666; }
                    .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
                    .section-title { font-weight: bold; margin-bottom: 10px; color: #1a56db; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background: #1a56db; color: white; }
                    .text-right { text-align: right; }
                    .totals { margin-top: 20px; text-align: right; }
                    .totals-row { margin: 5px 0; }
                    .total-final { font-size: 24px; font-weight: bold; color: #1a56db; }
                    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="company">${restaurantProfile.name || 'Ristorante'}</div>
                        <div>${restaurantProfile.address || ''}</div>
                        <div>P.IVA: ${restaurantProfile.vatNumber || 'N/D'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="invoice-title">FATTURA</div>
                        <div class="invoice-number">N. ${invoice.invoiceNumber}</div>
                        <div>Data: ${new Date(invoice.date).toLocaleDateString('it-IT')}</div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">CLIENTE</div>
                    <div><strong>${invoice.customerName}</strong></div>
                    ${invoice.customerAddress ? `<div>${invoice.customerAddress}</div>` : ''}
                    ${invoice.customerVat ? `<div>P.IVA: ${invoice.customerVat}</div>` : ''}
                    ${invoice.customerFiscalCode ? `<div>C.F.: ${invoice.customerFiscalCode}</div>` : ''}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Descrizione</th>
                            <th class="text-right">Qtà</th>
                            <th class="text-right">Prezzo Unit.</th>
                            <th class="text-right">IVA %</th>
                            <th class="text-right">Totale</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td class="text-right">${item.quantity}</td>
                                <td class="text-right">€ ${item.unitPrice.toFixed(2)}</td>
                                <td class="text-right">${item.vatRate}%</td>
                                <td class="text-right">€ ${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="totals">
                    <div class="totals-row">Imponibile: € ${invoice.subtotal.toFixed(2)}</div>
                    <div class="totals-row">IVA: € ${invoice.vatTotal.toFixed(2)}</div>
                    <div class="totals-row total-final">TOTALE: € ${invoice.total.toFixed(2)}</div>
                </div>
                ${invoice.notes ? `<div class="section"><div class="section-title">NOTE</div>${invoice.notes}</div>` : ''}
                <div class="footer">Documento generato da RistoSync AI - ${new Date().toLocaleString()}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const sendInvoice = async (invoice: Invoice) => {
        const recipients = restaurantProfile.accountantEmails?.filter(e => e.isDefault) || [];
        if (recipients.length === 0) {
            showToast('Configura almeno un destinatario email nelle impostazioni', 'error');
            return;
        }

        const emails = recipients.map(r => r.email).join(',');
        const subject = encodeURIComponent(`Fattura ${invoice.invoiceNumber} - ${restaurantProfile.name}`);
        const body = encodeURIComponent(`
Gentile Commercialista,

In allegato la fattura n. ${invoice.invoiceNumber} del ${new Date(invoice.date).toLocaleDateString('it-IT')}.

Cliente: ${invoice.customerName}
Totale: € ${invoice.total.toFixed(2)}

Cordiali saluti,
${restaurantProfile.name}
        `);

        window.open(`mailto:${emails}?subject=${subject}&body=${body}`);

        const updatedInvoices = invoices.map(inv =>
            inv.id === invoice.id
                ? { ...inv, sentAt: Date.now(), sentTo: recipients.map(r => r.email) }
                : inv
        );
        setInvoices(updatedInvoices);
        localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
        showToast('Email aperta nel client di posta', 'success');
    };

    const addAccountantEmail = () => {
        if (!newEmail.email || !newEmail.name) {
            showToast('Inserisci email e nome', 'error');
            return;
        }

        const updatedEmails = [
            ...(restaurantProfile.accountantEmails || []),
            { ...newEmail, isDefault: (restaurantProfile.accountantEmails || []).length === 0 }
        ];

        const updatedProfile = { ...restaurantProfile, accountantEmails: updatedEmails };
        onUpdateProfile(updatedProfile);
        const currentSettings = getAppSettings();
        saveAppSettings({ ...currentSettings, restaurantProfile: updatedProfile });
        setNewEmail({ email: '', name: '', role: '' });
        showToast('Email aggiunta', 'success');
    };

    const removeAccountantEmail = (email: string) => {
        const updatedEmails = (restaurantProfile.accountantEmails || []).filter(e => e.email !== email);
        const updatedProfile = { ...restaurantProfile, accountantEmails: updatedEmails };
        onUpdateProfile(updatedProfile);
        const currentSettings = getAppSettings();
        saveAppSettings({ ...currentSettings, restaurantProfile: updatedProfile });
        showToast('Email rimossa', 'success');
    };

    const toggleDefaultEmail = (email: string) => {
        const updatedEmails = (restaurantProfile.accountantEmails || []).map(e => ({
            ...e,
            isDefault: e.email === email ? !e.isDefault : e.isDefault
        }));
        const updatedProfile = { ...restaurantProfile, accountantEmails: updatedEmails };
        onUpdateProfile(updatedProfile);
        const currentSettings = getAppSettings();
        saveAppSettings({ ...currentSettings, restaurantProfile: updatedProfile });
    };

    const filteredCustomers = customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchCustomer.toLowerCase())
    );

    const totals = calculateTotals(newInvoice.items || []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <FileText className="text-indigo-500" />
                    Gestione Fatture
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'invoices' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        Fatture
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        <Mail size={18} className="inline mr-2" />
                        Email Commercialista
                    </button>
                </div>
            </div>

            {activeTab === 'invoices' && (
                <div className="space-y-6">
                    {!isCreating ? (
                        <>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors"
                            >
                                <Plus size={20} />
                                Nuova Fattura
                            </button>

                            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-800 text-slate-400 text-sm">
                                            <th className="p-4 text-left">N. Fattura</th>
                                            <th className="p-4 text-left">Data</th>
                                            <th className="p-4 text-left">Cliente</th>
                                            <th className="p-4 text-right">Totale</th>
                                            <th className="p-4 text-center">Stato</th>
                                            <th className="p-4 text-center">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                                    Nessuna fattura creata. Clicca "Nuova Fattura" per iniziare.
                                                </td>
                                            </tr>
                                        ) : (
                                            invoices.map(inv => (
                                                <tr key={inv.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                                                    <td className="p-4 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                                                    <td className="p-4 text-slate-300">{new Date(inv.date).toLocaleDateString('it-IT')}</td>
                                                    <td className="p-4 text-white">{inv.customerName}</td>
                                                    <td className="p-4 text-right font-bold text-indigo-400">€ {inv.total.toFixed(2)}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${inv.paymentStatus === 'paid' ? 'bg-green-900/30 text-green-400' :
                                                            inv.paymentStatus === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                                                                inv.paymentStatus === 'overdue' ? 'bg-red-900/30 text-red-400' :
                                                                    'bg-slate-700 text-slate-400'
                                                            }`}>
                                                            {inv.paymentStatus === 'paid' ? 'Pagata' :
                                                                inv.paymentStatus === 'pending' ? 'In Attesa' :
                                                                    inv.paymentStatus === 'overdue' ? 'Scaduta' : 'Annullata'}
                                                        </span>
                                                        {inv.sentAt && (
                                                            <span className="ml-2 text-green-400" title={`Inviata il ${new Date(inv.sentAt).toLocaleString()}`}>
                                                                <Check size={14} className="inline" />
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => printInvoice(inv)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Stampa">
                                                                <Printer size={18} />
                                                            </button>
                                                            <button onClick={() => sendInvoice(inv)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-400" title="Invia Email">
                                                                <Send size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingInvoice(inv);
                                                                    setNewInvoice(inv);
                                                                    setIsCreating(true);
                                                                }}
                                                                className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400"
                                                                title="Modifica"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">
                                    {editingInvoice ? `Modifica Fattura ${editingInvoice.invoiceNumber}` : 'Nuova Fattura'}
                                </h3>
                                <button onClick={resetForm} className="text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-sm text-slate-400 mb-1">Cliente *</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newInvoice.customerName || ''}
                                            onChange={e => setNewInvoice({ ...newInvoice, customerName: e.target.value })}
                                            placeholder="Nome cliente"
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                        />
                                        <button
                                            onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                                            className="px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                                            title="Cerca cliente esistente"
                                        >
                                            <Search size={20} />
                                        </button>
                                    </div>

                                    {showCustomerSearch && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                                            <input
                                                type="text"
                                                value={searchCustomer}
                                                onChange={e => setSearchCustomer(e.target.value)}
                                                placeholder="Cerca per nome o email..."
                                                className="w-full bg-slate-900 border-b border-slate-700 p-3 text-white"
                                                autoFocus
                                            />
                                            {filteredCustomers.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => selectCustomer(c)}
                                                    className="p-3 hover:bg-slate-700 cursor-pointer flex items-center gap-3"
                                                >
                                                    <User size={16} className="text-slate-400" />
                                                    <div>
                                                        <div className="text-white">{c.lastName} {c.firstName}</div>
                                                        <div className="text-xs text-slate-400">{c.email}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredCustomers.length === 0 && (
                                                <div className="p-3 text-slate-500 text-center">Nessun cliente trovato</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Data Fattura</label>
                                    <input
                                        type="date"
                                        value={newInvoice.date}
                                        onChange={e => setNewInvoice({ ...newInvoice, date: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Indirizzo</label>
                                    <input
                                        type="text"
                                        value={newInvoice.customerAddress || ''}
                                        onChange={e => setNewInvoice({ ...newInvoice, customerAddress: e.target.value })}
                                        placeholder="Indirizzo cliente"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newInvoice.customerEmail || ''}
                                        onChange={e => setNewInvoice({ ...newInvoice, customerEmail: e.target.value })}
                                        placeholder="email@cliente.it"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Partita IVA</label>
                                    <input
                                        type="text"
                                        value={newInvoice.customerVat || ''}
                                        onChange={e => setNewInvoice({ ...newInvoice, customerVat: e.target.value })}
                                        placeholder="IT12345678901"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Codice Fiscale</label>
                                    <input
                                        type="text"
                                        value={newInvoice.customerFiscalCode || ''}
                                        onChange={e => setNewInvoice({ ...newInvoice, customerFiscalCode: e.target.value })}
                                        placeholder="RSSMRA80A01H501U"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">PEC (Fattura Elettronica)</label>
                                    <input
                                        type="email"
                                        value={newInvoice.customerPec || ''}
                                        onChange={e => setNewInvoice({ ...newInvoice, customerPec: e.target.value })}
                                        placeholder="pec@cliente.it"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Codice SDI</label>
                                    <input
                                        type="text"
                                        value={newInvoice.customerSdi || ''}
                                        onChange={e => setNewInvoice({ ...newInvoice, customerSdi: e.target.value })}
                                        placeholder="0000000"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-lg font-bold text-white">Voci Fattura</label>
                                    <button
                                        onClick={addItem}
                                        className="flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
                                    >
                                        <Plus size={16} /> Aggiungi Voce
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {newInvoice.items?.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-800 p-3 rounded-lg">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={e => updateItem(idx, 'description', e.target.value)}
                                                placeholder="Descrizione"
                                                className="col-span-4 bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                            />
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-white text-center"
                                                min={1}
                                            />
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                                                placeholder="€"
                                                className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-white text-right"
                                                step="0.01"
                                            />
                                            <select
                                                value={item.vatRate}
                                                onChange={e => updateItem(idx, 'vatRate', Number(e.target.value))}
                                                className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                            >
                                                {VAT_RATES.map(rate => (
                                                    <option key={rate} value={rate}>{rate}%</option>
                                                ))}
                                            </select>
                                            <div className="col-span-1 text-right text-indigo-400 font-bold">
                                                € {item.total.toFixed(2)}
                                            </div>
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className="col-span-1 text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-800 p-4 rounded-lg text-right space-y-2">
                                <div className="text-slate-400">Imponibile: <span className="text-white font-bold">€ {totals.subtotal.toFixed(2)}</span></div>
                                <div className="text-slate-400">IVA: <span className="text-white font-bold">€ {totals.vatTotal.toFixed(2)}</span></div>
                                <div className="text-xl text-white">Totale: <span className="text-indigo-400 font-black">€ {totals.total.toFixed(2)}</span></div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Note</label>
                                <textarea
                                    value={newInvoice.notes || ''}
                                    onChange={e => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                                    placeholder="Note aggiuntive..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={resetForm} className="px-6 py-3 text-slate-400 hover:text-white">
                                    Annulla
                                </button>
                                <button
                                    onClick={saveInvoice}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                                >
                                    <Save size={20} />
                                    {editingInvoice ? 'Aggiorna Fattura' : 'Salva Fattura'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Mail className="text-indigo-500" />
                        <h3 className="text-xl font-bold text-white">Email Commercialista / Studio Fiscale</h3>
                    </div>

                    <p className="text-slate-400">
                        Configura gli indirizzi email a cui inviare automaticamente le fatture per la contabilità elettronica.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="email"
                            value={newEmail.email}
                            onChange={e => setNewEmail({ ...newEmail, email: e.target.value })}
                            placeholder="email@commercialista.it"
                            className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                        />
                        <input
                            type="text"
                            value={newEmail.name}
                            onChange={e => setNewEmail({ ...newEmail, name: e.target.value })}
                            placeholder="Nome / Studio"
                            className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                        />
                        <input
                            type="text"
                            value={newEmail.role}
                            onChange={e => setNewEmail({ ...newEmail, role: e.target.value })}
                            placeholder="Ruolo (opzionale)"
                            className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                        />
                        <button
                            onClick={addAccountantEmail}
                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                        >
                            <Plus size={20} /> Aggiungi
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(restaurantProfile.accountantEmails || []).length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <AlertCircle size={40} className="mx-auto mb-2 opacity-50" />
                                Nessun indirizzo email configurato
                            </div>
                        ) : (
                            restaurantProfile.accountantEmails?.map(emailConfig => (
                                <div
                                    key={emailConfig.email}
                                    className="flex items-center justify-between p-4 bg-slate-800 rounded-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <Mail className="text-slate-400" />
                                        <div>
                                            <div className="text-white font-bold">{emailConfig.name}</div>
                                            <div className="text-sm text-slate-400">{emailConfig.email}</div>
                                            {emailConfig.role && <div className="text-xs text-slate-500">{emailConfig.role}</div>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleDefaultEmail(emailConfig.email)}
                                            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${emailConfig.isDefault
                                                ? 'bg-green-600 text-white'
                                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                }`}
                                        >
                                            {emailConfig.isDefault ? '✓ Default' : 'Imposta Default'}
                                        </button>
                                        <button
                                            onClick={() => removeAccountantEmail(emailConfig.email)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceManager;
