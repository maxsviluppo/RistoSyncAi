import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, FileText, Cookie, Shield, Eye } from 'lucide-react';

interface WelcomeModalProps {
    onClose: () => void;
    onAccept: (preferences: { termsAccepted: boolean; cookiesAccepted: boolean; privacyAccepted: boolean; dontShowAgain: boolean }) => void;
    restaurantName: string;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose, onAccept, restaurantName }) => {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [cookiesAccepted, setCookiesAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const canProceed = termsAccepted && cookiesAccepted && privacyAccepted;

    const handleAccept = () => {
        if (canProceed) {
            onAccept({ termsAccepted, cookiesAccepted, privacyAccepted, dontShowAgain });
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-orange-500/30 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* HEADER */}
                <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-8 rounded-t-3xl text-center">
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
                        <Sparkles size={40} className="text-white" />
                    </div>

                    <h1 className="text-3xl font-black text-white mb-2">
                        🎉 Benvenuto in RistoSync AI!
                    </h1>
                    <p className="text-orange-100 text-lg font-bold">
                        {restaurantName}
                    </p>
                </div>

                {/* CONTENT */}
                <div className="p-8 space-y-6">
                    {/* TRIAL INFO */}
                    <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                <CheckCircle size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-black text-lg mb-2">
                                    Trial Gratuito Attivato: 15 Giorni ✨
                                </h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Il tuo periodo di prova gratuito è attivo. Hai pieno accesso a tutte le funzionalità. Alla scadenza potrai scegliere il piano più adatto a te.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* APP FEATURES */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                            <Eye size={18} className="text-orange-500" />
                            Cosa puoi fare con RistoSync AI
                        </h3>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex items-start gap-3">
                                <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                <span><strong className="text-white">Gestione Ordini in Tempo Reale</strong> - Sincronizzazione tra sala e cucina</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                <span><strong className="text-white">Menu Digitale Personalizzato</strong> - QR code per i tuoi clienti</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                <span><strong className="text-white">Intelligenza Artificiale</strong> - Analisi e suggerimenti automatici</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                <span><strong className="text-white">Statistiche Avanzate</strong> - Monitora le performance del tuo locale</span>
                            </li>
                        </ul>
                    </div>

                    {/* TRIAL CTA */}
                    <div className="bg-gradient-to-r from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-2xl p-6">
                        <p className="text-slate-300 text-sm text-center leading-relaxed">
                            Nessuna carta di credito richiesta per iniziare. Goditi l'esperienza <span className="text-orange-400 font-bold">RistoSync AI</span>!
                        </p>
                    </div>

                    {/* TERMS & CONDITIONS */}
                    <div className="space-y-4 border-t border-slate-700 pt-6">
                        <h3 className="text-white font-bold text-sm mb-4">
                            Accettazione Termini e Condizioni
                        </h3>

                        {/* Terms Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-orange-500 checked:border-orange-500 cursor-pointer transition-all"
                                />
                                {termsAccepted && (
                                    <CheckCircle size={14} className="absolute left-0.5 top-0.5 text-white pointer-events-none" />
                                )}
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                <FileText size={14} className="inline mr-1 text-orange-500" />
                                Accetto i <a href="https://www.iubenda.com/termini-e-condizioni/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-bold">Termini e Condizioni</a> del servizio
                            </span>
                        </label>

                        {/* Cookies Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={cookiesAccepted}
                                    onChange={(e) => setCookiesAccepted(e.target.checked)}
                                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-orange-500 checked:border-orange-500 cursor-pointer transition-all"
                                />
                                {cookiesAccepted && (
                                    <CheckCircle size={14} className="absolute left-0.5 top-0.5 text-white pointer-events-none" />
                                )}
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                <Cookie size={14} className="inline mr-1 text-orange-500" />
                                Accetto l'utilizzo dei <a href="https://www.iubenda.com/privacy-policy/cookie-policy/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-bold">Cookie</a> per migliorare l'esperienza
                            </span>
                        </label>

                        {/* Privacy Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={privacyAccepted}
                                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-orange-500 checked:border-orange-500 cursor-pointer transition-all"
                                />
                                {privacyAccepted && (
                                    <CheckCircle size={14} className="absolute left-0.5 top-0.5 text-white pointer-events-none" />
                                )}
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                <Shield size={14} className="inline mr-1 text-orange-500" />
                                Accetto la <a href="https://www.iubenda.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-bold">Privacy Policy</a> e il trattamento dei dati
                            </span>
                        </label>

                        {/* Don't Show Again */}
                        <label className="flex items-start gap-3 cursor-pointer group mt-6 pt-4 border-t border-slate-700">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-all"
                                />
                                {dontShowAgain && (
                                    <CheckCircle size={14} className="absolute left-0.5 top-0.5 text-white pointer-events-none" />
                                )}
                            </div>
                            <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                                Non mostrare più questo messaggio
                            </span>
                        </label>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleAccept}
                            disabled={!canProceed}
                            className={`flex-1 py-4 rounded-xl font-black text-lg transition-all shadow-lg ${canProceed
                                ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-orange-500/30 active:scale-95'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            {canProceed ? '🚀 Inizia Ora' : '⚠️ Accetta i Termini'}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 text-center mt-4">
                        Puoi modificare queste preferenze in qualsiasi momento dalle impostazioni
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
