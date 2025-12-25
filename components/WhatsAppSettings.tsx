import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, AlertCircle, CheckCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { getAppSettings, saveAppSettings } from '../services/storageService';
import { sendTemplateMessage } from '../services/whatsappService';

interface WhatsAppSettingsProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ showToast }) => {
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [businessAccountId, setBusinessAccountId] = useState('');
    const [apiVersion, setApiVersion] = useState('v22.0');
    const [showToken, setShowToken] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testPhone, setTestPhone] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = () => {
        const settings = getAppSettings();
        const config = settings.restaurantProfile?.whatsappApiConfig;

        if (config) {
            setPhoneNumberId(config.phoneNumberId || '');
            setAccessToken(config.accessToken || '');
            setBusinessAccountId(config.businessAccountId || '');
            setApiVersion(config.apiVersion || 'v22.0');
        }
    };

    const handleSave = () => {
        // Validation: Check for Google API Key confusion
        if (accessToken.startsWith('AIza')) {
            showToast('⚠️ Errore: Hai inserito una Google API Key (inizia con AIza) al posto del Token WhatsApp (inizia con EAA).', 'error');
            return;
        }

        // Validation: Check for correct Facebook Token format
        if (!accessToken.startsWith('EAA')) {
            showToast('⚠️ Attenzione: Il Token WhatsApp dovrebbe iniziare con "EAA". Controlla di aver copiato il token corretto.', 'info');
            // We allow saving but warn the user
        }

        // Validation: Phone Number ID should be numeric
        if (!/^\d+$/.test(phoneNumberId)) {
            showToast('⚠️ Il Phone Number ID deve contenere solo numeri.', 'error');
            return;
        }

        const settings = getAppSettings();

        const updatedSettings = {
            ...settings,
            restaurantProfile: {
                ...settings.restaurantProfile,
                whatsappApiConfig: {
                    phoneNumberId,
                    accessToken,
                    businessAccountId,
                    apiVersion
                }
            }
        };

        saveAppSettings(updatedSettings);
        showToast('✅ Configurazione WhatsApp salvata!', 'success');
    };

    const handleTest = async () => {
        if (!testPhone) {
            showToast('❌ Inserisci un numero di telefono per il test', 'error');
            return;
        }

        if (!phoneNumberId || !accessToken) {
            showToast('❌ Configura prima Phone Number ID e Access Token', 'error');
            return;
        }

        setIsTesting(true);

        try {
            const result = await sendTemplateMessage(
                {
                    phoneNumberId,
                    accessToken,
                    businessAccountId,
                    apiVersion
                },
                testPhone.replace(/\D/g, ''), // Remove non-numeric
                'hello_world',
                'en_US'
            );

            if (result.success) {
                showToast('✅ Messaggio di test inviato! Controlla WhatsApp.', 'success');
            } else {
                showToast(`❌ Errore: ${result.error}`, 'error');
            }
        } catch (error: any) {
            showToast(`❌ Errore: ${error.message}`, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* Info Alert */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex gap-3">
                <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                    <p className="font-bold mb-1">Come ottenere le credenziali:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-300">
                        <li>Vai su <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">developers.facebook.com</a></li>
                        <li>Crea un'app e aggiungi il prodotto WhatsApp</li>
                        <li>Copia Phone Number ID e Access Token dalla sezione "Configurazione API"</li>
                    </ol>
                    <a
                        href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-blue-400 hover:text-blue-300 font-bold"
                    >
                        📖 Guida completa <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                {/* Phone Number ID */}
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                        Phone Number ID *
                    </label>
                    <input
                        type="text"
                        value={phoneNumberId}
                        onChange={(e) => setPhoneNumberId(e.target.value)}
                        placeholder="es. 123456789012345"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-green-500 focus:outline-none"
                    />
                </div>

                {/* Access Token */}
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                        Access Token *
                    </label>
                    <div className="relative">
                        <input
                            type={showToken ? "text" : "password"}
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                            placeholder="EAAG..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:border-green-500 focus:outline-none font-mono text-sm"
                        />
                        <button
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                            {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {/* Business Account ID */}
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                        Business Account ID (opzionale)
                    </label>
                    <input
                        type="text"
                        value={businessAccountId}
                        onChange={(e) => setBusinessAccountId(e.target.value)}
                        placeholder="es. 987654321098765"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-green-500 focus:outline-none"
                    />
                </div>

                {/* API Version */}
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                        Versione API
                    </label>
                    <select
                        value={apiVersion}
                        onChange={(e) => setApiVersion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 focus:outline-none"
                    >
                        <option value="v22.0">v22.0 (Consigliata)</option>
                        <option value="v21.0">v21.0</option>
                        <option value="v20.0">v20.0</option>
                    </select>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={!phoneNumberId || !accessToken}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed"
            >
                <Save size={20} />
                Salva Configurazione
            </button>

            {/* Test Section */}
            <div className="border-t border-slate-700 pt-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-400" />
                    Test Invio Messaggio
                </h4>
                <div className="space-y-3">
                    <input
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="Numero di telefono (es. 393478127440)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-green-500 focus:outline-none"
                    />
                    <button
                        onClick={handleTest}
                        disabled={isTesting || !phoneNumberId || !accessToken}
                        className="w-full bg-green-900/30 hover:bg-green-600 border border-green-500 text-green-200 hover:text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isTesting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Invio in corso...
                            </>
                        ) : (
                            <>
                                <MessageCircle size={18} />
                                Invia Messaggio di Test
                            </>
                        )}
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                        Verrà inviato il template "hello_world" al numero specificato
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppSettings;
