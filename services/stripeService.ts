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
export const redirectToCheckout = async (
    priceId: string,
    userId: string,
    userEmail: string,
    successUrl?: string,
    cancelUrl?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const stripe = await getStripe();

        if (!stripe) {
            return { success: false, error: 'Stripe non inizializzato' };
        }

        // For now, we'll use Stripe's Payment Links feature
        // This is the simplest approach that doesn't require backend
        // Generate the checkout URL based on price
        const baseUrl = window.location.origin;
        const success = successUrl || `${baseUrl}?subscription=success`;
        const cancel = cancelUrl || `${baseUrl}?subscription=cancelled`;

        // Create checkout session via Supabase Edge Function
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId,
                userId,
                userEmail,
                successUrl: success,
                cancelUrl: cancel,
            }),
        });

        if (!response.ok) {
            // Fallback to Payment Link if Edge Function not available
            console.warn('Edge Function not available, using Payment Link fallback');
            return redirectToPaymentLink(priceId);
        }

        const { sessionId } = await response.json();

        const { error } = await stripe.redirectToCheckout({ sessionId });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Stripe checkout error:', err);
        return { success: false, error: 'Errore durante il checkout' };
    }
};

// Fallback: Redirect to Stripe Payment Link
// This works without a backend
export const redirectToPaymentLink = async (
    priceId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Payment Links are pre-created in Stripe Dashboard
        // We'll construct the billing portal URL or use direct checkout

        // For Stripe Checkout without backend, we use the billing portal
        // or pre-created payment links

        // Map price IDs to payment link URLs (you create these in Stripe Dashboard)
        const paymentLinks: Record<string, string> = {
            [STRIPE_CONFIG.prices.basic.monthly]: '', // Add payment link URL here
            [STRIPE_CONFIG.prices.basic.yearly]: '',
            [STRIPE_CONFIG.prices.pro.monthly]: '',
            [STRIPE_CONFIG.prices.pro.yearly]: '',
        };

        const paymentLinkUrl = paymentLinks[priceId];

        if (paymentLinkUrl) {
            window.location.href = paymentLinkUrl;
            return { success: true };
        }

        // If no payment link, show instructions
        return {
            success: false,
            error: 'Payment Link non configurato. Contatta l\'assistenza o usa il bonifico bancario.'
        };
    } catch (err) {
        return { success: false, error: 'Errore reindirizzamento pagamento' };
    }
};

// Simple checkout redirect using Stripe's hosted checkout
// This creates a checkout session client-side (limited features)
export const simpleCheckout = async (
    plan: 'basic' | 'pro',
    billingCycle: 'monthly' | 'yearly',
    userEmail?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const stripe = await getStripe();
        if (!stripe) {
            return { success: false, error: 'Stripe non disponibile' };
        }

        const priceId = getPriceId(plan, billingCycle);

        // Note: This approach requires backend for full functionality
        // For now, we'll use a simpler redirect approach

        const { error } = await stripe.redirectToCheckout({
            lineItems: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            successUrl: `${window.location.origin}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}?subscription=cancelled`,
            customerEmail: userEmail,
        });

        if (error) {
            console.error('Checkout error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error('Simple checkout error:', err);
        return { success: false, error: err.message || 'Errore checkout' };
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
        const response = await fetch(`/api/verify-subscription?session_id=${sessionId}`);

        if (!response.ok) {
            return { success: false, error: 'Verifica fallita' };
        }

        const data = await response.json();
        return { success: true, subscription: data };
    } catch (err) {
        return { success: false, error: 'Errore verifica abbonamento' };
    }
};
