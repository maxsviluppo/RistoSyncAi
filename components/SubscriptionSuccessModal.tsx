import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, Crown, Zap, Trophy, ChefHat, Pizza, Wine, Bike } from 'lucide-react';

interface SubscriptionSuccessModalProps {
    onClose: () => void;
    onAcknowledge: (selectedDepartment?: string) => void;
    planType: string; // 'Basic' or 'Pro'
    endDate: string;
    price: string;
}

const SubscriptionSuccessModal: React.FC<SubscriptionSuccessModalProps> = ({
    onClose,
    onAcknowledge,
    planType,
    endDate,
    price
}) => {
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const isBasicPlan = planType === 'Basic';

    const canProceed = !isBasicPlan || selectedDepartment !== null;

    const handleAcknowledge = () => {
        if (canProceed) {
            onAcknowledge(selectedDepartment || undefined);
        }
    };

    const departments = [
        { id: 'kitchen', label: 'Cucina', icon: ChefHat, color: 'from-green-600 to-emerald-600' },
        { id: 'pizzeria', label: 'Pizzeria', icon: Pizza, color: 'from-yellow-600 to-orange-600' },
        { id: 'pub', label: 'Pub', icon: Wine, color: 'from-purple-600 to-pink-600' },
        { id: 'delivery', label: 'Delivery', icon: Bike, color: 'from-blue-600 to-cyan-600' }
    ];

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-orange-500/30 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* HEADER */}
                <div className={`relative bg-gradient-to-br ${planType === 'Pro' ? 'from-purple-600 to-indigo-600' : 'from-orange-600 to-red-600'} p-8 rounded-t-3xl text-center`}>
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                            title="Chiudi"
                        >
                            <X size={20} className="text-white" />
                        </button>
                    </div>

                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                        {planType === 'Pro' ? (
                            <Crown size={40} className="text-white" />
                        ) : (
                            <Zap size={40} className="text-white" />
                        )}
                    </div>

                    <h1 className="text-3xl font-black text-white mb-2">
                        🎉 Congratulazioni!
                    </h1>
                    <p className="text-white/90 text-lg font-bold">
                        Hai attivato il Piano {planType}
                    </p>
                </div>

                {/* CONTENT */}
                <div className="p-8 space-y-6">
                    {/* SUBSCRIPTION INFO */}
                    <div className={`bg-gradient-to-br ${planType === 'Pro' ? 'from-purple-600/10 to-indigo-600/10 border-purple-500/30' : 'from-orange-600/10 to-red-600/10 border-orange-500/30'} border rounded-2xl p-6`}>
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${planType === 'Pro' ? 'from-purple-600 to-indigo-600' : 'from-orange-600 to-red-600'} rounded-xl flex items-center justify-center shrink-0`}>
                                <Trophy size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-black text-lg mb-3">
                                    Dettagli Abbonamento
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Piano:</span>
                                        <span className="text-white font-bold">{planType}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Prezzo:</span>
                                        <span className="text-white font-bold">€{price}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Valido fino al:</span>
                                        <span className="text-white font-bold">{formatDate(endDate)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PLAN FEATURES */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                            <Sparkles size={18} className={planType === 'Pro' ? 'text-purple-500' : 'text-orange-500'} />
                            {planType === 'Pro' ? 'Funzionalità Premium Sbloccate' : 'Cosa Include il Piano Basic'}
                        </h3>
                        <ul className="space-y-3 text-sm text-slate-300">
                            {planType === 'Pro' ? (
                                <>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Tutti i Reparti</strong> - Accesso illimitato a Cucina, Pizzeria, Pub e Delivery</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Gestione Completa</strong> - Ordini, prenotazioni e clienti senza limiti</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Marketing WhatsApp</strong> - Campagne illimitate e automazioni</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Analisi AI Avanzate</strong> - Insights e suggerimenti personalizzati</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Supporto Prioritario</strong> - Assistenza dedicata 7/7</span>
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Un Reparto a Scelta</strong> - Scegli tra Cucina, Pizzeria, Pub o Delivery</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Gestione Ordini</strong> - Sistema completo per il reparto selezionato</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Menu Digitale</strong> - QR code e menu online personalizzato</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <span><strong className="text-white">Statistiche Base</strong> - Monitora le performance del tuo reparto</span>
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* DEPARTMENT SELECTOR FOR BASIC PLAN */}
                    {isBasicPlan && (
                        <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-6">
                            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                                <Zap size={18} className="text-blue-400" />
                                Seleziona il Tuo Reparto
                            </h3>
                            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                                Il Piano Basic include <strong className="text-white">un solo reparto</strong>. Scegli quello più importante per la tua attività. Potrai sempre passare al Piano Pro per sbloccare tutti i reparti.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                {departments.map((dept) => {
                                    const Icon = dept.icon;
                                    const isSelected = selectedDepartment === dept.id;

                                    return (
                                        <button
                                            key={dept.id}
                                            onClick={() => setSelectedDepartment(dept.id)}
                                            className={`relative p-4 rounded-xl border-2 transition-all ${isSelected
                                                    ? `bg-gradient-to-br ${dept.color} border-white shadow-lg scale-105`
                                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                    <CheckCircle size={16} className="text-white" />
                                                </div>
                                            )}
                                            <Icon size={32} className={isSelected ? 'text-white mx-auto mb-2' : 'text-slate-400 mx-auto mb-2'} />
                                            <p className={`text-sm font-bold text-center ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                {dept.label}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            {!selectedDepartment && (
                                <div className="mt-4 bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3">
                                    <p className="text-yellow-400 text-xs text-center font-bold">
                                        ⚠️ Seleziona un reparto per continuare
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* UPGRADE CTA FOR BASIC */}
                    {isBasicPlan && (
                        <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/30 rounded-2xl p-6">
                            <p className="text-slate-300 text-sm text-center leading-relaxed">
                                Vuoi sbloccare <strong className="text-white">tutti i reparti</strong>? Passa al <span className="text-purple-400 font-bold">Piano Pro</span> in qualsiasi momento dalle impostazioni!
                            </p>
                        </div>
                    )}

                    {/* ACTION BUTTON */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleAcknowledge}
                            disabled={!canProceed}
                            className={`flex-1 py-4 rounded-xl font-black text-lg transition-all shadow-lg ${canProceed
                                    ? `bg-gradient-to-r ${planType === 'Pro' ? 'from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/30' : 'from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/30'} text-white active:scale-95`
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            {canProceed ? '🚀 Inizia Ora' : '⚠️ Seleziona un Reparto'}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 text-center mt-4">
                        Puoi modificare queste impostazioni in qualsiasi momento dal tuo profilo
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionSuccessModal;
