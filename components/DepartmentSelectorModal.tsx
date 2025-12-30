import React, { useState } from 'react';
import { ChefHat, Pizza, Wine, Sparkles, CheckCircle, AlertTriangle, ArrowRight, Crown, Calendar, Zap } from 'lucide-react';

interface DepartmentSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDepartment: (department: 'kitchen' | 'pizzeria' | 'pub') => void;
    currentDepartment?: string;
    // Nuove props per le congratulazioni
    planType?: 'Trial' | 'Basic' | 'Pro';
    endDate?: number;
    price?: string;
    restaurantName?: string;
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
    currentDepartment,
    planType = 'Basic',
    endDate,
    price,
    restaurantName = 'Ristorante'
}) => {
    const [currentSlide, setCurrentSlide] = useState<'congratulations' | 'selection' | 'confirmation'>(planType ? 'congratulations' : 'selection');
    const [selectedDept, setSelectedDept] = useState<string | null>(null);

    if (!isOpen) return null;

    const isBasicPlan = planType === 'Basic';
    const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

    const handleSelect = (deptId: 'kitchen' | 'pizzeria' | 'pub') => {
        setSelectedDept(deptId);
        setCurrentSlide('confirmation');
    };

    const handleConfirm = () => {
        if (selectedDept) {
            onSelectDepartment(selectedDept as any);
        }
    };

    const handleBack = () => {
        setSelectedDept(null);
        setCurrentSlide('selection');
    };

    const handleNextFromCongrats = () => {
        if (isBasicPlan) {
            setCurrentSlide('selection');
        } else {
            onClose();
        }
    };

    // SLIDE 1: CONGRATULAZIONI
    const renderCongratulationsSlide = () => (
        <div className="relative bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700 overflow-hidden animate-fade-in">
            {/* Confetti Animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-${Math.random() * 20}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${2 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="relative z-10 p-12 text-center">
                {/* Crown Icon */}
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-bounce-slow">
                    <Crown size={48} className="text-white" />
                </div>

                {/* Title */}
                <h2 className="text-4xl font-black text-white mb-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Congratulazioni!
                </h2>
                <p className="text-xl text-slate-300 mb-8">
                    Hai attivato il piano <strong className="text-white">{planType}</strong> per <strong className="text-white">{restaurantName}</strong>
                </p>

                {/* Plan Details */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <Calendar className="text-blue-400" size={24} />
                            </div>
                            <div className="text-left">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Valido fino al</p>
                                <p className="text-sm font-bold text-white">{formattedEndDate}</p>
                            </div>
                        </div>
                        {price && (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                                    <Zap className="text-green-400" size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Investimento</p>
                                    <p className="text-sm font-bold text-white">{price}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {planType === 'Pro' ? (
                        <>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CheckCircle className="text-green-400" size={16} />
                                <span>Tutti i Reparti</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CheckCircle className="text-green-400" size={16} />
                                <span>AI Intelligence</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CheckCircle className="text-green-400" size={16} />
                                <span>Campagne Marketing</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CheckCircle className="text-green-400" size={16} />
                                <span>WhatsApp Marketing</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CheckCircle className="text-green-400" size={16} />
                                <span>1 Reparto</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CheckCircle className="text-green-400" size={16} />
                                <span>AI Intelligence</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CheckCircle className="text-green-400" size={16} />
                                <span>Gestione Ordini</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CheckCircle className="text-green-400" size={16} />
                                <span>Menu Digitale</span>
                            </div>
                        </>
                    )}
                </div>

                {/* CTA Button */}
                <button
                    onClick={handleNextFromCongrats}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/50 group"
                >
                    <span className="text-lg">{isBasicPlan ? 'Scegli il tuo Reparto' : 'Inizia Ora'}</span>
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={24} />
                </button>
            </div>
        </div>
    );

    // SLIDE 2: SELEZIONE REPARTO (solo Basic)
    const renderSelectionSlide = () => (
        <div className="relative bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
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
            </div>
        </div>
    );

    // SLIDE 3: CONFERMA
    const renderConfirmationSlide = () => {
        const dept = DEPARTMENTS.find(d => d.id === selectedDept);
        if (!dept) return null;

        const Icon = dept.icon;

        return (
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 overflow-hidden p-12 text-center animate-fade-in">
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
                        onClick={handleConfirm}
                        className={`flex-1 py-4 bg-gradient-to-r ${dept.color} text-white font-bold rounded-xl hover:shadow-lg hover:brightness-110 transition-all text-lg shadow-xl`}
                    >
                        Conferma Scelta
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

            {currentSlide === 'congratulations' && renderCongratulationsSlide()}
            {currentSlide === 'selection' && renderSelectionSlide()}
            {currentSlide === 'confirmation' && renderConfirmationSlide()}
        </div>
    );
};

export default DepartmentSelectorModal;
