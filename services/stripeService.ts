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

        // DEPRECATED: This method requires a backend (Supabase Edge Function)
        // We now use Payment Links instead (see simpleCheckout method)
        // Keeping this code for reference if backend is added later

        /*
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
        */

        // For now, always use Payment Link fallback (no backend required)
        console.log('Using Payment Link method (no backend required)');
        return redirectToPaymentLink(priceId);
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
        // Payment Links are pre-created in Stripe Dashboard (LIVE MODE)
        // Same links as in simpleCheckout method
        const paymentLinks: Record<string, string> = {
            // Basic Plan
            [STRIPE_CONFIG.prices.basic.monthly]: 'https://buy.stripe.com/14AeVdfhp8QU9sgeRm7IY01',
            [STRIPE_CONFIG.prices.basic.yearly]: 'https://buy.stripe.com/6oU14ngltffi7k810w7IY02',

            // Pro Plan
            [STRIPE_CONFIG.prices.pro.monthly]: 'https://buy.stripe.com/28E28r2uD7MQ33S10w7IY03',
            [STRIPE_CONFIG.prices.pro.yearly]: 'https://buy.stripe.com/8x200j0mv4AEcEs24A7IY04',
        };

        const paymentLinkUrl = paymentLinks[priceId];

        if (paymentLinkUrl) {
            window.location.href = paymentLinkUrl;
            return { success: true };
        }

        // If no payment link, show instructions
        return {
            success: false,
            error: 'Payment Link non configurato. Usa bonifico o PayPal.'
        };
    } catch (err) {
        return { success: false, error: 'Errore reindirizzamento pagamento' };
    }
};


// UPDATED: Using Stripe Payment Links (no backend required)
// Payment Links are pre-created in Stripe Dashboard and work with all Stripe.js versions
export const simpleCheckout = async (
    plan: 'basic' | 'pro',
    billingCycle: 'monthly' | 'yearly',
    userEmail?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Payment Links created in Stripe Dashboard (LIVE MODE)
        // These links work without backend and are compatible with all Stripe.js versions
        const paymentLinks: Record<string, string> = {
            // Basic Plan
            'price_1SjTTTEWTa8WMtIUeivRK7o7': 'https://buy.stripe.com/14AeVdfhp8QU9sgeRm7IY01', // Basic Monthly €49.90
            'price_1SjTUMEWTa8WMtIUREYn9Pjr': 'https://buy.stripe.com/6oU14ngltffi7k810w7IY02',  // Basic Yearly €499.00

            // Pro Plan
            'price_1SjTVBEWTa8WMtIUITurS6h1': 'https://buy.stripe.com/28E28r2uD7MQ33S10w7IY03',   // Pro Monthly €99.90
            'price_1SjTVrEWTa8WMtIUSduyKOa4': 'https://buy.stripe.com/8x200j0mv4AEcEs24A7IY04',    // Pro Yearly €999.00
        };

        const priceId = getPriceId(plan, billingCycle);
        const paymentLink = paymentLinks[priceId];

        if (!paymentLink) {
            console.error('Payment link not configured for:', priceId);
            return {
                success: false,
                error: 'Payment Link non configurato. Usa bonifico o PayPal.'
            };
        }

        // Add email as query parameter if provided
        const linkWithEmail = userEmail
            ? `${paymentLink}?prefilled_email=${encodeURIComponent(userEmail)}`
            : paymentLink;

        // Direct redirect to Stripe Payment Link
        window.location.href = linkWithEmail;

        return { success: true };
    } catch (err: any) {
        console.error('Payment link error:', err);
        return { success: false, error: err.message || 'Errore reindirizzamento pagamento' };
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
