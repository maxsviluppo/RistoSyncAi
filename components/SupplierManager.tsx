import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, FileText, X, Save } from 'lucide-react';
import { Supplier, getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '../services/storageService';

interface SupplierManagerProps {
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({ showToast }) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier>>({});

    useEffect(() => {
        loadSuppliers();
        window.addEventListener('local-suppliers-update', loadSuppliers);
        return () => window.removeEventListener('local-suppliers-update', loadSuppliers);
    }, []);

    const loadSuppliers = () => {
        setSuppliers(getSuppliers());
    };

    const handleSave = () => {
        if (!editingSupplier.name) {
            showToast('Inserisci almeno il nome del fornitore', 'error');
            return;
        }

        if (editingSupplier.id) {
            updateSupplier(editingSupplier.id, editingSupplier);
            showToast('Fornitore aggiornato', 'success');
        } else {
            addSupplier(editingSupplier as any);
            showToast('Fornitore aggiunto', 'success');
        }
        setShowModal(false);
        setEditingSupplier({});
        loadSuppliers();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo fornitore?')) {
            deleteSupplier(id);
            showToast('Fornitore eliminato', 'success');
            loadSuppliers();
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20 animate-fade-in text-white">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Truck className="text-orange-500" size={32} />
                        Anagrafica Fornitori
                    </h2>
                    <p className="text-slate-400">Gestisci i tuoi fornitori e contatti</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Cerca fornitore..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-orange-500"
                        />
                    </div>
                    <button
                        onClick={() => { setEditingSupplier({}); setShowModal(true); }}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20"
                    >
                        <Plus size={20} /> Nuovo Fornitore
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(supplier => (
                    <div key={supplier.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white">{supplier.name}</h3>
                                {supplier.category && <span className="text-xs font-bold text-orange-400 uppercase tracking-wider bg-orange-950/30 px-2 py-1 rounded mt-1 inline-block">{supplier.category}</span>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingSupplier(supplier); setShowModal(true); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(supplier.id)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 relative z-10 text-sm">
                            {supplier.vatNumber && (
                                <div className="flex items-center gap-3 text-slate-400">
                                    <FileText size={16} /> <span className="font-mono">{supplier.vatNumber}</span>
                                </div>
                            )}
                            {supplier.phone && (
                                <div className="flex items-center gap-3 text-slate-400">
                                    <Phone size={16} /> <span>{supplier.phone}</span>
                                </div>
                            )}
                            {supplier.email && (
                                <div className="flex items-center gap-3 text-slate-400">
                                    <Mail size={16} /> <span className="truncate">{supplier.email}</span>
                                </div>
                            )}
                            {supplier.address && (
                                <div className="flex items-center gap-3 text-slate-400">
                                    <MapPin size={16} /> <span className="truncate">{supplier.address}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Card */}
                        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
                            <span>Pagamento: <strong className="text-slate-300">{supplier.paymentTerms || '-'}</strong></span>
                        </div>
                    </div>
                ))}

                {filteredSuppliers.length === 0 && (
                    <div className="col-span-full text-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                        <Truck size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nessun fornitore trovato.</p>
                        <button onClick={() => setShowModal(true)} className="text-orange-500 font-bold mt-2 hover:underline">Aggiungine uno ora</button>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <Truck className="text-orange-500" />
                                {editingSupplier.id ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Ragione Sociale <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editingSupplier.name || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none font-bold text-lg"
                                        placeholder="Es. Ortofrutta Spa"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Categoria Merceologica</label>
                                    <select
                                        value={editingSupplier.category || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, category: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none appearance-none"
                                    >
                                        <option value="">Seleziona...</option>
                                        <option value="Food">Food (Alimentari)</option>
                                        <option value="Beverage">Beverage (Bibite/Alcolici)</option>
                                        <option value="Packaging">Packaging & Consumabili</option>
                                        <option value="Services">Servizi / Utenze</option>
                                        <option value="Equipment">Attrezzature</option>
                                        <option value="Other">Altro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">P.IVA / Codice Fiscale</label>
                                    <input
                                        type="text"
                                        value={editingSupplier.vatNumber || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, vatNumber: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none font-mono"
                                        placeholder="IT00000000000"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Email Ordini</label>
                                    <input
                                        type="email"
                                        value={editingSupplier.email || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                                        placeholder="ordini@fornitore.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Telefono / WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={editingSupplier.phone || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                                        placeholder="+39 333 ..."
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Indirizzo Sede</label>
                                    <input
                                        type="text"
                                        value={editingSupplier.address || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                                        placeholder="Via Roma 1, Milano"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Termini di Pagamento</label>
                                    <select
                                        value={editingSupplier.paymentTerms || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, paymentTerms: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none appearance-none"
                                    >
                                        <option value="">Seleziona...</option>
                                        <option value="Contanti">Contanti alla consegna</option>
                                        <option value="Bonifico Anticipato">Bonifico Anticipato</option>
                                        <option value="Vista Fattura">Bonifico Vista Fattura</option>
                                        <option value="30gg DF">30gg Data Fattura</option>
                                        <option value="60gg DF">60gg Data Fattura</option>
                                        <option value="90gg DF">90gg Data Fattura</option>
                                        <option value="RID">RID / SDD Bancario</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Note Interne</label>
                                    <textarea
                                        value={editingSupplier.notes || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, notes: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none h-24 resize-none"
                                        placeholder="Giorni di consegna, contatti referente..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-slate-900 z-10">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20 transform active:scale-95 transition-all"
                            >
                                <Save size={20} /> Salva Fornitore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
