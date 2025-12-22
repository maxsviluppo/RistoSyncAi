import React from 'react';
import { AlertTriangle, CheckCircle, X, Trash2 } from 'lucide-react';

interface CustomDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'delete';
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export default function CustomDialog({
    isOpen,
    title,
    message,
    type,
    onConfirm,
    onCancel,
    confirmText = 'Conferma',
    cancelText = 'Annulla'
}: CustomDialogProps) {
    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md animate-slide-up">
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${type === 'confirm' ? 'bg-orange-600/20' :
                            type === 'success' ? 'bg-blue-600/20' :
                                type === 'delete' ? 'bg-red-600/20' :
                                    'bg-blue-600/20'
                            }`}>
                            {type === 'confirm' && <AlertTriangle className="text-orange-500" size={24} />}
                            {type === 'success' && <CheckCircle className="text-blue-500" size={24} />}
                            {type === 'delete' && <Trash2 className="text-red-500" size={24} />}
                            {type === 'alert' && <AlertTriangle className="text-blue-500" size={24} />}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                            <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 bg-slate-950/50 border-t border-slate-800 rounded-b-3xl flex gap-3 ${(type === 'confirm' || type === 'delete') ? 'justify-between' : 'justify-end'}`}>
                    {(type === 'confirm' || type === 'delete') && (
                        <button
                            onClick={handleCancel}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 px-6 py-3 font-bold rounded-xl transition-all shadow-lg ${type === 'confirm' ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/20' :
                            type === 'success' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' :
                                type === 'delete' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' :
                                    'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                            }`}
                    >
                        {type === 'confirm' || type === 'delete' ? confirmText : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
}
