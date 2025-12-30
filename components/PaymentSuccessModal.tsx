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
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />

            {/* Confetti */}
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

            {/* Modal */}
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-700 flex flex-col items-center p-8 animate-scale-in">

                {/* Close */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>

                {/* Icon Hero */}
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/20 mb-6 animate-bounce-slow">
                    <Crown size={48} className="text-white" />
                </div>

                <h2 className="text-3xl font-black text-white mb-2 text-center">Congratulazioni!</h2>

                {restaurantName && <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300 mb-6">{restaurantName}</h3>}

                <div className="bg-slate-800/50 rounded-xl p-6 w-full mb-8 border border-slate-700">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
                        <span className="text-slate-400">Piano Attivato</span>
                        <span className="text-xl font-black text-white px-3 py-1 bg-white/10 rounded-lg">{planType}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Scadenza</span>
                        <span className="text-white font-mono">{new Date(endDate).toLocaleDateString('it-IT')}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mb-8">
                    {features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 p-2 rounded-lg border border-slate-700">
                            <div className="text-green-400">{feature.icon}</div>
                            <span>{feature.text}</span>
                        </div>
                    ))}
                </div>

                <button onClick={onClose} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                    <Rocket size={20} />
                    Inizia Subito
                </button>

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
