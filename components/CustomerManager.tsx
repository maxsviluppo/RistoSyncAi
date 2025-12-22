import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Edit2, Trash2, Plus, Search, X, Check, Calendar, Euro, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { Customer, Reservation, Order } from '../types';

interface CustomerManagerProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ showToast, showConfirm }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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
        });
        setEditingCustomer(null);
        setIsEditing(false);
    };

    const importCustomersFromData = () => {
        // Carica prenotazioni e ordini
        const reservationsData = localStorage.getItem('reservations');
        const ordersData = localStorage.getItem('ristosync_orders');

        const reservations: Reservation[] = reservationsData ? JSON.parse(reservationsData) : [];
        const orders: Order[] = ordersData ? JSON.parse(ordersData) : [];

        const existingCustomers = localStorage.getItem('customers');
        const currentCustomers: Customer[] = existingCustomers ? JSON.parse(existingCustomers) : [];

        // Mappa per evitare duplicati (usa il telefono come chiave univoca)
        const customerMap = new Map<string, Customer>();

        // Aggiungi i clienti esistenti alla mappa
        currentCustomers.forEach(c => {
            customerMap.set(c.phone, c);
        });

        let importedCount = 0;
        let updatedCount = 0;

        // Importa da PRENOTAZIONI
        reservations.forEach(reservation => {
            if (reservation.customerPhone) {
                const phone = reservation.customerPhone;
                const existing = customerMap.get(phone);

                if (existing) {
                    // Aggiorna visite e ultima visita se necessario
                    if (reservation.status === 'Completato') {
                        existing.totalVisits = (existing.totalVisits || 0) + 1;
                        existing.lastVisit = reservation.completedAt || reservation.updatedAt;
                        updatedCount++;
                    }
                } else {
                    // Crea nuovo cliente dalle prenotazioni
                    const nameParts = reservation.customerName.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';

                    const newCustomer: Customer = {
                        id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        firstName: firstName,
                        lastName: lastName,
                        phone: phone,
                        email: '', // Le prenotazioni potrebbero non avere email
                        createdAt: reservation.createdAt,
                        totalVisits: reservation.status === 'Completato' ? 1 : 0,
                        totalSpent: 0,
                        lastVisit: reservation.status === 'Completato' ? reservation.completedAt : undefined,
                        notes: `Importato da prenotazione - ${reservation.occasion || ''}`.trim(),
                    };

                    customerMap.set(phone, newCustomer);
                    importedCount++;
                }
            }
        });

        // Importa da ORDINI DELIVERY
        orders.forEach(order => {
            // Solo ordini con source delivery (non tavoli)
            if (order.source && order.source !== 'table' && order.customerPhone) {
                const phone = order.customerPhone;
                const existing = customerMap.get(phone);

                // Calcola il totale dell'ordine
                const orderTotal = order.items.reduce((sum, item) =>
                    sum + (item.menuItem.price * item.quantity), 0
                );

                if (existing) {
                    // Aggiorna statistiche
                    if (order.status === 'Servito') {
                        existing.totalVisits = (existing.totalVisits || 0) + 1;
                        existing.totalSpent = (existing.totalSpent || 0) + orderTotal;
                        existing.lastVisit = order.timestamp;

                        // Aggiorna indirizzo se non presente
                        if (!existing.address && order.customerAddress) {
                            existing.address = order.customerAddress;
                        }
                        updatedCount++;
                    }
                } else {
                    // Crea nuovo cliente da delivery
                    const nameParts = (order.customerName || 'Cliente').split(' ');
                    const firstName = nameParts[0] || 'Cliente';
                    const lastName = nameParts.slice(1).join(' ') || 'Delivery';

                    const newCustomer: Customer = {
                        id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        firstName: firstName,
                        lastName: lastName,
                        phone: phone,
                        address: order.customerAddress || '',
                        createdAt: order.createdAt,
                        totalVisits: order.status === 'Servito' ? 1 : 0,
                        totalSpent: order.status === 'Servito' ? orderTotal : 0,
                        lastVisit: order.status === 'Servito' ? order.timestamp : undefined,
                        notes: `Importato da delivery (${order.source})`,
                    };

                    customerMap.set(phone, newCustomer);
                    importedCount++;
                }
            }
        });

        // Salva tutti i clienti
        const allCustomers = Array.from(customerMap.values());
        localStorage.setItem('customers', JSON.stringify(allCustomers));
        loadCustomers();

        // Mostra risultato
        if (importedCount > 0 || updatedCount > 0) {
            showToast(
                `✅ Importazione completata! ${importedCount} nuovi clienti, ${updatedCount} aggiornati`,
                'success'
            );
        } else {
            showToast('ℹ️ Nessun nuovo cliente da importare', 'info');
        }
    };

    const filteredCustomers = customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white">Gestione Clienti</h2>
                    <p className="text-slate-400 text-sm">Gestisci i tuoi clienti abituali</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={importCustomersFromData}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                        title="Importa clienti da prenotazioni e delivery"
                    >
                        <Download size={20} />
                        Importa Dati
                    </button>
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
                {customers.length === 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <RefreshCw size={14} />
                        <span>Nessun cliente trovato. Usa <strong className="text-cyan-400">"Importa Dati"</strong> per importare automaticamente da prenotazioni e delivery.</span>
                    </div>
                )}
                {customers.length > 0 && (
                    <div className="mt-2 text-xs text-slate-400">
                        <strong className="text-white">{customers.length}</strong> clienti registrati
                    </div>
                )}
            </div>

            {/* Customers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map(customer => (
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
