import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, Mail, MapPin, Edit2, Trash2, Plus, Search, X, Check, Calendar, Euro, TrendingUp, Download, Upload, LayoutGrid, List, MessageCircle, Send } from 'lucide-react';
import { Customer } from '../types';

interface CustomerManagerProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
    onOpenWhatsApp?: () => void;
    onSendWhatsApp?: (customerId: string) => void;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ showToast, showConfirm, onOpenWhatsApp, onSendWhatsApp }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const importInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        city: '',
        address: '',
        notes: '',
        allergies: [] as string[],
        vip: false,
        gender: '' as 'male' | 'female' | 'other' | '',
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = () => {
        const stored = localStorage.getItem('customers');
        if (stored) {
            setCustomers(JSON.parse(stored));
        }
    };

    const exportCustomers = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customers, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `clienti_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast('✅ Lista clienti esportata!', 'success');
    };

    const importCustomers = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target?.result as string);
                    if (Array.isArray(data)) {
                        localStorage.setItem('customers', JSON.stringify(data));
                        loadCustomers();
                        showToast(`✅ Importati ${data.length} clienti!`, 'success');
                    } else {
                        showToast('⚠️ Formato file non valido', 'error');
                    }
                } catch (err) {
                    showToast('⚠️ Errore nel file JSON', 'error');
                }
            };
            reader.readAsText(file);
        }
        if (importInputRef.current) importInputRef.current.value = '';
    };

    const saveCustomer = () => {
        if (!formData.firstName || !formData.lastName || !formData.phone) {
            showToast('⚠️ Compila i campi obbligatori (Nome, Cognome, Telefono)', 'error');
            return;
        }

        const stored = localStorage.getItem('customers');
        const all: Customer[] = stored ? JSON.parse(stored) : [];

        if (editingCustomer) {
            // Update existing
            const index = all.findIndex(c => c.id === editingCustomer.id);
            if (index >= 0) {
                all[index] = {
                    ...editingCustomer,
                    ...formData,
                };
            }
            showToast('✅ Cliente aggiornato!', 'success');
        } else {
            // Create new
            const newCustomer: Customer = {
                id: `customer_${Date.now()}`,
                ...formData,
                createdAt: Date.now(),
                totalVisits: 0,
                totalSpent: 0,
            };
            all.push(newCustomer);
            showToast('✅ Cliente aggiunto!', 'success');
        }

        localStorage.setItem('customers', JSON.stringify(all));
        loadCustomers();
        resetForm();
    };

    const deleteCustomer = async (customer: Customer) => {
        const confirmed = await showConfirm(
            'Elimina Cliente',
            `Sei sicuro di voler eliminare ${customer.firstName} ${customer.lastName}? Questa azione non può essere annullata.`
        );

        if (confirmed) {
            const stored = localStorage.getItem('customers');
            const all: Customer[] = stored ? JSON.parse(stored) : [];
            const filtered = all.filter(c => c.id !== customer.id);
            localStorage.setItem('customers', JSON.stringify(filtered));
            loadCustomers();
            showToast('Cliente eliminato', 'info');
        }
    };

    const editCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email || '',
            city: customer.city || '',
            address: customer.address || '',
            notes: customer.notes || '',
            allergies: customer.allergies || [],
            vip: customer.vip || false,
            gender: customer.gender || '',
        });
        setIsEditing(true);
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            city: '',
            address: '',
            notes: '',
            allergies: [],
            vip: false,
            gender: '',
        });
        setEditingCustomer(null);
        setIsEditing(false);
    };

    const filteredCustomers = customers
        .filter(c =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery) ||
            (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white">Gestione Clienti</h2>
                    <p className="text-slate-400 text-sm">Gestisci i tuoi clienti abituali</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            title="Vista Griglia"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            title="Vista Lista"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    {/* Import/Export */}
                    <button
                        onClick={exportCustomers}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
                        title="Esporta Clienti"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={() => importInputRef.current?.click()}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
                        title="Importa Clienti"
                    >
                        <Upload size={18} />
                    </button>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json"
                        onChange={importCustomers}
                        className="hidden"
                    />

                    {onOpenWhatsApp && (
                        <button
                            onClick={onOpenWhatsApp}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                            title="Apri Campagna WhatsApp"
                        >
                            <MessageCircle size={20} />
                            Campagna WhatsApp
                        </button>
                    )}

                    <button
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                    >
                        <Plus size={20} />
                        Nuovo Cliente
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca per nome, telefono o email..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-purple-500"
                />
            </div>

            {/* Customers List */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                {filteredCustomers.map(customer => (
                    viewMode === 'grid' ? (
                        <div
                            key={customer.id}
                            className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-purple-500 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${customer.vip ? 'bg-gradient-to-br from-yellow-600 to-orange-600' : 'bg-purple-600'}`}>
                                        <User size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {customer.firstName} {customer.lastName}
                                            {customer.vip && (
                                                <span className="text-xs bg-yellow-900/30 border border-yellow-500 text-yellow-400 px-2 py-0.5 rounded-full">VIP</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400">{customer.phone}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                {customer.email && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Mail size={14} />
                                        {customer.email}
                                    </div>
                                )}
                                {customer.city && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <MapPin size={14} />
                                        {customer.city}
                                    </div>
                                )}
                                <div className="flex items-center gap-4 pt-2 border-t border-slate-700">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Calendar size={14} />
                                        <span className="text-xs">{customer.totalVisits} visite</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Euro size={14} />
                                        <span className="text-xs">€{customer.totalSpent.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                {onSendWhatsApp && customer.phone && (
                                    <button
                                        onClick={() => onSendWhatsApp(customer.id)}
                                        className="w-10 h-10 bg-green-600 hover:bg-green-500 rounded-lg flex items-center justify-center transition-colors"
                                        title="Invia WhatsApp"
                                    >
                                        <MessageCircle size={16} className="text-white" />
                                    </button>
                                )}
                                <button
                                    onClick={() => editCustomer(customer)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Edit2 size={16} />
                                    Modifica
                                </button>
                                <button
                                    onClick={() => deleteCustomer(customer)}
                                    className="w-10 h-10 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center transition-colors"
                                >
                                    <Trash2 size={16} className="text-white" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            key={customer.id}
                            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-purple-500 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${customer.vip ? 'bg-gradient-to-br from-yellow-600 to-orange-600' : 'bg-purple-600'}`}>
                                    <User size={24} className="text-white" />
                                </div>
                                <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {customer.firstName} {customer.lastName}
                                            {customer.vip && (
                                                <span className="text-xs bg-yellow-900/30 border border-yellow-500 text-yellow-400 px-2 py-0.5 rounded-full">VIP</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400">{customer.phone}</div>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {customer.email || '-'}
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {customer.city || '-'}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span>{customer.totalVisits} visite</span>
                                        <span>€{customer.totalSpent.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                                {onSendWhatsApp && customer.phone && (
                                    <button
                                        onClick={() => onSendWhatsApp(customer.id)}
                                        className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                        title="Invia WhatsApp"
                                    >
                                        <MessageCircle size={16} />
                                        WhatsApp
                                    </button>
                                )}
                                <button
                                    onClick={() => editCustomer(customer)}
                                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Edit2 size={16} />
                                    Modifica
                                </button>
                                <button
                                    onClick={() => deleteCustomer(customer)}
                                    className="w-10 h-10 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center transition-colors"
                                >
                                    <Trash2 size={16} className="text-white" />
                                </button>
                            </div>
                        </div>
                    )
                ))}
            </div>

            {filteredCustomers.length === 0 && (
                <div className="text-center py-12">
                    <User size={48} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">
                        {searchQuery ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
                    </p>
                </div>
            )}

            {/* Edit/Create Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-2xl border border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-xl font-black text-white">
                                {editingCustomer ? 'Modifica Cliente' : 'Nuovo Cliente'}
                            </h3>
                            <button
                                onClick={resetForm}
                                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome *</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                                            setFormData({ ...formData, firstName: capitalized });
                                        }}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cognome *</label>
                                        <input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                                                setFormData({ ...formData, lastName: capitalized });
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Sesso</label>
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 appearance-none"
                                        >
                                            <option value="">Seleziona...</option>
                                            <option value="male">Uomo</option>
                                            <option value="female">Donna</option>
                                            <option value="other">Altro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Telefono *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Città</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                                            setFormData({ ...formData, city: capitalized });
                                        }}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Indirizzo</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Note</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Note particolari sul cliente..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 resize-none h-24"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <TrendingUp size={20} className="text-yellow-400" />
                                    <div>
                                        <div className="font-bold text-white text-sm">Cliente VIP</div>
                                        <div className="text-xs text-slate-400">Trattamento prioritario</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFormData({ ...formData, vip: !formData.vip })}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.vip ? 'bg-yellow-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.vip ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={resetForm}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={saveCustomer}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Check size={20} />
                                {editingCustomer ? 'Aggiorna' : 'Salva'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManager;
