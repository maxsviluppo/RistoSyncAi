import React, { useState, useEffect } from 'react';
import { Save, X, Key, FileText, Percent, Hash } from 'lucide-react';
import { DeliveryPlatform } from '../types';

interface PlatformEditModalProps {
    platform: DeliveryPlatform;
    isNew?: boolean;
    onSave: (updatedPlatform: DeliveryPlatform) => void;
    onClose: () => void;
}

export default function PlatformEditModal({ platform, isNew = false, onSave, onClose }: PlatformEditModalProps) {
    const [formData, setFormData] = useState<DeliveryPlatform>(platform);

    useEffect(() => {
        setFormData(platform);
    }, [platform]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                 {/* Header */}
                 <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white ${formData.bgClass || 'bg-slate-700'} transition-colors`}>
                             {formData.shortCode || '?'}
                         </div>
                         <div>
                             <h2 className="text-xl font-black text-white">{isNew ? 'Nuova Piattaforma' : 'Modifica Piattaforma'}</h2>
                             <p className="text-slate-400 text-sm">{isNew ? 'Configura i dettagli della nuova integrazione' : platform.name}</p>
                         </div>
                     </div>
                     <button type="button" onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                         <X size={24} />
                     </button>
                 </div>

                 {/* Form */}
                 <div className="p-6 overflow-y-auto custom-scrollbar">
                     <form id="platform-form" onSubmit={handleSubmit} className="space-y-6">
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                 <label className="text-slate-400 text-xs font-bold uppercase">Nome Piattaforma</label>
                                 <input 
                                     type="text" 
                                     value={formData.name} 
                                     onChange={e => setFormData({...formData, name: e.target.value})}
                                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                     required
                                 />
                             </div>
                             <div className="space-y-2">
                                 <label className="text-slate-400 text-xs font-bold uppercase">Codice Breve (Sigla)</label>
                                 <input 
                                    type="text" 
                                    value={formData.shortCode} 
                                    onChange={e => setFormData({...formData, shortCode: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-mono transition-colors"
                                    required
                                    maxLength={3}
                                    placeholder="Es. JE"
                                 />
                             </div>
                         </div>

                         {/* Dettagli Contratto */}
                         <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                             <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                                 <FileText className="text-blue-500" size={18} /> Dettagli Contratto
                             </h3>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                     <label className="text-xs text-slate-500">Merchant ID</label>
                                     <div className="relative">
                                         <Hash size={14} className="absolute left-3 top-3.5 text-slate-600" />
                                         <input 
                                             type="text"
                                             value={formData.merchantId || ''}
                                             onChange={e => setFormData({...formData, merchantId: e.target.value})}
                                             className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                                             placeholder="Es. 123456"
                                         />
                                     </div>
                                 </div>
                                 <div className="space-y-1">
                                     <label className="text-xs text-slate-500">Numero Contratto</label>
                                       <div className="relative">
                                         <FileText size={14} className="absolute left-3 top-3.5 text-slate-600" />
                                         <input 
                                             type="text"
                                             value={formData.contractNumber || ''}
                                             onChange={e => setFormData({...formData, contractNumber: e.target.value})}
                                             className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                                             placeholder="Es. CTR-2024-X"
                                         />
                                     </div>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                     <label className="text-xs text-slate-500">Commissione (%)</label>
                                      <div className="relative">
                                         <Percent size={14} className="absolute left-3 top-3.5 text-slate-600" />
                                         <input 
                                             type="number"
                                             value={formData.commissionPercent || ''}
                                             onChange={e => setFormData({...formData, commissionPercent: parseFloat(e.target.value)})}
                                             className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                                             placeholder="Es. 15.5"
                                             step="0.1"
                                         />
                                     </div>
                                 </div>
                                 <div className="space-y-1">
                                     <label className="text-xs text-slate-500">API Key (Integrazioni)</label>
                                     <div className="relative">
                                         <Key size={14} className="absolute left-3 top-3.5 text-slate-600" />
                                         <input 
                                             type="password"
                                             value={formData.apiKey || ''}
                                             onChange={e => setFormData({...formData, apiKey: e.target.value})}
                                             className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                                             placeholder="••••••••••••••••"
                                         />
                                     </div>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="space-y-2">
                             <label className="text-slate-400 text-xs font-bold uppercase">Note Interne</label>
                             <textarea 
                                 value={formData.notes || ''}
                                 onChange={e => setFormData({...formData, notes: e.target.value})}
                                 className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none min-h-[100px] transition-colors"
                                 placeholder="Note su contatti, account manager, scadenze..."
                             />
                         </div>

                     </form>
                 </div>

                 {/* Footer Actions */}
                 <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                     <button 
                         type="button"
                         onClick={onClose}
                         className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                     >
                         Annulla
                     </button>
                     <button 
                         type="submit"
                         form="platform-form"
                         className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                     >
                         <Save size={20} /> {isNew ? 'Crea Piattaforma' : 'Salva Modifiche'}
                     </button>
                 </div>
             </div>
        </div>
    );
}
