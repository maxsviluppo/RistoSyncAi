import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, Rocket, CheckCircle, Star, Zap, ChefHat, Bot, MessageCircle, TrendingUp, X } from 'lucide-react';

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    planType: string;
    endDate: string;
    price: string;
    restaurantName?: string;
}

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
    isOpen,
    onClose,
    planType,
    endDate,
    price,
    restaurantName
}) => {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            // Auto-close after 30 seconds (aumentato per dare più tempo)
            const timer = setTimeout(() => {
                onClose();
            }, 30000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isPro = planType.toLowerCase().includes('pro');

    const features = isPro ? [
        { icon: <ChefHat size={20} />, text: 'Tutti i reparti sbloccati' },
        { icon: <Bot size={20} />, text: 'AI Assistente Intelligente' },
        { icon: <MessageCircle size={20} />, text: 'WhatsApp Marketing Illimitato' },
        { icon: <TrendingUp size={20} />, text: 'Report Avanzati' },
    ] : [
        { icon: <ChefHat size={20} />, text: 'Il tuo reparto è attivo' },
        { icon: <Bot size={20} />, text: 'AI Intelligence inclusa' },
        { icon: <Zap size={20} />, text: 'Gestione ordini e delivery' },
        { icon: <Star size={20} />, text: 'Menu digitale professionale' },
    ];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Confetti Animation */}
            {showConfetti && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-20px',
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 2}s`,
                            }}
                        >
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][i % 8],
                                    transform: `rotate(${Math.random() * 360}deg)`,
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Content */}
            <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-purple-500/30 animate-scale-in">

                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 blur-3xl" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
                >
                    <X size={24} />
                </button>

                {/* Content */}
                <div className="relative p-8 text-center">

                    {/* Crown Icon with animation */}
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-yellow-400/30 blur-2xl rounded-full animate-pulse" />
                        <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-6 rounded-full shadow-lg animate-bounce-slow">
                            <Crown size={48} className="text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2">
                            <Sparkles size={28} className="text-yellow-300 animate-spin-slow" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 mb-4 animate-gradient">
                        🎉 CONGRATULAZIONI! 🎉
                    </h1>

                    {/* Plan Badge */}
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg mb-6">
                        <Star className="text-yellow-300" size={20} />
                        <span className="text-white font-bold text-xl">Piano {planType} Attivato!</span>
                        <Star className="text-yellow-300" size={20} />
                    </div>

                    {/* Motivational Text */}
                    <div className="space-y-4 mb-8">
                        {restaurantName && (
                            <p className="text-2xl text-white font-bold leading-relaxed">
                                🎊 <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500">{restaurantName}</span> 🎊
                            </p>
                        )}
                        <p className="text-xl text-white/90 font-medium leading-relaxed">
                            Benvenuto nel <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-bold">futuro della ristorazione!</span>
                        </p>
                        <p className="text-lg text-white/70 leading-relaxed">
                            Ora puoi gestire il tuo ristorante con la <strong className="text-purple-300">tecnologia del futuro</strong>.
                            Grazie all'<strong className="text-cyan-300">Intelligenza Artificiale</strong> potrai migliorare
                            la tua attività, aumentare i profitti e stupire i tuoi clienti!
                        </p>

                        {/* Indicatore Prossimo Step per Basic */}
                        {!isPro && (
                            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-xl">
                                <p className="text-blue-200 text-sm font-semibold flex items-center gap-2">
                                    <span>🎯</span>
                                    <span>Prossimo: Scegli il tuo reparto →</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg text-white">
                                    {feature.icon}
                                </div>
                                <span className="text-white/90 font-medium text-sm text-left">{feature.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Subscription Details */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-white/70">Piano attivato:</span>
                            <span className="text-white font-bold text-lg">{planType}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-white/70">Valido fino al:</span>
                            <span className="text-emerald-400 font-bold text-lg">{new Date(endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white/70">Importo pagato:</span>
                            <span className="text-yellow-400 font-bold text-lg">{price}</span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={onClose}
                        className="w-full py-4 px-8 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-400 hover:via-emerald-400 hover:to-teal-400 text-white font-bold text-xl rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-3"
                    >
                        <Rocket size={24} />
                        Inizia Subito!
                        <Sparkles size={24} />
                    </button>

                    {/* Footer Note */}
                    <p className="mt-6 text-white/50 text-sm">
                        Riceverai una email di conferma con i dettagli del tuo abbonamento.
                    </p>
                </div>
            </div>

            {/* CSS for animations */}
            <style>{`
                @keyframes confetti {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                .animate-confetti {
                    animation: confetti 4s ease-out forwards;
                }
                @keyframes scale-in {
                    0% {
                        transform: scale(0.8);
                        opacity: 0;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.5s ease-out forwards;
                }
                @keyframes bounce-slow {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s ease-in-out infinite;
                }
                @keyframes spin-slow {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
                @keyframes gradient {
                    0%, 100% {
                        background-size: 200% 200%;
                        background-position: left center;
                    }
                    50% {
                        background-size: 200% 200%;
                        background-position: right center;
                    }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
            `}</style>
        </div>
    );
};

export default PaymentSuccessModal;
