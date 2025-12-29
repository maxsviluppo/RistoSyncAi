// Stripe Configuration for RistoSync
// IMPORTANT: Only the PUBLISHABLE key should be in frontend code
// The SECRET key must ONLY be used in Supabase Edge Functions

export const STRIPE_CONFIG = {
    // Publishable key (safe for frontend)
    publishableKey: 'pk_live_51SjGytEWTa8WMtIU3LHyaPfsBoSpMnMhjf5SBYg62QVqj5yP0b3XA5UDc7lIaWqFppQU4c74Ul9syvLbK88iYSb9004RXFqtdh',

    // Price IDs for each plan
    prices: {
        basic: {
            monthly: 'price_1SjTTTEWTa8WMtIUeivRK7o7',
            yearly: 'price_1SjTUMEWTa8WMtIUREYn9Pjr',
        },
        pro: {
            monthly: 'price_1SjTVBEWTa8WMtIUITurS6h1',
            yearly: 'price_1SjTVrEWTa8WMtIUSduyKOa4',
        }
    },

    // Plan details for UI
    plans: {
        basic: {
            name: 'Basic',
            monthlyPrice: 49.90,
            yearlyPrice: 499.00,
            features: [
                '1 reparto a scelta (Cucina, Pizzeria, Pub o Delivery)',
                'Gestione Ordini completa',
                'Gestione Menu digitale',
                'Monitor Tavoli in tempo reale',
                'Sistema Prenotazioni',
                'Anagrafica Clienti',
            ],
            excluded: [
                'WhatsApp Marketing',
                'AI Assistant',
                'Multi-reparto',
            ]
        },
        pro: {
            name: 'Pro',
            monthlyPrice: 99.90,
            yearlyPrice: 999.00,
            features: [
                'TUTTI i reparti (Cucina, Pizzeria, Pub, Delivery)',
                'Gestione Ordini completa',
                'Gestione Menu digitale',
                'Monitor Tavoli in tempo reale',
                'Sistema Prenotazioni',
                'Anagrafica Clienti',
                'WhatsApp Marketing integrato',
                'AI Assistant avanzato',
                'Multi-reparto illimitato',
                'Statistiche avanzate',
                'Supporto prioritario',
            ],
            excluded: []
        }
    }
};

// Helper to get the correct price ID based on plan and billing cycle
export const getPriceId = (plan: 'basic' | 'pro', billingCycle: 'monthly' | 'yearly'): string => {
    return STRIPE_CONFIG.prices[plan][billingCycle];
};

// Helper to get plan price
export const getPlanPrice = (plan: 'basic' | 'pro', billingCycle: 'monthly' | 'yearly'): number => {
    return billingCycle === 'monthly'
        ? STRIPE_CONFIG.plans[plan].monthlyPrice
        : STRIPE_CONFIG.plans[plan].yearlyPrice;
};
