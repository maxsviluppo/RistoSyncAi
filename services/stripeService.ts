// Stripe Service for RistoSync
// Handles Stripe Checkout integration

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG, getPriceId } from './stripeConfig';

let stripePromise: Promise<Stripe | null>;

// Initialize Stripe
export const getStripe = () => {
    if (!stripePromise) {
        stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);
    }
    return stripePromise;
};

// Create Checkout Session and redirect
// NOTE: For production, this should call a Supabase Edge Function
// that creates the session using the SECRET key
// Simple checkout redirect using Stripe Payment Links (Robust & No-Backend)
// Standardizes all checkout attempts to use Payment Links
export const simpleCheckout = async (
    plan: 'basic' | 'pro',
    billingCycle: 'monthly' | 'yearly',
    userEmail?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const priceId = getPriceId(plan, billingCycle);

        // DIRECT REDIRECT TO PAYMENT LINK
        // This avoids "stripe.redirectToCheckout" deprecation issues
        return await redirectToPaymentLink(priceId);

    } catch (err: any) {
        console.error('Simple checkout error:', err);
        return { success: false, error: err.message || 'Errore checkout' };
    }
};

// Fallback: Redirect to Stripe Payment Link
// This works without a backend
export const redirectToPaymentLink = async (
    priceId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Payment Links are pre-created in Stripe Dashboard
        // MAP YOUR REAL STRIPE PAYMENT LINKS HERE
        const paymentLinks: Record<string, string> = {
            [STRIPE_CONFIG.prices.basic.monthly]: 'https://buy.stripe.com/14AeVdfhp8QU9sgeRm7IY01', // BASIC MENSILE ACTIVE LINK
            [STRIPE_CONFIG.prices.basic.yearly]: 'https://buy.stripe.com/6oU14ngltffi7k810w7IY02',  // BASIC ANNUALE REAL LINK
            [STRIPE_CONFIG.prices.pro.monthly]: 'https://buy.stripe.com/28E28r2uD7MQ33S10w7IY03',   // PRO MENSILE REAL LINK
            [STRIPE_CONFIG.prices.pro.yearly]: 'https://buy.stripe.com/8x200j0mv4AEcEs24A7IY04',    // PRO ANNUALE REAL LINK
        };

        const paymentLinkUrl = paymentLinks[priceId];

        if (paymentLinkUrl && paymentLinkUrl.startsWith('http')) {
            // *** CRUCIALE: Salva i dati del pagamento PRIMA del redirect ***
            // Determina piano e ciclo di fatturazione dal priceId
            let plan: 'basic' | 'pro' = 'basic';
            let billingCycle: 'monthly' | 'yearly' = 'monthly';

            if (priceId === STRIPE_CONFIG.prices.basic.monthly) {
                plan = 'basic';
                billingCycle = 'monthly';
            } else if (priceId === STRIPE_CONFIG.prices.basic.yearly) {
                plan = 'basic';
                billingCycle = 'yearly';
            } else if (priceId === STRIPE_CONFIG.prices.pro.monthly) {
                plan = 'pro';
                billingCycle = 'monthly';
            } else if (priceId === STRIPE_CONFIG.prices.pro.yearly) {
                plan = 'pro';
                billingCycle = 'yearly';
            }

            // Salva in localStorage per recuperare al ritorno da Stripe
            localStorage.setItem('ristosync_pending_payment', JSON.stringify({
                plan: plan,
                billingCycle: billingCycle,
                timestamp: new Date().toISOString(),
                completed: false,
                priceId: priceId
            }));

            console.log('💾 Dati pagamento salvati in localStorage:', { plan, billingCycle });

            // Redirect a Stripe
            window.location.href = paymentLinkUrl;
            return { success: true };
        }

        // If no payment link, show instructions
        console.error('Payment Link non trovato per priceId:', priceId);
        return {
            success: false,
            error: 'Link di pagamento non configurato. Contatta l\'assistenza.'
        };
    } catch (err) {
        return { success: false, error: 'Errore reindirizzamento pagamento' };
    }
};

// Check subscription status (call after successful payment)
export const verifySubscription = async (sessionId: string): Promise<{
    success: boolean;
    subscription?: {
        id: string;
        status: string;
        plan: string;
        currentPeriodEnd: Date;
    };
    error?: string;
}> => {
    try {
        // This should call your backend to verify the session
        // For now, in client-only mode, this function is a placeholder
        // or could check parameters in the URL

        // Mock verification for now
        return { success: true };

    } catch (err) {
        return { success: false, error: 'Errore verifica abbonamento' };
    }
};
