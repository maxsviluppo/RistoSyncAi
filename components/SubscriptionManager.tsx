import React, { useState, useEffect } from 'react';
import {
    CreditCard, Building2, CheckCircle, X, Crown, Zap, MessageCircle,
    ChefHat, Users, BarChart3, Truck, Phone, Mail, ArrowRight,
    Shield, Clock, Star, Sparkles, AlertCircle, Loader2, Copy, Check, Info, QrCode
} from 'lucide-react';
import { getAppSettings, saveAppSettings } from '../services/storageService';
import { STRIPE_CONFIG, getPriceId } from '../services/stripeConfig';
import { simpleCheckout } from '../services/stripeService';

interface SubscriptionManagerProps {
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Plan Types
type PlanType = 'trial' | 'basic' | 'pro';
type PaymentMethod = 'stripe' | 'paypal' | 'bonifico';

interface Plan {
    id: PlanType;
    name: string;
    price: number;
    priceYearly: number;
    description: string;
    features: string[];
    excludedFeatures?: string[];
    popular?: boolean;
    icon: React.ReactNode;
    color: string;
    gradient: string;
}

interface Subscription {
    planId: PlanType;
    status: 'active' | 'pending' | 'expired' | 'cancelled';
    startDate: number;
    endDate: number;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
}

const PLANS: Plan[] = [
    {
        id: 'trial',
        name: 'Prova Gratuita',
        price: 0,
        priceYearly: 0,
        description: 'Prova RistoSync completo per 15 giorni',
        icon: <Zap size={32} />,
        color: 'indigo',
        gradient: 'from-indigo-600 to-blue-500',
        features: [
            'TUTTI i reparti inclusi',
            'Gestione Menu Digitale',
            'Sistemi Prenotazioni Completi',
            'WhatsApp Marketing',
            'AI Assistente',
            'Monitor Tavoli Real-time',
            'Gestione Ordini Completa'
        ],
        excludedFeatures: []
    },
    {
        id: 'basic',
        name: 'Basic',
        price: 49.90,
        priceYearly: 499.00,
        description: '1 reparto a scelta',
        icon: <ChefHat size={32} />,
        color: 'blue',
        gradient: 'from-blue-600 to-blue-700',
        features: [
            '1 reparto a scelta (Cucina, Pizzeria, Pub o Delivery)',
            'Gestione Ordini Completa',
            'Gestione Menu Digitale',
            'Monitor Tavoli Real-time',
            'Sistema Prenotazioni',
            'Anagrafica Clienti',
            'Report Base',
            'Supporto Email'
        ],
        excludedFeatures: [
            'Multi-reparto',
            'WhatsApp Marketing',
            'AI Assistente'
        ]
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 99.90,
        priceYearly: 999.00,
        description: 'Tutti i reparti + WhatsApp + AI',
        icon: <Crown size={32} />,
        color: 'purple',
        gradient: 'from-purple-600 to-pink-600',
        popular: true,
        features: [
            'TUTTI i reparti (Cucina, Pizzeria, Pub, Delivery)',
            'Gestione Ordini Completa',
            'Gestione Menu Digitale',
            'Monitor Tavoli Real-time',
            'Sistema Prenotazioni',
            'Anagrafica Clienti',
            'WhatsApp Marketing Illimitato',
            'AI Assistente Intelligente',
            'Report Avanzati & Statistiche',
            'Supporto Prioritario',
            'Aggiornamenti Beta'
        ]
    }
];

// Bank details for bonifico
const BANK_DETAILS = {
    intestatario: 'Massimo Castro',
    iban: 'IT73W0623074792000057589384',
    banca: 'Cariparma Credit Agricole',
    causale: 'Abbonamento RistoSync {PIANO} - {RISTORANTE}'
};

const PAYPAL_DETAILS = {
    email: 'castro.massimo@gmail.com',
    link: 'https://paypal.me/ristosync'
};

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onClose, showToast }) => {
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
    const [step, setStep] = useState<'plans' | 'payment' | 'bonifico' | 'paypal' | 'success'>('plans');
    const [copied, setCopied] = useState<string | null>(null);

    // Load current subscription on mount
    useEffect(() => {
        loadSubscription();

        // Check for pre-selected plan from Landing Page
        const preselected = localStorage.getItem('preselected_plan') as PlanType;
        if (preselected) {
            handleSelectPlan(preselected);
            localStorage.removeItem('preselected_plan');
        }
    }, []);

    const loadSubscription = () => {
        const settings = getAppSettings();
        if (settings.subscription) {
            setCurrentSubscription(settings.subscription as Subscription);
        }
    };

    const saveSubscription = (sub: Subscription) => {
        const settings = getAppSettings();
        settings.subscription = sub;
        saveAppSettings(settings);
        setCurrentSubscription(sub);
    };

    const handleSelectPlan = (planId: PlanType) => {
        if (planId === 'trial') {
            activateTrialPlan();
            return;
        }
        setSelectedPlan(planId);
        setStep('payment');
    };

    const activateTrialPlan = () => {
        const newSubscription: Subscription = {
            planId: 'trial',
            status: 'active',
            startDate: Date.now(),
            endDate: Date.now() + (15 * 24 * 60 * 60 * 1000), // 15 Days
            paymentMethod: undefined,
            paymentReference: 'TRIAL-15-DAYS'
        };
        saveSubscription(newSubscription);
        showToast('✅ Prova Gratuita di 15 giorni attivata!', 'success');
        onClose();
    };

    const handlePaymentMethodSelect = (method: PaymentMethod) => {
        setPaymentMethod(method);

        if (method === 'bonifico') {
            setStep('bonifico');
        } else if (method === 'stripe') {
            handleStripePayment();
        } else if (method === 'paypal') {
            handlePayPalPayment();
        }
    };

    const handleStripePayment = async () => {
        if (!selectedPlan) return;

        setIsProcessing(true);
        showToast('🔄 Reindirizzamento a Stripe...', 'info');

        try {
            const settings = getAppSettings();
            const userEmail = settings.restaurantProfile?.email;

            const result = await simpleCheckout(
                selectedPlan as 'basic' | 'pro',
                billingCycle,
                userEmail
            );

            if (!result.success) {
                showToast(`❌ ${result.error || 'Errore durante il checkout'}`, 'error');
            }
            // If successful, user is redirected to Stripe
        } catch (error: any) {
            console.error('Stripe payment error:', error);
            showToast('❌ Errore durante il pagamento. Riprova o usa bonifico.', 'error');
        }

        setIsProcessing(false);
    };

    const handlePayPalPayment = async () => {
        setStep('paypal');
    };

    const handlePayPalConfirm = () => {
        if (!selectedPlan) return;

        const plan = PLANS.find(p => p.id === selectedPlan);
        if (!plan) return;

        const months = billingCycle === 'yearly' ? 12 : 1;

        const newSubscription: Subscription = {
            planId: selectedPlan,
            status: 'pending',
            startDate: Date.now(),
            endDate: Date.now() + (months * 30 * 24 * 60 * 60 * 1000),
            paymentMethod: 'paypal',
            paymentReference: `PP-${Date.now()}`
        };

        saveSubscription(newSubscription);
        setStep('success');
        showToast('✅ Richiesta PayPal inviata! Attendi conferma.', 'success');
    };

    const handleBonificoConfirm = () => {
        if (!selectedPlan) return;

        const plan = PLANS.find(p => p.id === selectedPlan);
        if (!plan) return;

        const months = billingCycle === 'yearly' ? 12 : 1;

        const newSubscription: Subscription = {
            planId: selectedPlan,
            status: 'pending',
            startDate: Date.now(),
            endDate: Date.now() + (months * 30 * 24 * 60 * 60 * 1000),
            paymentMethod: 'bonifico',
            paymentReference: `BON-${Date.now()}`
        };

        saveSubscription(newSubscription);
        setStep('success');
        showToast('✅ Richiesta abbonamento inviata! Attendi conferma bonifico.', 'success');
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
    };

    const getSelectedPlanDetails = () => {
        return PLANS.find(p => p.id === selectedPlan);
    };



    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-5xl max-h-[95vh] rounded-[2rem] border border-slate-700 flex flex-col overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                            <Crown className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">Gestione Abbonamento</h2>
                            <p className="text-slate-400 text-sm">
                                {currentSubscription?.status === 'active'
                                    ? `Piano ${PLANS.find(p => p.id === currentSubscription.planId)?.name} attivo`
                                    : 'Scegli il piano perfetto per te'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Current Subscription Banner */}
                    {currentSubscription && (
                        <div className={`mb-6 p-4 rounded-2xl border ${currentSubscription.status === 'active'
                            ? 'bg-green-900/20 border-green-500/30'
                            : currentSubscription.status === 'pending'
                                ? 'bg-yellow-900/20 border-yellow-500/30'
                                : 'bg-red-900/20 border-red-500/30'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {currentSubscription.status === 'active' ? (
                                        <CheckCircle className="text-green-400" size={24} />
                                    ) : currentSubscription.status === 'pending' ? (
                                        <Clock className="text-yellow-400" size={24} />
                                    ) : (
                                        <AlertCircle className="text-red-400" size={24} />
                                    )}
                                    <div>
                                        <p className="font-bold text-white">
                                            Piano {PLANS.find(p => p.id === currentSubscription.planId)?.name}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            {currentSubscription.status === 'active' && `Scade il ${new Date(currentSubscription.endDate).toLocaleDateString('it-IT')}`}
                                            {currentSubscription.status === 'pending' && 'In attesa di conferma pagamento'}
                                            {currentSubscription.status === 'expired' && 'Abbonamento scaduto'}
                                        </p>
                                    </div>
                                </div>
                                {currentSubscription.status === 'active' && (
                                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase">
                                        Attivo
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step: Select Plan */}
                    {step === 'plans' && (
                        <>
                            {/* Billing Toggle */}
                            <div className="flex justify-center mb-8">
                                <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${billingCycle === 'monthly'
                                            ? 'bg-white text-slate-900'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Mensile
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${billingCycle === 'yearly'
                                            ? 'bg-white text-slate-900'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Annuale
                                        <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                            -17%
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Plans Grid */}
                            <div className="grid md:grid-cols-3 gap-6">
                                {PLANS.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={`relative bg-slate-950 rounded-3xl border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] flex flex-col ${plan.popular
                                            ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]'
                                            : plan.id === 'trial'
                                                ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                                                : 'border-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-wider z-20">
                                                Consigliato
                                            </div>
                                        )}

                                        <div className={`p-8 bg-gradient-to-b ${plan.gradient} bg-opacity-10 relative`}>
                                            <div className="absolute inset-0 bg-black/20"></div>
                                            <div className="relative z-10 flex flex-col items-center text-center">
                                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20 shadow-lg">
                                                    {plan.icon}
                                                </div>
                                                <h3 className="text-3xl font-black text-white tracking-tight mb-2">{plan.name}</h3>
                                                <p className="text-white/80 text-sm font-medium">{plan.description}</p>
                                            </div>
                                        </div>

                                        <div className="p-8 flex-1 flex flex-col">
                                            <div className="mb-8 text-center">
                                                <p className="flex items-baseline justify-center gap-1">
                                                    <span className="text-5xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                                                        {formatPrice(billingCycle === 'yearly' ? plan.priceYearly / 12 : plan.price)}
                                                    </span>
                                                    <span className="text-lg text-slate-500 font-bold">/mese</span>
                                                </p>
                                                {billingCycle === 'yearly' && plan.price > 0 && (
                                                    <p className="text-xs font-bold text-green-400 mt-2 bg-green-500/10 py-1 px-3 rounded-full inline-block">
                                                        Risparmi {formatPrice((plan.price * 12) - plan.priceYearly)} l'anno
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-4 mb-8 flex-1">
                                                {plan.features.map((feature, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 text-sm group">
                                                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.id === 'trial' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-500/20 text-green-400'}`}>
                                                            <CheckCircle size={12} strokeWidth={3} />
                                                        </div>
                                                        <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{feature}</span>
                                                    </div>
                                                ))}
                                                {plan.excludedFeatures?.map((feature, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 text-sm opacity-50">
                                                        <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                                                            <X size={12} className="text-slate-500" />
                                                        </div>
                                                        <span className="text-slate-500 line-through">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => handleSelectPlan(plan.id)}
                                                className={`w-full py-4 rounded-xl font-bold transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-2 ${plan.id === 'trial'
                                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'
                                                    : plan.popular
                                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/20'
                                                        : 'bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-700 hover:border-slate-600'
                                                    }`}
                                            >
                                                {plan.id === 'trial' ? 'Inizia Prova Gratuita' : `Attiva Piano ${plan.name}`}
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </>
                    )}

                    {/* Step: Select Payment Method */}
                    {step === 'payment' && (
                        <div className="max-w-lg mx-auto">
                            <button
                                onClick={() => setStep('plans')}
                                className="text-slate-400 hover:text-white text-sm font-bold mb-6 flex items-center gap-2"
                            >
                                ← Torna ai piani
                            </button>

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-white mb-2">
                                    Scegli metodo di pagamento
                                </h3>
                                <p className="text-slate-400">
                                    Piano {getSelectedPlanDetails()?.name} - {formatPrice(
                                        billingCycle === 'yearly'
                                            ? getSelectedPlanDetails()?.priceYearly || 0
                                            : getSelectedPlanDetails()?.price || 0
                                    )}
                                    {billingCycle === 'yearly' ? '/anno' : '/mese'}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Stripe / Card */}
                                <button
                                    onClick={() => handlePaymentMethodSelect('stripe')}
                                    disabled={isProcessing}
                                    className="w-full p-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 rounded-xl transition-all flex items-center gap-4 group disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                        {isProcessing ? (
                                            <Loader2 className="text-white animate-spin" size={24} />
                                        ) : (
                                            <CreditCard className="text-white" size={24} />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-white">Carta di Credito / Debito</p>
                                        <p className="text-sm text-slate-400">Visa, Mastercard, Amex • Pagamento sicuro via Stripe</p>
                                    </div>
                                    <ArrowRight className="text-slate-500 group-hover:text-blue-400 transition-colors" size={20} />
                                </button>

                                {/* PayPal */}
                                <button
                                    onClick={() => handlePaymentMethodSelect('paypal')}
                                    disabled={isProcessing}
                                    className="w-full p-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-400 rounded-xl transition-all flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-[#003087] rounded-xl flex items-center justify-center">
                                        <span className="text-white font-black text-sm italic">Pay</span><span className="text-[#009cde] font-black text-sm italic">Pal</span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-white">PayPal</p>
                                        <p className="text-sm text-slate-400">Paga in sicurezza con il tuo account PayPal</p>
                                    </div>
                                    <ArrowRight className="text-slate-500 group-hover:text-blue-400 transition-colors" size={20} />
                                </button>

                                {/* Bonifico */}
                                <button
                                    onClick={() => handlePaymentMethodSelect('bonifico')}
                                    disabled={isProcessing}
                                    className="w-full p-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-green-500 rounded-xl transition-all flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                        <Building2 className="text-white" size={24} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-white">Bonifico Bancario</p>
                                        <p className="text-sm text-slate-400">Attivazione dopo verifica (1-2 giorni lavorativi)</p>
                                    </div>
                                    <ArrowRight className="text-slate-500 group-hover:text-green-400 transition-colors" size={20} />
                                </button>
                            </div>

                            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
                                <Shield size={16} />
                                <span>Pagamenti sicuri e crittografati</span>
                            </div>
                        </div>
                    )}

                    {/* Step: Bonifico Details */}
                    {/* Step: PayPal Details */}
                    {step === 'paypal' && (
                        <div className="max-w-lg mx-auto">
                            <button
                                onClick={() => setStep('payment')}
                                className="text-slate-400 hover:text-white text-sm font-bold mb-6 flex items-center gap-2"
                            >
                                ← Torna ai metodi di pagamento
                            </button>

                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-[#003087] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
                                    <span className="text-white font-black text-xl italic">Pay</span><span className="text-[#009cde] font-black text-xl italic">Pal</span>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Paga con PayPal</h3>
                                <p className="text-slate-400">
                                    Invia il pagamento al seguente indirizzo
                                </p>
                            </div>

                            <div className="bg-slate-800 rounded-2xl p-6 space-y-4 border border-slate-700">
                                {/* Importo */}
                                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-center">
                                    <p className="text-sm text-blue-300 mb-1">Importo da inviare</p>
                                    <p className="text-3xl font-black text-white">
                                        {formatPrice(
                                            billingCycle === 'yearly'
                                                ? getSelectedPlanDetails()?.priceYearly || 0
                                                : getSelectedPlanDetails()?.price || 0
                                        )}
                                    </p>
                                </div>

                                {/* PayPal Link/Email */}
                                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Invia a</p>
                                        <p className="text-white font-bold text-lg">{PAYPAL_DETAILS.email}</p>
                                        <p className="text-xs text-blue-400 mt-1">{PAYPAL_DETAILS.link}</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(PAYPAL_DETAILS.email, 'paypal_email')}
                                        className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                                    >
                                        {copied === 'paypal_email' ? (
                                            <Check size={20} className="text-green-400" />
                                        ) : (
                                            <Copy size={20} className="text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-slate-200 shadow-lg w-fit mx-auto">
                                <img src="/paypal-qr.jpg" alt="PayPal QR Code" className="w-48 h-auto rounded-lg" />
                                <p className="text-slate-900 font-bold text-xs mt-2 uppercase tracking-wider flex items-center gap-1">
                                    <QrCode size={12} />
                                    Scansiona per pagare
                                </p>
                            </div>

                            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl flex gap-3">
                                <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-blue-200">
                                    <strong>Istruzioni:</strong> Scansiona il QR Code qui sopra o invia l'importo a <b>{PAYPAL_DETAILS.email}</b>.
                                    Nella nota inserisci: "Abbonamento {getSelectedPlanDetails()?.name}".
                                    Poi clicca il tasto conferma qui sotto.
                                </p>
                            </div>

                            <button
                                onClick={handlePayPalConfirm}
                                className="w-full mt-6 py-4 bg-[#003087] hover:bg-[#00256b] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
                            >
                                <CheckCircle size={20} />
                                Conferma Pagamento Effettuato
                            </button>
                        </div>
                    )}

                    {/* Step: Bonifico Details */}
                    {step === 'bonifico' && (
                        <div className="max-w-lg mx-auto">
                            <button
                                onClick={() => setStep('payment')}
                                className="text-slate-400 hover:text-white text-sm font-bold mb-6 flex items-center gap-2"
                            >
                                ← Torna ai metodi di pagamento
                            </button>

                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Building2 className="text-white" size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Bonifico Bancario</h3>
                                <p className="text-slate-400">
                                    Effettua il bonifico con i dati seguenti
                                </p>
                            </div>

                            <div className="bg-slate-800 rounded-2xl p-6 space-y-4 border border-slate-700">
                                {/* Importo */}
                                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center">
                                    <p className="text-sm text-green-300 mb-1">Importo da pagare</p>
                                    <p className="text-3xl font-black text-white">
                                        {formatPrice(
                                            billingCycle === 'yearly'
                                                ? getSelectedPlanDetails()?.priceYearly || 0
                                                : getSelectedPlanDetails()?.price || 0
                                        )}
                                    </p>
                                </div>

                                {/* Bank Details */}
                                {[
                                    { label: 'Intestatario', value: BANK_DETAILS.intestatario, field: 'intestatario' },
                                    { label: 'IBAN', value: BANK_DETAILS.iban, field: 'iban' },
                                    { label: 'Banca', value: BANK_DETAILS.banca, field: 'banca' },
                                    {
                                        label: 'Causale',
                                        value: BANK_DETAILS.causale
                                            .replace('{PIANO}', getSelectedPlanDetails()?.name || '')
                                            .replace('{RISTORANTE}', getAppSettings().restaurantProfile?.name || 'N/A'),
                                        field: 'causale'
                                    }
                                ].map((item) => (
                                    <div key={item.field} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold">{item.label}</p>
                                            <p className="text-white font-mono text-sm">{item.value}</p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(item.value, item.field)}
                                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                        >
                                            {copied === item.field ? (
                                                <Check size={16} className="text-green-400" />
                                            ) : (
                                                <Copy size={16} className="text-slate-400" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
                                <p className="text-sm text-amber-200">
                                    <strong>Importante:</strong> Dopo aver effettuato il bonifico, clicca "Conferma Bonifico".
                                    L'abbonamento sarà attivato entro 1-2 giorni lavorativi dalla verifica.
                                </p>
                            </div>

                            <button
                                onClick={handleBonificoConfirm}
                                className="w-full mt-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} />
                                Conferma Bonifico Effettuato
                            </button>
                        </div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && (
                        <div className="max-w-lg mx-auto text-center py-12">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                                <CheckCircle className="text-white" size={40} />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4">Richiesta Inviata!</h3>
                            <p className="text-slate-400 mb-8">
                                Abbiamo ricevuto la tua richiesta di abbonamento <strong className="text-white">{getSelectedPlanDetails()?.name}</strong>.
                                <br /><br />
                                Riceverai una email di conferma non appena verificheremo il pagamento.
                            </p>

                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                            >
                                Chiudi
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubscriptionManager;
