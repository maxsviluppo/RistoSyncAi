import React, { useState } from 'react';
import { ChefHat, Pizza, Wine, X, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';

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
        description: 'Ordini food',
        color: 'from-orange-500 to-red-600',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        hoverBorder: 'hover:border-orange-500',
        hoverShadow: 'hover:shadow-orange-500/20'
    },
    {
        id: 'pizzeria' as const,
        name: 'Pizzeria',
        icon: Pizza,
        description: 'Gestione forni',
        color: 'from-red-500 to-pink-600',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        hoverBorder: 'hover:border-red-500',
        hoverShadow: 'hover:shadow-red-500/20'
    },
    {
        id: 'pub' as const,
        name: 'Pub / Bar',
        icon: Wine,
        description: 'Bevande & Snack',
        color: 'from-purple-500 to-blue-600',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30',
        hoverBorder: 'hover:border-purple-500',
        hoverShadow: 'hover:shadow-purple-500/20'
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
            onSelectDepartment(deptId);
        } else {
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
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

            <div className="relative bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Compact */}
                <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="text-yellow-400" size={24} />
                        <h2 className="text-2xl font-black text-white">Configura il tuo Reparto</h2>
                    </div>
                    <p className="text-slate-400 text-sm max-w-lg">
                        Con il piano Basic hai accesso a <strong>UN solo reparto</strong>. Scegli con cura, la tua scelta sarà attiva per tutta la durata dell'abbonamento.
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1 flex flex-col justify-center">

                    {selectedDept && isConfirming ? (
                        <div className="max-w-md mx-auto text-center animate-fade-in flex flex-col justify-center h-full">
                            {(() => {
                                const dept = DEPARTMENTS.find(d => d.id === selectedDept)!;
                                const Icon = dept.icon;

                                return (
                                    <>
                                        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${dept.color} flex items-center justify-center mx-auto mb-6 shadow-2xl animate-bounce-slow`}>
                                            <Icon size={48} className="text-white" />
                                        </div>

                                        <h3 className="text-3xl font-black text-white mb-2">Confermi {dept.name}?</h3>

                                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-8 text-left">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="text-yellow-500 shrink-0 mt-1" size={20} />
                                                <div className="text-sm text-yellow-200/90 leading-relaxed">
                                                    <strong className="block text-yellow-400 mb-1">Attenzione: Scelta Definitiva</strong>
                                                    Stai per attivare il reparto <strong>{dept.name}</strong>. Con il piano Basic, <u>non potrai cambiare reparto</u> fino al prossimo rinnovo o upgrade.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleBack}
                                                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-lg"
                                            >
                                                Indietro
                                            </button>
                                            <button
                                                onClick={() => handleSelect(selectedDept as any)}
                                                className={`flex-1 py-4 bg-gradient-to-r ${dept.color} text-white font-bold rounded-xl hover:shadow-lg hover:brightness-110 transition-all text-lg shadow-xl`}
                                            >
                                                Conferma Scelta
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-center">
                            {DEPARTMENTS.map((dept) => {
                                const Icon = dept.icon;
                                const isCurrentDept = currentDepartment === dept.id;

                                return (
                                    <button
                                        key={dept.id}
                                        onClick={() => handleSelect(dept.id)}
                                        disabled={isCurrentDept}
                                        className={`relative group flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300 h-64 justify-center
                                            ${isCurrentDept
                                                ? 'border-green-500 bg-green-900/10 opacity-60 grayscale cursor-default'
                                                : `${dept.bgColor} ${dept.borderColor} ${dept.hoverBorder} ${dept.hoverShadow} hover:-translate-y-2 hover:shadow-2xl`
                                            }
                                        `}
                                    >
                                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${dept.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon size={40} className="text-white" />
                                        </div>

                                        <h3 className="text-2xl font-bold text-white mb-2">{dept.name}</h3>
                                        <p className="text-sm text-slate-400 text-center">{dept.description}</p>

                                        {isCurrentDept && (
                                            <div className="absolute top-4 right-4 text-green-500 bg-green-500/20 p-1.5 rounded-full">
                                                <CheckCircle size={24} />
                                            </div>
                                        )}

                                        {!isCurrentDept && (
                                            <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase tracking-wider bg-white text-slate-900 px-3 py-1 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 duration-300">
                                                Seleziona
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepartmentSelectorModal;
