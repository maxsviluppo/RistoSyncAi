import React, { useEffect, useState } from 'react';
import { getAppSettings, saveAppSettings } from '../services/storageService';
import { Subscription } from '../types';
import { CheckCircle, Loader2 } from 'lucide-react';

interface StripeSuccessHandlerProps {
    onSuccess: (plan: 'Basic' | 'Pro', isYearly: boolean) => void;
}

const StripeSuccessHandler: React.FC<StripeSuccessHandlerProps> = ({ onSuccess }) => {
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        // Check for both standard and legacy params
        const subscriptionStatus = urlParams.get('subscription') || urlParams.get('subscription_checkout');
        const planParam = urlParams.get('plan');

        // CRITICAL: Handle cancelled payments - clear pending data to prevent false activations
        if (subscriptionStatus === 'cancelled') {
            console.log('[StripeSuccessHandler] Payment CANCELLED - clearing pending payment data');
            localStorage.removeItem('ristosync_pending_payment');
            // Clean the URL
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        if (subscriptionStatus === 'success' && status === 'idle') {
            setStatus('processing');
            setMessage('Pagamento rilevato, aggiornamento in corso...');

            // Determine Plan Details
            const isYearly = planParam?.toLowerCase().includes('yearly') || false;
            const isBasic = planParam?.toLowerCase().includes('basic') || false;
            const newPlanName = isBasic ? 'Basic' : 'Pro';

            console.log(`[StripeSuccessHandler] Payment Success detected. Plan: ${newPlanName}, Yearly: ${isYearly}`);

            try {
                // FORCE UPDATE LOCAL STORAGE DIRECTLY
                const currentSettings = getAppSettings();
                const duration = isYearly ? 365 : 30;
                const endDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();
                const endDateTs = new Date(endDate).getTime();

                // Construct new subscription object
                const newSubscription: Subscription = {
                    planId: newPlanName.toLowerCase() as 'basic' | 'pro',
                    status: 'active',
                    startDate: Date.now(),
                    endDate: endDateTs,
                    paymentMethod: 'stripe',
                    paymentReference: `STRIPE-${Date.now()}`
                };

                // Prepare updated settings
                const updatedSettings = {
                    ...currentSettings,
                    restaurantProfile: {
                        ...currentSettings.restaurantProfile,
                        planType: newPlanName as any,
                        subscriptionEndDate: endDate
                    },
                    subscription: newSubscription
                };

                // SAVE TO STORAGE
                saveAppSettings(updatedSettings);
                console.log('[StripeSuccessHandler] Settings saved to LocalStorage');

                // Notify Parent (App.tsx) to update state/UI
                setTimeout(() => {
                    setStatus('success');
                    setMessage('Abbonamento attivato con successo!');
                    onSuccess(newPlanName, isYearly);
                }, 1000);

            } catch (error) {
                console.error('[StripeSuccessHandler] Error updating settings:', error);
                setStatus('error');
                setMessage('Errore durante il salvataggio dell\'abbonamento. Contatta il supporto.');
            }
        }
    }, [status, onSuccess]);

    if (status === 'idle') return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
                {status === 'processing' && (
                    <>
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Verifica Pagamento...</h2>
                        <p className="text-slate-400">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-2xl font-bold text-white mb-2">Tutto Pronto!</h2>
                        <p className="text-green-400 mb-4">{message}</p>
                        <p className="text-slate-500 text-sm">Verrai reindirizzato tra poco...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">!</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Errore</h2>
                        <p className="text-red-400">{message}</p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold"
                        >
                            Torna alla Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default StripeSuccessHandler;
