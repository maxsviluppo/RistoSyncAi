import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, X, Trash2, Keyboard } from 'lucide-react';

interface CustomDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'delete' | 'prompt';
    onConfirm?: (val?: string) => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    inputValue?: string; // Initial value
    placeholder?: string;
}

export default function CustomDialog({
    isOpen,
    title,
    message,
    type,
    onConfirm,
    onCancel,
    confirmText = 'Conferma',
    cancelText = 'Annulla',
    inputValue = '',
    placeholder = ''
}: CustomDialogProps) {
    const [promptValue, setPromptValue] = useState(inputValue);

    useEffect(() => {
        if (isOpen) setPromptValue(inputValue);
    }, [isOpen, inputValue]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) onConfirm(type === 'prompt' ? promptValue : undefined);
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
                                    type === 'prompt' ? 'bg-purple-600/20' :
                                        'bg-blue-600/20'
                            }`}>
                            {type === 'confirm' && <AlertTriangle className="text-orange-500" size={24} />}
                            {type === 'success' && <CheckCircle className="text-blue-500" size={24} />}
                            {type === 'delete' && <Trash2 className="text-red-500" size={24} />}
                            {type === 'alert' && <AlertTriangle className="text-blue-500" size={24} />}
                            {type === 'prompt' && <Keyboard className="text-purple-500" size={24} />}
                        </div>
                        <div className="flex-1 w-full">
                            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                            <p className="text-slate-300 text-sm leading-relaxed mb-3">{message}</p>

                            {type === 'prompt' && (
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                                    value={promptValue}
                                    onChange={(e) => setPromptValue(e.target.value)}
                                    placeholder={placeholder}
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>
                </div>
                <div className={`p-4 bg-slate-950/50 border-t border-slate-800 rounded-b-3xl flex gap-3 ${(type === 'confirm' || type === 'delete' || type === 'prompt') ? 'justify-between' : 'justify-end'}`}>
                    {(type === 'confirm' || type === 'delete' || type === 'prompt') && (
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
                                    type === 'prompt' ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20' :
                                        'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                            }`}
                    >
                        {type === 'confirm' || type === 'delete' ? confirmText : (type === 'prompt' ? 'Inserisci' : 'OK')}
                    </button>
                </div>
            </div>
        </div>
    );
}
