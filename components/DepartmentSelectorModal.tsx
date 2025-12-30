import React, { useState } from 'react';
import { ChefHat, Pizza, Wine, Bike, X, Lock, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';

interface DepartmentSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDepartment: (department: 'kitchen' | 'pizzeria' | 'pub') => void;
    currentDepartment?: string;
}

const DEPARTMENTS = [
    {
        id: 'kitchen' as const,
        name: 'Cucina',
        icon: ChefHat,
        description: 'Gestione comande cucina, primi, secondi, antipasti, dolci',
        color: 'from-orange-500 to-red-600',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/50',
    },
    {
        id: 'pizzeria' as const,
        name: 'Pizzeria',
        icon: Pizza,
        description: 'Gestione ordini pizze, impasti, forni, tempi cottura',
        color: 'from-red-500 to-pink-600',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/50',
    },
    {
        id: 'pub' as const,
        name: 'Pub / Bar',
        icon: Wine,
        description: 'Gestione bevande, cocktail, panini, snack veloce',
        color: 'from-purple-500 to-blue-600',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/50',
    },
];

const DepartmentSelectorModal: React.FC<DepartmentSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelectDepartment,
    currentDepartment
}) => {
    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isOpen) return null;

    const handleSelect = (deptId: 'kitchen' | 'pizzeria' | 'pub') => {
        if (isConfirming && selectedDept === deptId) {
            // Conferma finale
            onSelectDepartment(deptId);
        } else {
            // Prima selezione - mostra conferma
            setSelectedDept(deptId);
            setIsConfirming(true);
        }
    };

    const handleBack = () => {
        setSelectedDept(null);
        setIsConfirming(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop - NON CHIUDIBILE */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-600/50">

                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl" />

                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-center">
                    {/* Pulsante X DISABILITATO - l'utente deve scegliere */}
                    <div className="absolute top-4 right-4 p-2 text-white/30 cursor-not-allowed rounded-full" title="Scegli un reparto per continuare">
                        <X size={24} />
                    </div>

                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-3xl">🎯</span>
                        <h1 className="text-3xl font-black text-white">
                            Ultimo Step: Scegli il Tuo Reparto
                        </h1>
                        <Sparkles className="text-yellow-300" size={28} />
                    </div>

                    <p className="text-white/90 text-lg">
                        Questa è l'ultima configurazione! Dopo potrai iniziare subito 🚀
                    </p>
                </div>

                {/* Content */}
                <div className="relative p-6">

                    {!isConfirming ? (
                        <>
                            {/* Info Box */}
                            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
                                <AlertTriangle className="text-blue-400 flex-shrink-0 mt-0.5" size={24} />
                                <div>
                                    <p className="text-blue-200 font-semibold mb-1">📌 Informazioni Importanti</p>
                                    <p className="text-blue-100/80 text-sm">
                                        Il piano <strong>Basic</strong> include <strong>UN SOLO reparto</strong>.
                                        La scelta sarà attiva per tutta la durata dell'abbonamento.
                                        Al prossimo rinnovo potrai scegliere un reparto diverso o passare a PRO per sbloccare tutto!
                                    </p>
                                </div>
                            </div>

                            {/* Departments Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {DEPARTMENTS.map((dept) => {
                                    const Icon = dept.icon;
                                    const isCurrentDept = currentDepartment === dept.id;

                                    return (
                                        <button
                                            key={dept.id}
                                            onClick={() => handleSelect(dept.id)}
                                            disabled={isCurrentDept}
                                            className={`relative p-5 rounded-2xl border-2 transition-all duration-300 text-left group
                                                ${isCurrentDept
                                                    ? 'border-green-500 bg-green-500/20 cursor-default'
                                                    : `${dept.borderColor} ${dept.bgColor} hover:scale-105 hover:shadow-lg cursor-pointer`
                                                }
                                            `}
                                        >
                                            {isCurrentDept && (
                                                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                                                    <CheckCircle size={20} className="text-white" />
                                                </div>
                                            )}

                                            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${dept.color} mb-3`}>
                                                <Icon size={28} className="text-white" />
                                            </div>

                                            <h3 className="text-white font-bold text-lg mb-1">{dept.name}</h3>
                                            <p className="text-white/60 text-sm line-clamp-2">{dept.description}</p>

                                            {isCurrentDept && (
                                                <span className="mt-2 inline-block text-xs text-green-400 font-semibold">
                                                    Attualmente Attivo
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        /* Confirmation Screen */
                        <div className="text-center py-4">
                            {selectedDept && (() => {
                                const dept = DEPARTMENTS.find(d => d.id === selectedDept)!;
                                const Icon = dept.icon;

                                return (
                                    <>
                                        <div className={`inline-flex p-6 rounded-2xl bg-gradient-to-br ${dept.color} mb-6`}>
                                            <Icon size={48} className="text-white" />
                                        </div>

                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            Confermi la scelta?
                                        </h2>

                                        <p className="text-xl text-white/90 mb-6">
                                            Vuoi attivare il reparto <strong className="text-yellow-300">{dept.name}</strong>?
                                        </p>

                                        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
                                            <p className="text-white/70 text-sm mb-2">
                                                ⚠️ <strong>Ricorda:</strong>
                                            </p>
                                            <ul className="text-white/60 text-sm space-y-1">
                                                <li>• Potrai usare solo questo reparto con il piano Basic</li>
                                                <li>• Gli altri reparti rimarranno bloccati</li>
                                                <li>• Al rinnovo potrai scegliere un reparto diverso</li>
                                                <li>• Passa a PRO per sbloccare tutti i reparti!</li>
                                            </ul>
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleBack}
                                                className="flex-1 py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                                            >
                                                ← Cambia Scelta
                                            </button>
                                            <button
                                                onClick={() => handleSelect(selectedDept as any)}
                                                className={`flex-1 py-4 px-6 bg-gradient-to-r ${dept.color} text-white font-bold rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2`}
                                            >
                                                <CheckCircle size={20} />
                                                Conferma {dept.name}
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-700 text-center">
                        <p className="text-slate-400 text-sm">
                            Vuoi tutti i reparti?
                            <span className="text-purple-400 font-semibold ml-1">Passa a PRO!</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentSelectorModal;
