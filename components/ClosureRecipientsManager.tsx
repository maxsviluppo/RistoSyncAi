import React, { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings } from '../services/storageService';
import { Plus, Trash2, Save, X, Users } from 'lucide-react';

interface ClosureRecipient {
    name: string;
    phone: string;
    role?: string;
}

interface ClosureRecipientsManagerProps {
    onClose: () => void;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ClosureRecipientsManager: React.FC<ClosureRecipientsManagerProps> = ({ onClose, showToast }) => {
    const [recipients, setRecipients] = useState<ClosureRecipient[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newRecipient, setNewRecipient] = useState<ClosureRecipient>({ name: '', phone: '', role: 'Titolare' });

    useEffect(() => {
        const settings = getAppSettings();
        setRecipients(settings.restaurantProfile?.closureReportRecipients || []);
    }, []);

    const handleSave = () => {
        if (!newRecipient.name || !newRecipient.phone) {
            showToast('Compila nome e telefono', 'error');
            return;
        }

        // Validate phone format (basic)
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(newRecipient.phone.replace(/\s/g, ''))) {
            showToast('Numero di telefono non valido (es. +393471234567)', 'error');
            return;
        }

        setRecipients([...recipients, newRecipient]);
        setNewRecipient({ name: '', phone: '', role: 'Titolare' });
        setIsAdding(false);
        showToast('Destinatario aggiunto', 'success');
    };

    const handleDelete = (index: number) => {
        setRecipients(recipients.filter((_, i) => i !== index));
        showToast('Destinatario rimosso', 'success');
    };

    const handleSaveAll = () => {
        const settings = getAppSettings();
        settings.restaurantProfile = settings.restaurantProfile || {};
        settings.restaurantProfile.closureReportRecipients = recipients;
        saveAppSettings(settings);
        showToast('Destinatari salvati correttamente', 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            <Users className="text-purple-500" />
                            Destinatari Report Chiusura
                        </h2>
                        <p className="text-slate-400 text-sm">Gestisci i numeri WhatsApp per l'invio automatico</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Add New Recipient */}
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold">Elenco Destinatari ({recipients.length})</h3>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                        >
                            {isAdding ? <X size={18} /> : <Plus size={18} />}
                            {isAdding ? 'Annulla' : 'Aggiungi Destinatario'}
                        </button>
                    </div>

                    {isAdding && (
                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-700 animate-slide-down">
                            <h4 className="text-white font-bold mb-4">Nuovo Destinatario</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Nome</label>
                                    <input
                                        type="text"
                                        value={newRecipient.name}
                                        onChange={e => setNewRecipient({ ...newRecipient, name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                        placeholder="Es. Mario Rossi"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Telefono</label>
                                    <input
                                        type="tel"
                                        value={newRecipient.phone}
                                        onChange={e => setNewRecipient({ ...newRecipient, phone: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 font-mono"
                                        placeholder="+393471234567"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Formato internazionale</p>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs font-bold mb-1 uppercase">Ruolo</label>
                                    <select
                                        value={newRecipient.role}
                                        onChange={e => setNewRecipient({ ...newRecipient, role: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 appearance-none"
                                    >
                                        <option value="Titolare">Titolare</option>
                                        <option value="Socio">Socio</option>
                                        <option value="Commercialista">Commercialista</option>
                                        <option value="Responsabile">Responsabile</option>
                                        <option value="Altro">Altro</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/20"
                                >
                                    <Save size={20} /> Aggiungi
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Recipients List */}
                    <div className="space-y-3">
                        {recipients.length === 0 ? (
                            <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center">
                                <Users className="mx-auto text-slate-600 mb-3" size={48} />
                                <p className="text-slate-500 italic">Nessun destinatario configurato</p>
                                <p className="text-slate-600 text-sm mt-1">Aggiungi i numeri WhatsApp dei titolari</p>
                            </div>
                        ) : (
                            recipients.map((recipient, index) => (
                                <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center hover:border-slate-700 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-500/20 p-3 rounded-lg">
                                            <Users className="text-purple-400" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{recipient.name}</p>
                                            <p className="text-slate-400 text-sm font-mono">{recipient.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold">
                                            {recipient.role}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        Annulla
                    </button>
                    <button
                        onClick={handleSaveAll}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/20 flex items-center gap-2 transform active:scale-95 transition-all"
                    >
                        <Save size={20} /> Salva Destinatari
                    </button>
                </div>
            </div>
        </div>
    );
};
