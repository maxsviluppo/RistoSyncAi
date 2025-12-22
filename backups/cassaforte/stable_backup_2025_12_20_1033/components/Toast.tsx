import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
    isOpen: boolean;
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
}

export default function Toast({ isOpen, message, type = 'info', onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (isOpen && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, duration, onClose]);

    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="text-green-500" size={24} />,
        error: <AlertCircle className="text-red-500" size={24} />,
        info: <Info className="text-blue-500" size={24} />
    };

    const colors = {
        success: 'bg-green-600/20 border-green-500/50',
        error: 'bg-red-600/20 border-red-500/50',
        info: 'bg-blue-600/20 border-blue-500/50'
    };

    return (
        <>
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-right {
                    animation: slideInRight 0.3s ease-out;
                }
            `}</style>
            <div className="fixed top-4 right-4 z-[10000] animate-slide-in-right">
                <div className={`${colors[type]} border-2 rounded-2xl shadow-2xl backdrop-blur-sm p-4 pr-12 max-w-md relative`}>
                    <div className="flex items-center gap-3">
                        {icons[type]}
                        <p className="text-white font-bold text-sm leading-relaxed">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </>
    );
}
