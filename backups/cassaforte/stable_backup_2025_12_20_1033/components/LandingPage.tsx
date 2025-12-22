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
  ChefHat
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
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToApp }) => {
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

          <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
            {/* Standard Plan */}
            <div className={`landing-pricing-card bg-slate-900/50 border ${promoConfig ? 'border-purple-500/50' : 'border-slate-700'} relative flex-1 max-w-md overflow-hidden group`}>

              {/* Promo Overlay Elements (Always Visible & Bright) */}
              {/* Promo Overlay Elements (New Flash Box) */}
              {promoConfig && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 w-full max-w-[260px] cursor-pointer group-hover:scale-105 transition-transform duration-300" onClick={() => document.getElementById('pricing')?.scrollIntoView()}>
                  <div className="bg-fuchsia-600 border-4 border-yellow-300 rounded-[2rem] p-5 shadow-[0_10px_40px_rgba(192,38,211,0.5)] text-center transform -rotate-3 hover:rotate-0 transition-all">

                    {/* Yellow Title */}
                    <h3 className="text-yellow-300 font-black uppercase text-sm tracking-widest mb-1 drop-shadow-md">
                      {promoConfig.name}
                    </h3>

                    {/* Promo Cost */}
                    <div className="text-white font-black text-5xl mb-3 drop-shadow-lg tracking-tighter">
                      €{promoConfig.cost}
                    </div>

                    {/* Timer & Info in Blue (White box for contrast) */}
                    <div className="bg-white rounded-xl p-2 mx-auto shadow-inner">
                      <div className="text-blue-500 text-[10px] font-black uppercase tracking-tight leading-tight">OFFERTA LAMPO SCADE IN:</div>
                      <div className="text-blue-700 font-mono font-black text-xl leading-none mt-1">
                        <PromoTimer deadlineHours={promoConfig.deadlineHours || '72'} lastUpdated={promoConfig.lastUpdated || new Date().toISOString()} />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Card Content (Dimmed when Promo Active) */}
              <div className={`transition-all duration-300 ${promoConfig ? 'opacity-40 grayscale-[0.8] blur-[1px]' : ''}`}>
                <div className="landing-pricing-badge">STANDARD</div>
                <div className="landing-pricing-amount text-white">
                  <span className="landing-pricing-currency">€</span>
                  <span className={`landing-pricing-value ${promoConfig ? 'line-through decoration-red-500 decoration-4 text-slate-500' : ''}`}>{displayPrice}</span>
                  <span className="landing-pricing-period">/mese</span>
                </div>
                <div className="landing-pricing-location">PER LOCATION</div>

                <div className="landing-pricing-features space-y-3 my-8">
                  {pricingFeatures.map((feature, index) => (
                    <div key={index} className="landing-pricing-feature flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button className="landing-pricing-cta w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all" onClick={onNavigateToApp}>
                  Attiva Prova di 15 Giorni
                  <ArrowRight className="w-5 h-5 ml-2 inline" />
                </button>
                <p className="landing-pricing-note text-center text-xs text-slate-500 mt-4">
                  Nessuna carta di credito richiesta
                </p>
              </div>
            </div>

            {/* Promo Plan (Active Card) */}
            {promoConfig && (
              <div className="landing-pricing-card bg-gradient-to-b from-purple-900/50 to-slate-900 border border-purple-500/50 relative flex-1 max-w-md shadow-[0_0_30px_rgba(168,85,247,0.15)] transform md:scale-105 z-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 animate-pulse">
                  <Sparkles size={14} /> {promoConfig.name}
                </div>
                <div className="landing-pricing-amount text-white mt-4 flex flex-col items-center">
                  <div className="flex items-baseline justify-center">
                    <span className="landing-pricing-currency text-purple-400">€</span>
                    <span className="landing-pricing-value text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{promoConfig.cost}</span>
                    <span className="landing-pricing-period text-purple-300">/ {promoConfig.duration}</span>
                  </div>
                  {/* Timer Component */}
                  {promoConfig.deadlineHours && promoConfig.lastUpdated && (
                    <div className="mt-2 scale-110">
                      <PromoTimer deadlineHours={promoConfig.deadlineHours} lastUpdated={promoConfig.lastUpdated} />
                    </div>
                  )}
                </div>
                <div className="landing-pricing-location text-purple-400 mt-2">OFFERTA LIMITATA</div>

                <div className="landing-pricing-features space-y-3 my-8">
                  <div className="landing-pricing-feature flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                    <span className="font-bold text-white">Tutte le funzioni Standard</span>
                  </div>
                  <div className="landing-pricing-feature flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                    <span>Priorità Supporto VIP</span>
                  </div>
                  <div className="landing-pricing-feature flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                    <span>Setup Guidato Gratuito</span>
                  </div>
                  <div className="landing-pricing-feature flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                    <span>Accesso Anticipato AI Beta</span>
                  </div>
                </div>

                <button className="landing-pricing-cta w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold transition-all shadow-lg shadow-purple-600/20" onClick={onNavigateToApp}>
                  Richiedi {promoConfig.name}
                  <ArrowRight className="w-5 h-5 ml-2 inline" />
                </button>
                <p className="landing-pricing-note text-center text-xs text-purple-400/60 mt-4">
                  Posti limitati disponibili
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
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
