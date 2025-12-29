import React, { useState, useEffect } from 'react';
import {
  Utensils,
  TrendingUp,
  Zap,
  Shield,
  Brain,
  BarChart3,
  Clock,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Users,
  DollarSign,
  Star,
  LayoutGrid,
  Share2,
  Printer,
  Bell,
  FileText,
  Camera,
  ChefHat,
  Calendar,
  Heart,
  Store
} from 'lucide-react';

// Promo Timer Component
const PromoTimer = ({ deadlineHours, lastUpdated }: { deadlineHours: string, lastUpdated: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadlineHours || !lastUpdated) return;

    const start = new Date(lastUpdated).getTime();
    const durationMs = parseInt(deadlineHours) * 60 * 60 * 1000;
    const end = start + durationMs;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const dist = end - now;

      if (dist < 0) {
        setExpired(true);
        clearInterval(timer);
      } else {
        setTimeLeft({
          h: Math.floor(dist / (1000 * 60 * 60)),
          m: Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((dist % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineHours, lastUpdated]);

  if (expired || !timeLeft) return <div className="text-xs text-red-400 font-bold uppercase mt-2">Offerta Scaduta</div>;

  return (
    <div className="flex items-center justify-center gap-2 mt-2 bg-purple-900/50 rounded-lg py-1 px-3 border border-purple-500/30">
      <Clock size={12} className="text-purple-400" />
      <span className="font-mono text-sm font-bold text-white tracking-widest">
        {String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
      </span>
    </div>
  );
};

import { supabase } from '../services/supabase';

interface LandingPageProps {
  onNavigateToApp: () => void;
  onSelectPlan?: (planId: 'trial' | 'basic' | 'pro') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToApp, onSelectPlan }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roiMonthlyOrders, setRoiMonthlyOrders] = useState(800);
  const [roiMinutesPerOrder, setRoiMinutesPerOrder] = useState(4);
  const [activePolicy, setActivePolicy] = useState<'privacy' | 'cookie' | 'terms' | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Dynamic Pricing State
  const [displayPrice, setDisplayPrice] = useState('59.90'); // Default fallback
  const [promoConfig, setPromoConfig] = useState<any>(null);

  // Fetch Pricing & Promo
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        // Public URL for the JSON file (must be in public bucket 'attachments')
        const { data } = supabase?.storage
          ? supabase.storage.from('attachments').getPublicUrl('global_pricing.json')
          : { data: null };

        if (data?.publicUrl) {
          // Add timestamp to bypass caching
          const res = await fetch(`${data.publicUrl}?t=${Date.now()}`);
          if (res.ok) {
            const json = await res.json();
            if (json.monthlyCost) setDisplayPrice(json.monthlyCost);
            if (json.promo && json.promo.active) {
              setPromoConfig({ ...json.promo, lastUpdated: json.lastUpdated });
            } else {
              setPromoConfig(null);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load dynamic pricing", e);
      }
    };
    fetchPricing();
  }, []);

  const policyContent = {
    privacy: {
      title: "Privacy Policy",
      content: (
        <div className="space-y-4 text-slate-300">
          <p><strong>Ultimo aggiornamento:</strong> 17 Dicembre 2024</p>
          <p>Benvenuto su RistoSync AI. La tua privacy è importante per noi.</p>
          <h3 className="text-white font-bold text-lg mt-4">1. Titolare del Trattamento</h3>
          <p>RistoSync AI ("noi", "ci"). Email: info@ristosyncai.it.</p>
          <h3 className="text-white font-bold text-lg mt-4">2. Dati che Raccogliamo</h3>
          <p>Raccogliamo informazioni per fornire e migliorare il nostro Servizio: dati di registrazione (email, nome ristorante), dati di utilizzo, e dati dei menu caricati.</p>
          <h3 className="text-white font-bold text-lg mt-4">3. Utilizzo dei Dati</h3>
          <p>Utilizziamo i tuoi dati per: fornire il servizio, migliorare l'AI, comunicazione di servizio, e obblighi legali.</p>
          <h3 className="text-white font-bold text-lg mt-4">4. Contatti</h3>
          <p>Per qualsiasi domanda sulla privacy, contattaci a: info@ristosyncai.it</p>
        </div>
      )
    },
    cookie: {
      title: "Cookie Policy",
      content: (
        <div className="space-y-4 text-slate-300">
          <p>RistoSync AI utilizza cookie e tecnologie simili per migliorare l'esperienza utente.</p>
          <h3 className="text-white font-bold text-lg mt-4">Cosa sono i cookie?</h3>
          <p>File di testo salvati sul tuo dispositivo quando visiti un sito web.</p>
          <h3 className="text-white font-bold text-lg mt-4">Tipologie utilizzate</h3>
          <ul className="list-disc pl-5">
            <li><strong>Essenziali:</strong> Necessari per il funzionamento del sito (es. login).</li>
            <li><strong>Analitici:</strong> Per capire come gli utenti usano il sito e migliorarlo.</li>
          </ul>
          <h3 className="text-white font-bold text-lg mt-4">Gestione preferenze</h3>
          <p>Puoi gestire le preferenze dei cookie direttamente dalle impostazioni del tuo browser.</p>
        </div>
      )
    },
    terms: {
      title: "Termini e Condizioni",
      content: (
        <div className="space-y-4 text-slate-300">
          <p>L'utilizzo di RistoSync AI è soggetto ai seguenti termini.</p>
          <h3 className="text-white font-bold text-lg mt-4">1. Accettazione</h3>
          <p>Registrandoti al servizio, accetti questi Termini e Condizioni.</p>
          <h3 className="text-white font-bold text-lg mt-4">2. Il Servizio</h3>
          <p>RistoSync AI è una piattaforma SaaS per la gestione della ristorazione. Il servizio è fornito "così com'è".</p>
          <h3 className="text-white font-bold text-lg mt-4">3. Abbonamenti e Pagamenti</h3>
          <p>Alcune funzionalità richiedono un abbonamento a pagamento. I prezzi sono indicati nella pagina Prezzi.</p>
          <h3 className="text-white font-bold text-lg mt-4">4. Responsabilità</h3>
          <p>Non siamo responsabili per danni indiretti derivanti dall'uso del servizio.</p>
          <h3 className="text-white font-bold text-lg mt-4">5. Legge Applicabile</h3>
          <p>Questi termini sono regolati dalla legge italiana.</p>
        </div>
      )
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const calculateROI = () => {
    const hourlyWage = 18; // €/ora costo medio personale
    const hoursRecovered = (roiMonthlyOrders * roiMinutesPerOrder) / 60;
    const monthlySavings = hoursRecovered * hourlyWage;
    const annualSavings = monthlySavings * 12;
    return {
      monthly: Math.round(monthlySavings),
      annual: Math.round(annualSavings),
      hours: Math.round(hoursRecovered)
    };
  };

  const roi = calculateROI();

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Sync Totale 2.0",
      description: "Modifica un piatto e aggiorna istantaneamente Glovo, Uber Eats, Just Eat e Deliveroo. Sincronizzazione scorte in tempo reale per eliminare gli ordini rifiutati.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI Chef Marketing",
      description: "L'AI scrive descrizioni \"appetitose\" ottimizzate per la vendita e crea automaticamente post social accattivanti dai tuoi nuovi piatti.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Reputation Guard",
      description: "Centralizza Google e TripAdvisor. Il sistema risponde automaticamente alle recensioni positive e ti allerta su quelle critiche con bozze di risposta empatiche.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Business Intelligence",
      description: "Report unificati su vendite, piatti top performer e orari di punta. Prevedi la domanda del weekend grazie all'analisi predittiva.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Utensils className="w-8 h-8" />,
      title: "Menu Digitale QR",
      description: "Menu digitale interattivo con QR code personalizzato. I clienti visualizzano piatti, allergeni e descrizioni AI direttamente dal loro smartphone.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Gestione Ordini",
      description: "Display cucina intelligente con priorità automatica, timer di preparazione e notifiche real-time. Zero errori, massima efficienza.",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const benefits = [
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Risparmia Tempo",
      description: "Fino a 640 ore all'anno recuperate eliminando aggiornamenti manuali su ogni piattaforma"
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Riduci i Costi",
      description: "Nessuna commissione sugli ordini. Nessun costo nascosto. Solo potenza pura."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Migliora il Servizio",
      description: "Ordini sincronizzati in cucina, tempi di preparazione ottimizzati, clienti più soddisfatti"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Aumenta le Vendite",
      description: "Descrizioni AI ottimizzate aumentano il tasso di conversione e il valore medio dell'ordine"
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Proteggi la Reputazione",
      description: "Risposte rapide e professionali alle recensioni mantengono alto il tuo rating"
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Tecnologia AI",
      description: "Intelligenza artificiale all'avanguardia per automatizzare marketing e customer care"
    }
  ];

  const pricingFeatures = [
    "Sync illimitato Delivery",
    "AI Marketing Suite",
    "Reputation Manager",
    "Supporto Prioritario WhatsApp",
    "Business Intelligence",
    "Kitchen Display System",
    "Aggiornamenti automatici",
    "Backup giornaliero dati"
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-container">
          <div className="landing-header-content">
            <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
              <Utensils className="w-8 h-8 text-orange-500 logo-float" />
              <span className="landing-logo-text">
                RISTO<span className="text-orange-500">SYNC</span>
                <span className="landing-logo-subtitle">INTELLIGENCE</span>
              </span>
            </div>

            <nav className={`landing-nav ${mobileMenuOpen ? 'open' : ''}`}>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Piattaforma</a>
              <a href="#roi" onClick={() => setMobileMenuOpen(false)}>Risparmio</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Prezzi</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contatti</a>
            </nav>

            <button className="landing-cta-button" onClick={onNavigateToApp}>
              Accedi alla Piattaforma
            </button>

            <button
              className="landing-mobile-menu-toggle hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>

            <button
              className="md:hidden ml-2 p-2.5 bg-orange-500 rounded-xl shadow-lg logo-float flex items-center justify-center transition-transform active:scale-95"
              onClick={onNavigateToApp}
              aria-label="Accedi all'App"
            >
              <ChefHat className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="landing-hero-content">
            <div className="landing-hero-text">
              <div className="landing-badge">
                <span className="landing-badge-dot"></span>
                VERSIONE 3.0 LIVE
              </div>

              <h1 className="landing-hero-title">
                Il Tuo Ristorante,<br />
                <span className="text-gradient">Perfettamente Sincronizzato.</span>
              </h1>

              <p className="landing-hero-subtitle">
                Dimentica i tablet multipli. Unifica Glovo, Uber Eats, Just Eat e Deliveroo.
                Gestisci tutto da un'unica piattaforma intelligente.
              </p>

              <div className="landing-hero-cta">
                <button className="landing-button-primary" onClick={onNavigateToApp}>
                  <span className="hidden md:inline">Prova Gratis 15 Giorni</span>
                  <span className="md:hidden">Prova Gratis</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <button className="landing-button-secondary hidden md:flex" onClick={() => {
                  document.getElementById('roi')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Calcola il Tuo Risparmio
                </button>
              </div>

              <div className="landing-hero-stats">
                <div className="landing-stat">
                  <div className="landing-stat-value">640h</div>
                  <div className="landing-stat-label">Ore risparmiate/anno</div>
                </div>
                <div className="landing-stat">
                  <div className="landing-stat-value">€11.520</div>
                  <div className="landing-stat-label">Risparmio medio annuo</div>
                </div>
                <div className="landing-stat">
                  <div className="landing-stat-value">0.5s</div>
                  <div className="landing-stat-label">Sync multicanale</div>
                </div>
              </div>
            </div>

            <div className="landing-hero-image hidden md:block">
              <div className="landing-mockup">
                <div className="landing-mockup-header">
                  <div className="landing-mockup-dot red"></div>
                  <div className="landing-mockup-dot yellow"></div>
                  <div className="landing-mockup-dot green"></div>
                </div>
                <div className="landing-mockup-content">
                  <div className="landing-mockup-sidebar">
                    <div className="landing-mockup-menu-item active">
                      <BarChart3 className="w-4 h-4" />
                      <span>Dashboard</span>
                    </div>
                    <div className="landing-mockup-menu-item">
                      <Utensils className="w-4 h-4" />
                      <span>Menu</span>
                    </div>
                    <div className="landing-mockup-menu-item">
                      <TrendingUp className="w-4 h-4" />
                      <span>Analytics</span>
                    </div>
                  </div>
                  <div className="landing-mockup-main">
                    <div className="landing-mockup-chart">
                      <div className="landing-mockup-chart-bars">
                        <div className="landing-mockup-bar bar-animate" style={{ height: '60%', animationDelay: '0s' }}></div>
                        <div className="landing-mockup-bar bar-animate" style={{ height: '80%', animationDelay: '0.1s' }}></div>
                        <div className="landing-mockup-bar bar-animate" style={{ height: '45%', animationDelay: '0.2s' }}></div>
                        <div className="landing-mockup-bar bar-animate" style={{ height: '90%', animationDelay: '0.3s' }}></div>
                        <div className="landing-mockup-bar bar-animate" style={{ height: '70%', animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slogan Strip */}
      <div className="w-full bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 py-6 md:py-8 my-12 relative overflow-hidden shadow-2xl skew-y-[-2deg] transform origin-left">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="landing-container relative z-10 flex items-center justify-center">
          <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-wider text-center drop-shadow-lg skew-y-[2deg]">
            Sincronizza il Gusto, Automatizza il Successo
          </h2>
        </div>
      </div>

      {/* AI Powerhouse Section */}
      <section className="landing-section relative">
        <div className="landing-container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-sm mb-4">
              <Sparkles size={16} /> POTENZIATO DALL'INTELLIGENZA ARTIFICIALE
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Il Tuo Ristorante in <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Autopilot</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Un ecosistema completo che gestisce ogni aspetto del tuo business, dalla cucina al marketing, con la precisione dell'AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 transition-colors group">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="text-purple-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Integrata</h3>
              <p className="text-slate-400 text-sm">Il sistema apprende dalle tue abitudini e ottimizza i processi automaticamente.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-orange-500/50 transition-colors group">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Camera className="text-orange-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Menu Automatico</h3>
              <p className="text-slate-400 text-sm">Inserimento automatizzato dei menu da foto o file CSV/PDF in pochi secondi.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-red-500/50 transition-colors group">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bell className="text-red-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Avvisi Smart</h3>
              <p className="text-slate-400 text-sm">Allarmi in tempo reale per sala e cucina. Coordinamento perfetto, zero attese.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Share2 className="text-blue-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Social Marketing</h3>
              <p className="text-slate-400 text-sm">Creazione e pubblicazione automatica di post sui tuoi canali social.</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-green-500/50 transition-colors group">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LayoutGrid className="text-green-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sync Coordinato</h3>
              <p className="text-slate-400 text-sm">Gestione unificata tra cucina, sala e delivery. Tutti sanno cosa fare.</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-yellow-500/50 transition-colors group">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="text-yellow-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">QR & Menu Digitali</h3>
              <p className="text-slate-400 text-sm">Genera il tuo menu digitale con QR Code aggiornato in tempo reale.</p>
            </div>

            {/* Feature 7 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-cyan-500/50 transition-colors group">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Printer className="text-cyan-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Stampa Menu A4/A5</h3>
              <p className="text-slate-400 text-sm">Esporta e stampa il tuo menu in formati professionali A4 e A5.</p>
            </div>

            {/* Feature 8 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-pink-500/50 transition-colors group">
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="text-pink-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Locandine Delivery</h3>
              <p className="text-slate-400 text-sm">Crea automaticamente flyer accattivanti per promuovere il tuo delivery.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Table Reservations Section */}
      <section className="landing-section bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        <div className="landing-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-sm mb-6">
                <LayoutGrid size={16} /> GESTIONE TAVOLI
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Prenotazioni Tavoli</span><br />
                Semplificate
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                Gestisci le prenotazioni del tuo ristorante con un sistema intuitivo e potente.
                Visualizza la mappa dei tavoli in tempo reale, gestisci gli acconti e tieni traccia
                di ogni dettaglio dei tuoi clienti.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Calendario Intelligente</h4>
                    <p className="text-slate-400 text-sm">Visualizza le prenotazioni per data con indicatori di occupazione in tempo reale</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Database Clienti</h4>
                    <p className="text-slate-400 text-sm">Storico completo con preferenze, allergie e statistiche di visita</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Gestione Acconti</h4>
                    <p className="text-slate-400 text-sm">Traccia pagamenti anticipati con supporto multi-metodo (carta, contanti, bonifico)</p>
                  </div>
                </div>
              </div>
              <button
                className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                onClick={onNavigateToApp}
              >
                Prova la Gestione Tavoli
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Mockup */}
            <div className="order-1 lg:order-2">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Gestione Prenotazioni</h3>
                    <p className="text-slate-400 text-sm">Oggi, 25 Dicembre 2025</p>
                  </div>
                </div>

                {/* Table Grid Mockup */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <div
                      key={num}
                      className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all ${num % 3 === 0
                        ? 'bg-purple-900/30 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                        : num % 2 === 0
                          ? 'bg-yellow-900/30 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                          : 'bg-slate-800 border-slate-700'
                        }`}
                    >
                      <span className="font-black text-white text-lg">{num}</span>
                      {num % 3 === 0 && <span className="text-[10px] text-purple-300 font-bold">Prenotato</span>}
                      {num % 2 === 0 && num % 3 !== 0 && <span className="text-[10px] text-yellow-300 font-bold">A Tavola</span>}
                      {num % 2 !== 0 && num % 3 !== 0 && <span className="text-[10px] text-slate-400 font-bold">Libero</span>}
                    </div>
                  ))}
                </div>

                {/* Reservation List Mockup */}
                <div className="space-y-2">
                  <div className="bg-slate-800 border border-purple-500/50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-black text-sm">3</span>
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">Mario Rossi</div>
                        <div className="text-slate-400 text-xs flex items-center gap-2">
                          <Clock size={10} /> 20:00 • <Users size={10} /> 4 persone
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-900/30 border border-green-500 rounded px-2 py-1 text-xs font-bold text-green-400">
                      €20
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Marketing Section */}
      <section className="landing-section bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(34,197,94,0.1),transparent_50%)]"></div>
        <div className="landing-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual Mockup */}
            <div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">WhatsApp Marketing</h3>
                    <p className="text-slate-400 text-sm">Powered by Meta Business API</p>
                  </div>
                </div>

                {/* Message Composer Mockup */}
                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-4">
                  <div className="text-xs text-slate-400 mb-2">Template Messaggio</div>
                  <div className="bg-slate-800 rounded-lg p-3 mb-3">
                    <p className="text-white text-sm">🎉 Ciao {'{'}{'{'} nome {'}'}{'}'}! Abbiamo una promozione speciale per te...</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-slate-400 text-xs">
                      Seleziona clienti...
                    </div>
                    <button className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors">
                      Invia
                    </button>
                  </div>
                </div>

                {/* Stats Mockup */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-center">
                    <div className="text-green-400 font-black text-xl">156</div>
                    <div className="text-slate-400 text-xs">Inviati</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-center">
                    <div className="text-blue-400 font-black text-xl">142</div>
                    <div className="text-slate-400 text-xs">Letti</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-center">
                    <div className="text-purple-400 font-black text-xl">91%</div>
                    <div className="text-slate-400 text-xs">Tasso</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-sm mb-6">
                <Share2 size={16} /> MARKETING AUTOMATION
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">WhatsApp Marketing</span><br />
                con Meta Business API
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                Raggiungi i tuoi clienti direttamente su WhatsApp con campagne personalizzate.
                Integrazione ufficiale Meta per messaggi professionali, template personalizzabili
                e statistiche in tempo reale.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Template AI-Powered</h4>
                    <p className="text-slate-400 text-sm">Crea messaggi personalizzati con l'aiuto dell'intelligenza artificiale</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Segmentazione Avanzata</h4>
                    <p className="text-slate-400 text-sm">Filtra clienti per città, genere, VIP status e storico visite</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Analytics Dettagliate</h4>
                    <p className="text-slate-400 text-sm">Monitora invii, letture e tassi di risposta delle tue campagne</p>
                  </div>
                </div>
              </div>
              <button
                className="mt-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                onClick={onNavigateToApp}
              >
                Inizia con WhatsApp
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Kitchen & Delivery Coordination Section */}
      <section className="landing-section bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        <div className="landing-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-sm mb-6">
                <Zap size={16} /> COORDINAMENTO TOTALE
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">Sala, Cucina & Delivery</span><br />
                Perfettamente Sincronizzati
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                Coordina tutti i reparti del tuo ristorante in tempo reale. Gli ordini fluiscono
                automaticamente dalla sala alla cucina, con notifiche smart e display dedicati
                per ogni reparto. Zero confusione, massima efficienza.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Display Cucina Intelligente</h4>
                    <p className="text-slate-400 text-sm">Timer automatici, priorità ordini e notifiche real-time per ogni piatto</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Sync Delivery Platforms</h4>
                    <p className="text-slate-400 text-sm">Glovo, Uber Eats, Just Eat e Deliveroo unificati in un'unica dashboard</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Tempi di Preparazione Ottimizzati</h4>
                    <p className="text-slate-400 text-sm">L'AI prevede i tempi di cottura e coordina gli ordini per servizio simultaneo</p>
                  </div>
                </div>
              </div>
              <button
                className="mt-8 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                onClick={onNavigateToApp}
              >
                Scopri il Coordinamento
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Mockup */}
            <div className="order-1 lg:order-2">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Kitchen Display System</h3>
                    <p className="text-slate-400 text-sm">Ordini in tempo reale</p>
                  </div>
                </div>

                {/* Orders Mockup */}
                <div className="space-y-3 mb-4">
                  {/* Order 1 - In Progress */}
                  <div className="bg-orange-900/30 border-2 border-orange-500 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-black text-sm">T5</span>
                        </div>
                        <span className="text-white font-bold">Tavolo 5</span>
                      </div>
                      <div className="flex items-center gap-2 bg-orange-600 px-3 py-1 rounded-full">
                        <Clock size={12} className="text-white" />
                        <span className="text-white text-xs font-bold">8:32</span>
                      </div>
                    </div>
                    <div className="text-slate-300 text-sm">2x Carbonara, 1x Amatriciana</div>
                  </div>

                  {/* Order 2 - Delivery */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                          <TrendingUp size={14} className="text-white" />
                        </div>
                        <span className="text-white font-bold">Glovo #1247</span>
                      </div>
                      <div className="bg-slate-700 px-3 py-1 rounded-full">
                        <span className="text-slate-300 text-xs font-bold">In Attesa</span>
                      </div>
                    </div>
                    <div className="text-slate-400 text-sm">1x Pizza Margherita, 1x Tiramisu</div>
                  </div>

                  {/* Order 3 - Ready */}
                  <div className="bg-green-900/30 border border-green-500 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                          <CheckCircle2 size={14} className="text-white" />
                        </div>
                        <span className="text-white font-bold">Tavolo 2</span>
                      </div>
                      <div className="bg-green-600 px-3 py-1 rounded-full">
                        <span className="text-white text-xs font-bold">Pronto!</span>
                      </div>
                    </div>
                    <div className="text-slate-300 text-sm">3x Lasagne</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Menu Management Section */}
      <section className="landing-section bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="landing-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual Mockup */}
            <div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">AI Menu Manager</h3>
                    <p className="text-slate-400 text-sm">Gestione intelligente del menu</p>
                  </div>
                </div>

                {/* Menu Item Card */}
                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shrink-0">
                      <Utensils className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold mb-1">Carbonara Tradizionale</h4>
                      <p className="text-slate-400 text-xs mb-2 line-clamp-2">
                        Un classico della cucina romana con guanciale croccante, pecorino romano DOP
                        e uova fresche. Cremosa e irresistibile! ✨
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-900/30 border border-blue-500 text-blue-400 text-xs px-2 py-1 rounded">AI Generated</span>
                        <span className="text-green-400 font-bold text-sm">€12.50</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Suggestions */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-bold text-sm">Suggerimenti AI</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-green-400" />
                      <span>Descrizione ottimizzata per vendite (+24%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-green-400" />
                      <span>Prezzo competitivo vs mercato</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={12} className="text-orange-400" />
                      <span>Piatto top performer questa settimana</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-sm mb-6">
                <Brain size={16} /> AI MENU INTELLIGENCE
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-600">Menu Intelligente</span><br />
                Gestito dall'AI
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                L'intelligenza artificiale scrive descrizioni appetitose che vendono, ottimizza i prezzi
                in base al mercato e suggerisce modifiche per massimizzare i profitti. Il tuo menu
                diventa uno strumento di vendita automatico.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Descrizioni AI Ottimizzate</h4>
                    <p className="text-slate-400 text-sm">L'AI scrive testi persuasivi che aumentano le conversioni del 24%</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Analisi Performance Piatti</h4>
                    <p className="text-slate-400 text-sm">Scopri quali piatti vendono di più e ottimizza il menu in tempo reale</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Pricing Intelligente</h4>
                    <p className="text-slate-400 text-sm">Suggerimenti automatici sui prezzi basati su costi, concorrenza e domanda</p>
                  </div>
                </div>
              </div>
              <button
                className="mt-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                onClick={onNavigateToApp}
              >
                Prova l'AI Menu
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Digital & Print Menu Section */}
      <section className="landing-section bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.1),transparent_50%)]"></div>
        <div className="landing-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual Mockup */}
            <div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Menu Digitale & Cartaceo</h3>
                    <p className="text-slate-400 text-sm">Sempre aggiornato in tempo reale</p>
                  </div>
                </div>

                {/* QR Code Mockup */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* QR Code Card */}
                  <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-4">
                    <div className="aspect-square bg-white rounded-lg mb-3 flex items-center justify-center">
                      <div className="w-24 h-24 bg-slate-900 rounded grid grid-cols-3 gap-1 p-2">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-900'} rounded-sm`}></div>
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-400 font-bold text-xs mb-1">QR Menu</div>
                      <div className="text-slate-400 text-[10px]">Scansiona e ordina</div>
                    </div>
                  </div>

                  {/* Print Menu Preview */}
                  <div className="bg-slate-950 border border-slate-700 rounded-xl p-4">
                    <div className="aspect-square bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg mb-3 flex flex-col items-center justify-center p-3">
                      <Printer className="w-8 h-8 text-orange-400 mb-2" />
                      <div className="space-y-1 w-full">
                        <div className="h-1 bg-slate-700 rounded w-full"></div>
                        <div className="h-1 bg-slate-700 rounded w-3/4"></div>
                        <div className="h-1 bg-slate-700 rounded w-full"></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-orange-400 font-bold text-xs mb-1">Menu A4</div>
                      <div className="text-slate-400 text-[10px]">Pronto per stampa</div>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-purple-400" />
                      <span>Aggiornamento automatico in tempo reale</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-purple-400" />
                      <span>QR code personalizzato per ogni tavolo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-purple-400" />
                      <span>Export PDF professionale A4/A5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-sm mb-6">
                <FileText size={16} /> MENU SEMPRE AGGIORNATO
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Menu Digitale & QR</span><br />
                Sempre Sincronizzato
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                Modifica il menu una volta e aggiorna automaticamente il QR code digitale e i menu
                cartacei. I tuoi clienti vedono sempre prezzi e piatti aggiornati, senza ristampe
                costose o QR code obsoleti.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">QR Code Intelligente</h4>
                    <p className="text-slate-400 text-sm">Menu digitale interattivo con foto, allergeni e descrizioni AI</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Stampa Professionale</h4>
                    <p className="text-slate-400 text-sm">Export PDF ottimizzato per stampa in formato A4 e A5</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Sync Istantaneo</h4>
                    <p className="text-slate-400 text-sm">Ogni modifica si riflette immediatamente su tutti i canali</p>
                  </div>
                </div>
              </div>
              <button
                className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                onClick={onNavigateToApp}
              >
                Crea il Tuo Menu
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Marketing Section */}
      <section className="landing-section bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(236,72,153,0.1),transparent_50%)]"></div>
        <div className="landing-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 font-bold text-sm mb-6">
                <Share2 size={16} /> SOCIAL AUTOMATION
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-600">Social Media Marketing</span><br />
                Automatizzato dall'AI
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                L'AI crea post accattivanti per i tuoi piatti e li pubblica automaticamente su
                Facebook e Instagram. Foto professionali, descrizioni persuasive e hashtag
                ottimizzati per massimizzare l'engagement.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Post AI-Generated</h4>
                    <p className="text-slate-400 text-sm">Testi creativi e coinvolgenti scritti dall'intelligenza artificiale</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Foto Ottimizzate</h4>
                    <p className="text-slate-400 text-sm">Immagini dei piatti ottimizzate per i social con filtri automatici</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">Pubblicazione Automatica</h4>
                    <p className="text-slate-400 text-sm">Pianifica e pubblica su Facebook e Instagram con un click</p>
                  </div>
                </div>
              </div>
              <button
                className="mt-8 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                onClick={onNavigateToApp}
              >
                Inizia il Marketing
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Mockup */}
            <div className="order-1 lg:order-2">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">AI Social Manager</h3>
                    <p className="text-slate-400 text-sm">Creazione post automatica</p>
                  </div>
                </div>

                {/* Social Post Preview */}
                <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden mb-4">
                  {/* Post Header */}
                  <div className="p-4 flex items-center gap-3 border-b border-slate-700">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">Il Tuo Ristorante</div>
                      <div className="text-slate-400 text-xs">Sponsorizzato • 2h fa</div>
                    </div>
                  </div>

                  {/* Post Image */}
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src="/carbonara-dish.png"
                      alt="Carbonara dish"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded">
                      AI Generated
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-4">
                    <p className="text-white text-sm mb-3">
                      🍝 Carbonara come una volta! Guanciale croccante, pecorino DOP e uova fresche
                      per un piatto che conquista al primo assaggio. Vieni a provare la vera tradizione romana! ✨
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="text-pink-400 text-xs">#Carbonara</span>
                      <span className="text-pink-400 text-xs">#CucinaRomana</span>
                      <span className="text-pink-400 text-xs">#Foodie</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 text-xs">
                      <div className="flex items-center gap-1">
                        <Heart size={14} className="text-pink-500" />
                        <span>247</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 size={14} />
                        <span>18 condivisioni</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Publishing Options */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <Share2 size={14} className="text-white" />
                    </div>
                    <div>
                      <div className="text-blue-400 font-bold text-xs">Facebook</div>
                      <div className="text-slate-400 text-[10px]">Connesso</div>
                    </div>
                  </div>
                  <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-3 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-600 to-purple-600 rounded flex items-center justify-center">
                      <Camera size={14} className="text-white" />
                    </div>
                    <div>
                      <div className="text-pink-400 font-bold text-xs">Instagram</div>
                      <div className="text-slate-400 text-[10px]">Connesso</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-section" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Floating Elements */}
        <div className="floating-element" style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '100px',
          height: '100px',
          background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite',
          zIndex: 0
        }}></div>
        <div className="floating-element" style={{
          position: 'absolute',
          top: '60%',
          right: '10%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse',
          zIndex: 0
        }}></div>
        <div className="floating-element" style={{
          position: 'absolute',
          bottom: '20%',
          left: '15%',
          width: '80px',
          height: '80px',
          background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '2s',
          zIndex: 0
        }}></div>

        <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="landing-section-header">
            <h2 className="landing-section-title">Tutto in Unico Hub</h2>
            <p className="landing-section-subtitle">
              La tecnologia enterprise resa semplice per il tuo locale.
            </p>
          </div>

          <div className="landing-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="landing-feature-card">
                <div className={`landing-feature-icon bg-gradient-to-br ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sync Showcase Section */}
      <section className="landing-sync-showcase">
        <div className="landing-container">
          <div className="sync-showcase-content">
            <div className="sync-showcase-text">
              <h2 className="sync-showcase-title">
                <span className="text-gradient">Menu Intelligence.</span><br />
                Controllo Totale.
              </h2>
              <p className="sync-showcase-description">
                Analizza le performance di ogni piatto in tempo reale.
                Scopri quali ingredienti ti costano di più, ottimizza i prezzi e massimizza i profitti
                con la nostra dashboard AI avanzata.
              </p>
              <div className="sync-showcase-stats">
                <div className="sync-stat">
                  <div className="sync-stat-value">+24%</div>
                  <div className="sync-stat-label">Margine Medio</div>
                </div>
                <div className="sync-stat">
                  <div className="sync-stat-value">AI</div>
                  <div className="sync-stat-label">Previsioni Vendite</div>
                </div>
                <div className="sync-stat">
                  <div className="sync-stat-value">360°</div>
                  <div className="sync-stat-label">Visione Business</div>
                </div>
              </div>
            </div>
            <div className="sync-showcase-image">
              <img
                src="/menu-analytics.png"
                alt="RistoSync Menu Analytics Dashboard"
                className="sync-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="landing-section landing-section-dark">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Perché RistoSync AI?</h2>
            <p className="landing-section-subtitle">
              Vantaggi concreti per il tuo ristorante
            </p>
          </div>

          <div className="landing-benefits-grid">
            {benefits.map((benefit, index) => (
              <div key={index} className="landing-benefit-card">
                <div className="landing-benefit-icon">
                  {benefit.icon}
                </div>
                <h3 className="landing-benefit-title">{benefit.title}</h3>
                <p className="landing-benefit-description">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section id="roi" className="landing-section hidden md:block">
        <div className="landing-container">
          <div className="landing-roi-container">
            <div className="landing-roi-calculator">
              <h2 className="landing-roi-title">Calcolatore ROI</h2>
              <p className="landing-roi-subtitle">
                Inserisci i tuoi dati attuali e scopri l'impatto economico dell'automazione.
              </p>

              <div className="landing-roi-input-group">
                <label className="landing-roi-label">
                  Ordini Mensili
                  <span className="landing-roi-value">{roiMonthlyOrders}</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={roiMonthlyOrders}
                  onChange={(e) => setRoiMonthlyOrders(Number(e.target.value))}
                  className="landing-roi-slider"
                />
              </div>

              <div className="landing-roi-input-group">
                <label className="landing-roi-label">
                  Minuti Persi / Ordine
                  <span className="landing-roi-value">{roiMinutesPerOrder} min</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={roiMinutesPerOrder}
                  onChange={(e) => setRoiMinutesPerOrder(Number(e.target.value))}
                  className="landing-roi-slider"
                />
              </div>

              <p className="landing-roi-note">
                *Basato su costo orario medio di €18,00
              </p>
            </div>

            <div className="landing-roi-results">
              <div className="landing-roi-results-header">
                RISPARMIO ANNUALE STIMATO
              </div>
              <div className="landing-roi-results-amount">
                €{roi.annual.toLocaleString()}
              </div>
              <div className="landing-roi-results-detail">
                {roi.hours} ore di lavoro recuperate
              </div>
              <button className="landing-roi-cta" onClick={onNavigateToApp}>
                Inizia a Risparmiare
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="landing-section landing-section-dark">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Un Prezzo, Tutto Incluso.</h2>
            <p className="landing-section-subtitle">
              Nessuna commissione sugli ordini. Nessun costo nascosto. Solo potenza pura.
            </p>
          </div>


          {/* PRICING GRID */}
          <div className="flex flex-col lg:flex-row gap-6 justify-center items-stretch mt-8">

            {/* PLAN 1: TRIAL (PROVA) */}
            <div className="landing-pricing-card bg-slate-900 border-2 border-indigo-500/30 flex flex-col p-8 rounded-3xl hover:border-indigo-500 transition-colors">
              <div className="mb-4">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-3">
                  <Zap className="text-indigo-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Prova Gratuita</h3>
                <p className="text-slate-400 text-sm">Per provare senza impegno.</p>
              </div>

              <div className="mb-6">
                <p className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">Gratis</span>
                </p>
                <p className="text-sm text-indigo-400 font-bold mt-1">Per 15 giorni</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-indigo-500 shrink-0" /> Tutte le funzionalità
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-indigo-500 shrink-0" /> Menu Digitale
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-indigo-500 shrink-0" /> Nessuna Carta Richiesta
                </li>
              </ul>
            </div>

            {/* PLAN 2: BASIC */}
            <div className="landing-pricing-card bg-slate-900 border-2 border-slate-700 flex flex-col p-8 rounded-3xl hover:border-slate-500 transition-colors relative">
              <div className="mb-4">
                <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center mb-3">
                  <Store className="text-slate-300" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Basic</h3>
                <p className="text-slate-400 text-sm">L'essenziale per partire.</p>
              </div>

              <div className="mb-6">
                <p className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">€ 49,90</span>
                  <span className="text-sm text-slate-400">/mese</span>
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" /> Menu Digitale Illimitato
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" /> Gestione Ordini & Tavoli
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" /> Statistiche Base
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-500 line-through decoration-slate-600">
                  <X size={16} className="text-slate-600 shrink-0" /> Marketing WhatsApp
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-500 line-through decoration-slate-600">
                  <X size={16} className="text-slate-600 shrink-0" /> AI Assistant
                </li>
              </ul>
            </div>

            {/* PLAN 3: PRO (RECOMMENDED) */}
            <div className="landing-pricing-card bg-slate-900 border-2 border-purple-500 flex flex-col p-8 rounded-3xl transform md:-translate-y-4 shadow-2xl shadow-purple-900/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                Consigliato / AI
              </div>

              <div className="mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3 shadow-lg">
                  <Sparkles className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Pro AI</h3>
                <p className="text-purple-200 text-sm">La suite completa con AI.</p>
              </div>

              <div className="mb-6">
                <p className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">€ 99,90</span>
                  <span className="text-sm text-slate-400">/mese</span>
                </p>
                <p className="text-xs text-green-400 mt-2 font-bold flex items-center gap-1">
                  <TrendingUp size={12} /> ROI stimato: 10x
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-white font-bold">
                  <div className="bg-purple-500/20 p-1 rounded-full"><CheckCircle2 size={14} className="text-purple-400" /></div> Tutto incluso nel Basic
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-purple-500 shrink-0" /> WhatsApp Marketing Auto
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-purple-500 shrink-0" /> Menu Intelligence AI
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-purple-500 shrink-0" /> Analisi Food Cost AI
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-purple-500 shrink-0" /> Supporto Prioritario VIP
                </li>
              </ul>
            </div>
          </div>

          {/* SINGLE CTA BUTTON */}
          <div className="max-w-3xl mx-auto mt-12 text-center">
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-3xl p-8 backdrop-blur-md">
              <h3 className="text-2xl font-black text-white mb-4">Inizia Oggi Gratuitamente</h3>
              <p className="text-slate-300 mb-6 max-w-xl mx-auto">
                Registrando il tuo ristorante accederai automaticamente al piano <strong className="text-white">Free Trial (15 giorni)</strong>.
                Al termine della prova potrai scegliere il piano più adatto a te (Basic o Pro AI).
                Riceverai email di conferma dopo la registrazione.
              </p>
              <button
                onClick={() => onSelectPlan?.('trial') || onNavigateToApp()}
                className="w-full md:w-auto px-12 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/20 transition-all hover:scale-105 flex items-center justify-center gap-3 mx-auto"
              >
                <Zap size={24} />
                Attiva Prova 15 Giorni
              </button>
              <p className="text-xs text-slate-500 mt-4">Nessuna carta di credito richiesta per iniziare.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Hai Domande?</h2>
            <p className="landing-section-subtitle">
              Il nostro team è qui per aiutarti
            </p>
          </div>

          <div className="landing-contact-grid">
            <div className="landing-contact-card">
              <Mail className="w-8 h-8 text-orange-500" />
              <h3 className="landing-contact-title">Email</h3>
              <p className="landing-contact-detail">info@ristosyncai.it</p>
              <a href="mailto:info@ristosyncai.it" className="landing-contact-link">
                Invia Email <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="landing-contact-card">
              <Phone className="w-8 h-8 text-orange-500" />
              <h3 className="landing-contact-title">WhatsApp</h3>
              <p className="landing-contact-detail">Supporto Prioritario</p>
              <a href="#" className="landing-contact-link">
                Contattaci <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="landing-contact-card">
              <MapPin className="w-8 h-8 text-orange-500" />
              <h3 className="landing-contact-title">Demo</h3>
              <p className="landing-contact-detail">Prenota una dimostrazione</p>
              <button className="landing-contact-link" onClick={onNavigateToApp}>
                Richiedi Demo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-content flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="landing-footer-brand">
              <Utensils className="w-6 h-6 text-orange-500 logo-float" />
              <span className="landing-footer-logo">
                RISTO<span className="text-orange-500">SYNC</span> AI
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
              <div className="flex gap-6 text-sm text-slate-400">
                <button onClick={() => setActivePolicy('privacy')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0 text-slate-400 text-sm">Privacy Policy</button>
                <button onClick={() => setActivePolicy('cookie')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0 text-slate-400 text-sm">Cookie Policy</button>
                <button onClick={() => setActivePolicy('terms')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0 text-slate-400 text-sm">Termini e Condizioni</button>
              </div>
              <p className="landing-footer-text">
                © 2024 RistoSync Intelligence. Tutti i diritti riservati.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Install PWA Banner */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-lg flex items-center justify-between z-50 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Utensils className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Installa App</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Accesso Rapido</p>
          </div>
        </div>
        <button onClick={() => alert("Per installare: \n1. Premi Condividi (iOS) o Menu (Android)\n2. Premi 'Aggiungi a Schermata Home'")} className="bg-white text-slate-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
          Installa
        </button>
      </div>

      {/* Policy Modal */}
      {activePolicy && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setActivePolicy(null)}>
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md p-6 border-b border-slate-800 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-white">{policyContent[activePolicy].title}</h2>
              <button
                onClick={() => setActivePolicy(null)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 md:p-8">
              {policyContent[activePolicy].content}
            </div>
            <div className="p-6 border-t border-slate-800 bg-slate-900/50">
              <button onClick={() => setActivePolicy(null)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors">
                Ho Capito
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .landing-page {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          color: #fff;
          background: #0a0a0a;
        }

        /* Header */
        .landing-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .landing-header.scrolled {
          background: rgba(10, 10, 10, 0.95);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .landing-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .landing-section {
          padding: 100px 0;
          position: relative;
        }

        .landing-section-dark {
          background: #050505;
        }

        .landing-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
        }

        .landing-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .landing-logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .landing-logo-subtitle {
          font-size: 0.6rem;
          font-weight: 500;
          color: #888;
          letter-spacing: 2px;
        }

        .landing-nav {
          display: flex;
          gap: 2rem;
        }

        .landing-nav a {
          color: #ccc;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s ease;
        }

        .landing-nav a:hover {
          color: #ff6b35;
        }

        .landing-cta-button {
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .landing-cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(255, 107, 53, 0.4);
        }

        .landing-mobile-menu-toggle {
          display: none;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }

        /* Hero Section */
        .landing-hero {
          padding: 120px 0 80px;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
          position: relative;
          overflow: hidden;
        }

        .landing-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 50%, rgba(255, 107, 53, 0.1) 0%, transparent 50%);
        }

        .landing-hero-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .landing-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 107, 53, 0.1);
          border: 1px solid rgba(255, 107, 53, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #ff6b35;
          margin-bottom: 1.5rem;
        }

        .landing-badge-dot {
          width: 8px;
          height: 8px;
          background: #ff6b35;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .landing-hero-title {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -1px;
        }

        .text-gradient {
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .landing-hero-subtitle {
          font-size: 1.25rem;
          color: #aaa;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .landing-hero-cta {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .landing-button-primary {
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .landing-button-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(255, 107, 53, 0.4);
        }

        .landing-button-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .landing-button-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .landing-hero-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .landing-stat {
          text-align: left;
        }

        .landing-stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #ff6b35;
          margin-bottom: 0.25rem;
        }

        .landing-stat-label {
          font-size: 0.875rem;
          color: #888;
        }

        /* Mockup */
        .landing-mockup {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .landing-mockup-header {
          background: #0f0f1e;
          padding: 0.75rem 1rem;
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .landing-mockup-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .landing-mockup-dot.red { background: #ff5f56; }
        .landing-mockup-dot.yellow { background: #ffbd2e; }
        .landing-mockup-dot.green { background: #27c93f; }

        .landing-mockup-content {
          display: flex;
          height: 400px;
        }

        .landing-mockup-sidebar {
          width: 200px;
          background: rgba(0, 0, 0, 0.2);
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .landing-mockup-menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: #888;
          transition: all 0.2s ease;
        }

        .landing-mockup-menu-item.active {
          background: rgba(255, 107, 53, 0.1);
          color: #ff6b35;
        }

        .landing-mockup-main {
          flex: 1;
          padding: 2rem;
        }

        .landing-mockup-chart {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 2rem;
          height: 100%;
          display: flex;
          align-items: flex-end;
        }

        .landing-mockup-chart-bars {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          width: 100%;
          height: 100%;
        }

        .landing-mockup-bar {
          flex: 1;
          background: linear-gradient(to top, #ff6b35, #f7931e);
          border-radius: 8px 8px 0 0;
        }

        .bar-animate {
          animation: growBar 1s ease-out, barBounce 2s ease-in-out 1s infinite;
        }

        @keyframes growBar {
          from { height: 0; }
        }

        @keyframes barBounce {
          0%, 100% { 
            transform: scaleY(1);
            transform-origin: bottom;
          }
          50% { 
            transform: scaleY(0.85);
            transform-origin: bottom;
          }
        }

        /* Logo Float Animation */
        .logo-float {
          animation: logoFloat 3s ease-in-out infinite;
        }

        @keyframes logoFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        /* Floating Elements Animation */
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }

        /* Sections */
        .landing-section {
          padding: 80px 0;
        }

        .landing-section-dark {
          background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
        }

        .landing-section-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .landing-section-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .landing-section-subtitle {
          font-size: 1.25rem;
          color: #aaa;
        }

        /* Features Grid - 3x3 on desktop */
        .landing-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        @media (max-width: 1024px) {
          .landing-features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .landing-features-grid {
            grid-template-columns: 1fr;
          }
        }

        .landing-feature-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 2rem;
          transition: all 0.3s ease;
        }

        .landing-feature-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255, 107, 53, 0.3);
          box-shadow: 0 12px 40px rgba(255, 107, 53, 0.2);
        }

        .landing-feature-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: white;
        }

        .landing-feature-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .landing-feature-description {
          color: #aaa;
          line-height: 1.6;
        }

        /* Dashboard Showcase */
        .landing-dashboard-showcase {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
        }

        .dashboard-image {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 24px;
          transition: transform 0.3s ease;
        }

        .landing-dashboard-showcase:hover .dashboard-image {
          transform: scale(1.02);
        }

        .dashboard-glow {
          position: absolute;
          inset: -50%;
          background: radial-gradient(circle, rgba(255, 107, 53, 0.3) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .landing-dashboard-showcase:hover .dashboard-glow {
          opacity: 1;
        }

        /* Floating Elements */
        .floating-elements {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .floating-icon {
          position: absolute;
          animation: float 6s ease-in-out infinite;
        }

        /* Sync Showcase Section */
        .landing-sync-showcase {
          padding: 100px 0;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
          position: relative;
          overflow: hidden;
        }

        .landing-sync-showcase::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%);
          animation: pulse 4s ease-in-out infinite;
        }

        .sync-showcase-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .sync-showcase-title {
          font-size: 3rem;
          font-weight: 900;
          line-height: 1.2;
          margin-bottom: 1.5rem;
        }

        .sync-showcase-description {
          font-size: 1.125rem;
          color: #aaa;
          line-height: 1.8;
          margin-bottom: 2.5rem;
        }

        .sync-showcase-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .sync-stat {
          text-align: left;
        }

        .sync-stat-value {
          font-size: 2.5rem;
          font-weight: 900;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
        }

        .sync-stat-label {
          font-size: 0.875rem;
          color: #888;
          line-height: 1.4;
        }

        .sync-showcase-image {
          position: relative;
        }

        .sync-image {
          width: 100%;
          height: auto;
          border-radius: 24px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
          animation: float 8s ease-in-out infinite;
        }

        @media (max-width: 1024px) {
          .sync-showcase-content {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .sync-showcase-title {
            font-size: 2.5rem;
          }

          .sync-showcase-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 640px) {
          .sync-showcase-stats {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .sync-showcase-title {
            font-size: 2rem;
          }
        }

        /* Benefits Grid */
        .landing-benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .landing-benefit-card {
          display: flex;
          gap: 1rem;
        }

        .landing-benefit-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 107, 53, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff6b35;
          flex-shrink: 0;
        }

        .landing-benefit-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .landing-benefit-description {
          color: #aaa;
          line-height: 1.6;
        }

        /* ROI Calculator */
        .landing-roi-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 3rem;
        }

        .landing-roi-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .landing-roi-subtitle {
          color: #aaa;
          margin-bottom: 2rem;
        }

        .landing-roi-input-group {
          margin-bottom: 2rem;
        }

        .landing-roi-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .landing-roi-value {
          color: #ff6b35;
        }

        .landing-roi-slider {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          -webkit-appearance: none;
        }

        .landing-roi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          cursor: pointer;
        }

        .landing-roi-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          cursor: pointer;
          border: none;
        }

        .landing-roi-note {
          font-size: 0.875rem;
          color: #888;
          font-style: italic;
        }

        .landing-roi-results {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 3rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .landing-roi-results-header {
          font-size: 0.875rem;
          font-weight: 600;
          color: #888;
          letter-spacing: 2px;
          margin-bottom: 1rem;
        }

        .landing-roi-results-amount {
          font-size: 4rem;
          font-weight: 900;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
        }

        .landing-roi-results-detail {
          color: #4ade80;
          font-size: 1.125rem;
          margin-bottom: 2rem;
        }

        .landing-roi-cta {
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: transform 0.2s ease;
        }

        .landing-roi-cta:hover {
          transform: translateY(-2px);
        }

        /* Pricing */
        .landing-pricing-card {
          max-width: 600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 3rem;
          text-align: center;
        }

        .landing-pricing-badge {
          display: inline-block;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 2rem;
        }

        .landing-pricing-amount {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .landing-pricing-currency {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 1rem;
        }

        .landing-pricing-value {
          font-size: 5rem;
          font-weight: 900;
          line-height: 1;
        }

        .landing-pricing-period {
          font-size: 1.5rem;
          color: #888;
          margin-top: 2rem;
        }

        .landing-pricing-location {
          color: #888;
          font-size: 0.875rem;
          margin-bottom: 2rem;
        }

        .landing-pricing-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .landing-pricing-feature {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .landing-pricing-cta {
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          border: none;
          padding: 1.25rem 2.5rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1.125rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          transition: transform 0.2s ease;
        }

        .landing-pricing-cta:hover {
          transform: translateY(-2px);
        }

        .landing-pricing-note {
          font-size: 0.875rem;
          color: #888;
        }

        /* Contact */
        .landing-contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }

        .landing-contact-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .landing-contact-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255, 107, 53, 0.3);
        }

        .landing-contact-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
        }

        .landing-contact-detail {
          color: #aaa;
          margin-bottom: 1rem;
        }

        .landing-contact-link {
          color: #ff6b35;
          text-decoration: none;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          transition: gap 0.2s ease;
        }

        .landing-contact-link:hover {
          gap: 0.75rem;
        }

        /* Footer */
        .landing-footer {
          background: #000;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2rem 0;
        }

        .landing-footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .landing-footer-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .landing-footer-logo {
          font-size: 1.125rem;
          font-weight: 800;
        }

        .landing-footer-text {
          color: #888;
          font-size: 0.875rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .landing-nav {
            display: none;
          }

          .landing-nav.open {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(10, 10, 10, 0.98);
            padding: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .landing-mobile-menu-toggle {
            display: none;
          }

          .landing-cta-button {
            display: none;
          }

          .landing-hero-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .landing-hero-title {
            font-size: 2.5rem;
          }

          .landing-hero-cta {
            flex-direction: column;
          }

          .landing-hero-stats {
            grid-template-columns: 1fr;
          }

          .landing-roi-container {
            grid-template-columns: 1fr;
          }

          .landing-pricing-features {
            grid-template-columns: 1fr;
          }

          .landing-footer-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }

        /* Narrow Screen / iPhone Fixes */
        @media (max-width: 430px) {
          .landing-hero-title {
            font-size: 1.75rem;
            line-height: 1.2;
          }
          .landing-container {
            padding: 0 12px;
          }
          .landing-pricing-value {
             font-size: 3.5rem;
          }
          .landing-logo-text {
             font-size: 1rem;
          }
          .landing-hero-subtitle {
            font-size: 1rem;
          }
          .landing-section-title {
            font-size: 1.75rem;
          }
          .landing-section-subtitle {
            font-size: 0.95rem;
          }
          .landing-feature-card {
            padding: 1.25rem;
          }
          .landing-benefit-card {
            padding: 1.25rem;
          }
          .landing-roi-container {
            padding: 1.5rem;
            gap: 1.5rem;
          }
          .landing-pricing-card {
            padding: 2rem;
          }
          .landing-hero {
            padding: 100px 0 60px;
          }
        }

        /* Float Animation */
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }

        .logo-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
