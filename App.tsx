import React, { useState, useEffect, useMemo, useRef } from 'react';
import KitchenDisplay from './components/KitchenDisplay';
import DeliveryManager from './components/DeliveryManager';
import WaiterPad from './components/WaiterPad';
import AuthScreen from './components/AuthScreen';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import DigitalMenu from './components/DigitalMenu';
import MessagesPanel from './components/MessagesPanel';
import CustomDialog from './components/CustomDialog';
import Toast from './components/Toast';
import WelcomeModal from './components/WelcomeModal';
import MarketingPanel from './components/MarketingPanel';
import WhatsAppManager from './components/WhatsAppManager';
import WhatsAppSettings from './components/WhatsAppSettings';
import PrintableMenu from './components/PrintableMenu';
import DeliveryFlyer from './components/DeliveryFlyer';
import PlatformEditModal from './components/PlatformEditModal';
import TableMonitor from './components/TableMonitor';
import ReservationManager from './components/ReservationManager';
import CustomerManager from './components/CustomerManager';
import SubscriptionManager from './components/SubscriptionManager';
import { LandingPage } from './components/LandingPage';
import { ChefHat, Smartphone, User, Settings, Bell, Utensils, X, Save, Plus, Trash2, Edit2, Wheat, Milk, Egg, Nut, Fish, Bean, Flame, Leaf, Info, LogOut, Bot, Key, Database, ShieldCheck, Lock, AlertTriangle, Mail, RefreshCw, Send, Printer, Mic, MicOff, TrendingUp, BarChart3, Calendar, ChevronLeft, ChevronRight, DollarSign, History, Receipt, UtensilsCrossed, Eye, ArrowRight, QrCode, Share2, Copy, MapPin, Store, Phone, Globe, Star, Pizza, CakeSlice, Wine, Sandwich, MessageCircle, FileText, PhoneCall, Sparkles, Loader, Facebook, Instagram, Youtube, Linkedin, Music, Compass, FileSpreadsheet, Image as ImageIcon, Upload, FileImage, ExternalLink, CreditCard, Banknote, Briefcase, Clock, Check, ListPlus, ArrowRightLeft, Code2, Cookie, Shield, Wrench, Download, CloudUpload, BookOpen, EyeOff, LayoutGrid, ArrowLeft, PlayCircle, ChevronDown, FileJson, Wallet, Crown, Zap, ShieldCheck as ShieldIcon, Trophy, Timer, LifeBuoy, Minus, Hash, Euro, TrendingDown, Package, Factory, Users, Lightbulb, Headphones, Cloud, BarChart, Camera, CheckCircle, Scan, Megaphone, Bike } from 'lucide-react';
import { getWaiterName, saveWaiterName, getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem, getNotificationSettings, saveNotificationSettings, initSupabaseSync, getGoogleApiKey, saveGoogleApiKey, removeGoogleApiKey, getAppSettings, saveAppSettings, getOrders, deleteHistoryByDate, performFactoryReset, deleteAllMenuItems, importDemoMenu } from './services/storageService';
import { supabase, signOut, isSupabaseConfigured, SUPER_ADMIN_EMAIL } from './services/supabase';
import { ToastProvider, useToast } from './components/ToastProvider';

import { askChefAI, generateRestaurantAnalysis, generateDishDescription, generateDishIngredients, generateRestaurantDescription, detectAllergensFromIngredients } from './services/geminiService';
import { MenuItem, Category, Department, AppSettings, OrderStatus, Order, RestaurantProfile, OrderItem, NotificationSettings, SocialLinks, DeliveryPlatform } from './types';
import { useDialog } from './hooks/useDialog';
import QRCodeGenerator from 'react-qr-code';
import Tesseract from 'tesseract.js';
import Papa from 'papaparse';

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

    if (expired || !timeLeft) return <div className="text-[10px] text-red-500 font-bold uppercase mt-1">Offerta Scaduta</div>;

    return (
        <div className="flex items-center gap-1.5 mt-1 bg-purple-900/50 rounded-md py-1 px-2 border border-purple-500/30 w-fit">
            <Clock size={10} className="text-purple-400" />
            <span className="font-mono text-xs font-bold text-white tracking-widest">
                {String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
            </span>
        </div>
    );
};

const ADMIN_CATEGORY_ORDER = [
    Category.MENU_COMPLETO,
    Category.ANTIPASTI,
    Category.PANINI,
    Category.PIZZE,
    Category.PRIMI,
    Category.SECONDI,
    Category.DOLCI,
    Category.BEVANDE
];

const ALLERGENS_CONFIG = [
    { id: 'Glutine', icon: Wheat, label: 'Glutine' },
    { id: 'Latticini', icon: Milk, label: 'Latticini' },
    { id: 'Uova', icon: Egg, label: 'Uova' },
    { id: 'Frutta a guscio', icon: Nut, label: 'Noci' },
    { id: 'Pesce', icon: Fish, label: 'Pesce' },
    { id: 'Soia', icon: Bean, label: 'Soia' },
    { id: 'Piccante', icon: Flame, label: 'Piccante' },
    { id: 'Vegano', icon: Leaf, label: 'Vegano' },
];

export function App() {
    // ROUTING FOR DIGITAL MENU (Public Access)
    const queryParams = new URLSearchParams(window.location.search);
    const publicMenuId = queryParams.get('menu');
    const showLandingParam = queryParams.get('landing');

    // Landing Page State
    const showMonitorParam = queryParams.get('monitor');

    // Landing Page State
    // Default to Landing Page (true) unless accessing a public menu, monitor mode, or explicitly disabled
    const [showLandingPage, setShowLandingPage] = useState(!publicMenuId && !showMonitorParam && showLandingParam !== 'false');

    const [session, setSession] = useState<any>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [isSuspended, setIsSuspended] = useState(false);
    const [isBanned, setIsBanned] = useState(false);
    const [accountDeleted, setAccountDeleted] = useState(false);
    const [subscriptionExpired, setSubscriptionExpired] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

    const [role, setRole] = useState<'kitchen' | 'pizzeria' | 'pub' | 'waiter' | 'delivery' | null>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [showMonitor, setShowMonitor] = useState(showMonitorParam === 'true');
    const [showReservations, setShowReservations] = useState(false);
    const [waiterNameInput, setWaiterNameInput] = useState('');

    // Restaurant Info
    const [restaurantName, setRestaurantName] = useState('Ristorante');
    const [globalDefaultCost, setGlobalDefaultCost] = useState('49.00');
    const [promoData, setPromoData] = useState<any>(null);

    // Admin State
    const [showAdmin, setShowAdmin] = useState(false);
    const [adminTab, setAdminTab] = useState<'profile' | 'subscription' | 'menu' | 'notif' | 'info' | 'ai' | 'analytics' | 'share' | 'receipts' | 'messages' | 'marketing' | 'delivery' | 'customers' | 'whatsapp'>('menu');
    const [showWhatsAppManager, setShowWhatsAppManager] = useState(false);
    const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
    const [adminViewMode, setAdminViewMode] = useState<'dashboard' | 'app'>('dashboard');

    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

    // Menu Manager State
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<MenuItem>>({});
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isGeneratingIngr, setIsGeneratingIngr] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bulkInputRef = useRef<HTMLInputElement>(null);
    const bulkImagesRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);

    // Profile AI State
    const [isGeneratingBio, setIsGeneratingBio] = useState(false);
    const [isListeningBio, setIsListeningBio] = useState(false);

    // Analytics State
    const [ordersForAnalytics, setOrdersForAnalytics] = useState<Order[]>([]);


    const [selectedDate, setSelectedDate] = useState(new Date());
    const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Delete Confirmation State
    const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

    // Settings State
    const [notifSettings, setNotifSettings] = useState<NotificationSettings>({ kitchenSound: true, waiterSound: true, pushEnabled: false });

    // App Settings (Destinations)
    const [appSettings, setAppSettingsState] = useState<AppSettings>(getAppSettings());
    const [tempDestinations, setTempDestinations] = useState<Record<Category, Department>>(getAppSettings().categoryDestinations);
    const [tempPrintSettings, setTempPrintSettings] = useState<Record<string, boolean>>(getAppSettings().printEnabled);
    const [hasUnsavedDestinations, setHasUnsavedDestinations] = useState(false);

    // Profile Settings State
    const [profileForm, setProfileForm] = useState<RestaurantProfile>({});

    const [apiKeyInput, setApiKeyInput] = useState('');
    const [hasApiKey, setHasApiKey] = useState(!!getGoogleApiKey());
    const [chatQuery, setChatQuery] = useState('');
    const [chatResponse, setChatResponse] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    // Dynamic Admin Config (Global)
    const [adminContactEmail, setAdminContactEmail] = useState('info@ristosyncai.it');
    const [adminIban, setAdminIban] = useState('IT73W0623074792000057589384');
    const [adminHolder, setAdminHolder] = useState('Massimo Castro');
    const [adminPhone, setAdminPhone] = useState('3478127440');

    const isSuperAdmin = session?.user?.email === SUPER_ADMIN_EMAIL;

    // Custom Dialog Hook
    const { dialogState, showConfirm, showDelete, showAlert, showSuccess, closeDialog } = useDialog();

    // Toast State
    const [toastState, setToastState] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
        isOpen: false,
        message: '',
        type: 'info'
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastState({ isOpen: true, message, type });
    };

    const closeToast = () => {
        setToastState(prev => ({ ...prev, isOpen: false }));
    };

    // Welcome Modal State
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    // Printable Menu State
    const [showPrintableMenu, setShowPrintableMenu] = useState(false);
    const [showDeliveryFlyer, setShowDeliveryFlyer] = useState(false);

    // Platform Editing State
    const [editingPlatform, setEditingPlatform] = useState<DeliveryPlatform | null>(null);
    const [isNewPlatform, setIsNewPlatform] = useState(false);

    // Payment Instruction Modal State
    const [showPaymentModal, setShowPaymentModal] = useState<{ isOpen: boolean; plan: string; price: string } | null>(null);

    const openPaymentInstructions = (plan: string, price: string) => {
        setShowPaymentModal({ isOpen: true, plan, price });
        document.getElementById('bank-details')?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- USE EFFECTS ---

    useEffect(() => {
        if (session?.user?.id) {
            const fetchUnread = async () => {
                if (!supabase) return;
                // 1. Direct Messages Unread Count (User is recipient)
                const { count: directCount } = await supabase.from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('recipient_id', session.user.id)
                    .eq('is_read', false);

                // 2. Broadcasts (Fetch all to filter locally)
                const { data: broadcasts } = await supabase.from('messages')
                    .select('id')
                    .is('recipient_id', null);

                let broadcastCount = 0;
                if (broadcasts) {
                    const hidden = JSON.parse(localStorage.getItem('hidden_messages') || '[]');
                    const read = JSON.parse(localStorage.getItem('read_broadcasts') || '[]');

                    broadcastCount = broadcasts.filter(m =>
                        !hidden.includes(m.id) && !read.includes(m.id)
                    ).length;
                }
                setUnreadMessagesCount((directCount || 0) + broadcastCount);
            };

            fetchUnread();

            // Subscribe to realtime changes (All messages visible to user)
            const channel = supabase
                .channel('public:messages:count')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                    fetchUnread();
                })
                .subscribe();

            window.addEventListener('messages:updated', fetchUnread);

            return () => {
                supabase.removeChannel(channel);
                window.removeEventListener('messages:updated', fetchUnread);
            };
        }
    }, [session]);

    useEffect(() => {
        if (publicMenuId) { setLoadingSession(false); return; }
        if (!supabase) { setLoadingSession(false); return; }

        const timer = setTimeout(() => { setLoadingSession((prev: boolean) => { if (prev) return false; return prev; }); }, 5000);

        const checkUserStatus = async (user: any) => {
            try {
                const { data, error } = await supabase.from('profiles').select('restaurant_name, subscription_status, settings').eq('id', user.id).single();

                // Carica configurazione globale dal Super Admin
                try {
                    const { data: adminData } = await supabase.from('profiles').select('settings').eq('email', 'castro.massimo@yahoo.com').single();
                    if (adminData?.settings?.globalConfig?.defaultCost) {
                        setGlobalDefaultCost(adminData.settings.globalConfig.defaultCost);
                    }
                    if (adminData?.settings?.globalConfig?.promo && adminData.settings.globalConfig.promo.active) {
                        setPromoData({ ...adminData.settings.globalConfig.promo, lastUpdated: adminData.settings.globalConfig.lastUpdated || new Date().toISOString() });
                    } else {
                        setPromoData(null);
                    }
                } catch (err) {
                    console.log('Could not load global config');
                }

                // Se profilo non esiste nel DB, blocca
                if (error || !data) {
                    setIsSuspended(true);
                    setIsBanned(false);
                    return false;
                }

                // ========== LOGICA SEMPLIFICATA ==========
                // Solo 3 stati: active, suspended, banned

                // 1. BANNED = Bloccato permanente
                if (data.subscription_status === 'banned') {
                    setIsBanned(true);
                    setIsSuspended(false);
                    return false;
                }

                // 2. SUSPENDED = Bloccato dall'admin, mostra schermata pagamento
                if (data.subscription_status === 'suspended') {
                    setIsSuspended(true);
                    setIsBanned(false);
                    return false;
                }

                // 3. ACTIVE = Controlla scadenza
                const plan = data.settings?.restaurantProfile?.planType;
                const expiry = data.settings?.restaurantProfile?.subscriptionEndDate;
                const userPrefs = data.settings?.restaurantProfile?.userPreferences;

                // Welcome Modal
                if (!userPrefs?.termsAccepted && !userPrefs?.dontShowWelcomeAgain) {
                    setShowWelcomeModal(true);
                }

                // Piano Free/Demo = sempre attivo
                if (plan === 'Free' || plan === 'Demo') {
                    setDaysRemaining(null);
                    setSubscriptionExpired(false);
                    setIsSuspended(false);
                    if (data.restaurant_name) setRestaurantName(data.restaurant_name);
                    return true;
                }

                // Controllo scadenza
                if (expiry) {
                    const expiryDate = new Date(expiry);
                    expiryDate.setHours(23, 59, 59, 999);
                    const now = new Date();
                    const diffTime = expiryDate.getTime() - now.getTime();
                    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setDaysRemaining(days);

                    // SCADUTO = Blocca con schermata pagamento
                    if (diffTime < 0 && user.email !== SUPER_ADMIN_EMAIL) {
                        setSubscriptionExpired(true);
                        setIsSuspended(true);
                        return false;
                    }
                }

                // Tutto ok, accesso consentito
                if (data.restaurant_name) setRestaurantName(data.restaurant_name);
                setIsSuspended(false);
                setIsBanned(false);
                setSubscriptionExpired(false);
                return true;

            } catch (e) {
                console.error('Error checking user status:', e);
                setIsSuspended(true);
                return false;
            }
        };

        supabase.auth.getSession().then(async ({ data: { session } }: any) => {
            if (session) {
                const isActive = await checkUserStatus(session.user);
                if (isActive) { setSession(session); initSupabaseSync(); } else { setSession(session); }
            } else { setSession(null); }
            setLoadingSession(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            if (session) { checkUserStatus(session.user); setSession(session); initSupabaseSync(); }
            else { setSession(null); setIsSuspended(false); setIsBanned(false); }
            setLoadingSession(false);
        });

        const handleStorageQuota = () => {
            showToast("⚠️ Memoria dispositivo piena! Le immagini occupano troppo spazio.", 'error');
        };
        window.addEventListener('storage-quota-exceeded', handleStorageQuota);

        return () => {
            clearTimeout(timer);
            subscription.unsubscribe();
            window.removeEventListener('storage-quota-exceeded', handleStorageQuota);
        };
    }, [publicMenuId]);

    useEffect(() => {
        const fetchGlobalSettings = async () => {
            if (!supabase) return;
            try {
                const { data: adminProfile } = await supabase
                    .from('profiles')
                    .select('settings')
                    .eq('email', SUPER_ADMIN_EMAIL)
                    .single();

                if (adminProfile?.settings?.globalConfig) {
                    const config = adminProfile.settings.globalConfig;
                    if (config.contactEmail) setAdminContactEmail(config.contactEmail);
                    if (config.bankDetails) {
                        if (config.bankDetails.iban) setAdminIban(config.bankDetails.iban);
                        if (config.bankDetails.holder) setAdminHolder(config.bankDetails.holder);
                    }
                    if (config.supportContact?.phone) setAdminPhone(config.supportContact.phone);
                }
            } catch (e) { console.error("Error fetching global settings", e); }
        };

        if (showAdmin) {
            setMenuItems(getMenuItems());
            setNotifSettings(getNotificationSettings());
            fetchGlobalSettings();
            const currentSettings = getAppSettings();
            setAppSettingsState(currentSettings);
            setTempDestinations(currentSettings.categoryDestinations || { [Category.MENU_COMPLETO]: 'Cucina', [Category.ANTIPASTI]: 'Cucina', [Category.PANINI]: 'Pub', [Category.PIZZE]: 'Pizzeria', [Category.PRIMI]: 'Cucina', [Category.SECONDI]: 'Cucina', [Category.DOLCI]: 'Cucina', [Category.BEVANDE]: 'Sala' });
            setTempPrintSettings(currentSettings.printEnabled || { 'Cucina': false, 'Pizzeria': false, 'Pub': false, 'Sala': false, 'Cassa': false });

            if (currentSettings.restaurantProfile) {
                setProfileForm(currentSettings.restaurantProfile);
            }
            setOrdersForAnalytics(getOrders());
            const key = getGoogleApiKey();
            if (key) setApiKeyInput(key);
        }
    }, [showAdmin]);

    // --- ACTIONS ---


    const checkRoleAccess = async (selectedRole: string) => {
        // Enforce strict state separation: Clear Monitor state when entering a role
        setShowMonitor(false);
        // Clear URL param if present to prevent auto-reopen on reload
        const url = new URL(window.location.href);
        if (url.searchParams.has('monitor')) {
            window.history.pushState({}, '', window.location.pathname);
        }

        // --- BASIC PLAN RESTRICTION ---
        const plan = (appSettings.restaurantProfile?.planType || '').toLowerCase();
        const isBasic = plan.includes('basic');
        const restrictedRoles = ['kitchen', 'pizzeria', 'pub', 'delivery'];

        if (isBasic && restrictedRoles.includes(selectedRole)) {
            const allowed = appSettings.restaurantProfile?.allowedDepartment;

            if (allowed) {
                // If already set, check if it matches
                if (allowed !== selectedRole) {
                    showToast(`⛔ Il piano Basic include solo il reparto: ${allowed.toUpperCase()}. Passa a PRO per sbloccare tutto.`, 'error');
                    return;
                }
            } else {
                // Not set yet, ask for confirmation to lock it
                const confirmLock = await showConfirm(
                    '🔒 Attenzione: Piano Basic',
                    `Il piano Basic permette l'uso di UN SOLO reparto. \n\nVuoi attivare "${selectedRole.toUpperCase()}" come reparto unico? \nQuesta scelta è permanente.`
                );

                if (!confirmLock) return;

                // Save choice
                const updatedProfile = { ...appSettings.restaurantProfile, allowedDepartment: selectedRole as any };
                const newSettings = { ...appSettings, restaurantProfile: updatedProfile };

                setAppSettingsState(newSettings);
                setProfileForm(updatedProfile); // Helper state
                await saveAppSettings(newSettings);

                showToast(`✅ Reparto ${selectedRole.toUpperCase()} attivato con successo!`, 'success');
            }
        }
        // -----------------------------

        if (selectedRole === 'kitchen') setRole('kitchen');
        else if (selectedRole === 'pizzeria') setRole('pizzeria');
        else if (selectedRole === 'pub') setRole('pub');
        else if (selectedRole === 'delivery') setRole('delivery');
        else if (selectedRole === 'waiter') {
            const storedName = getWaiterName();
            if (storedName) setRole('waiter');
            else setShowLogin(true);
        }
    };

    const handleAdminAuth = () => {
        if (session) setShowAdmin(true);
    };

    const handleWelcomeAccept = async (preferences: { termsAccepted: boolean; cookiesAccepted: boolean; privacyAccepted: boolean; dontShowAgain: boolean }) => {
        try {
            if (!supabase || !session) return;

            // Get current settings
            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('settings')
                .eq('id', session.user.id)
                .single();

            const updatedSettings = {
                ...currentProfile?.settings,
                restaurantProfile: {
                    ...currentProfile?.settings?.restaurantProfile,
                    userPreferences: {
                        termsAccepted: preferences.termsAccepted,
                        cookiesAccepted: preferences.cookiesAccepted,
                        privacyAccepted: preferences.privacyAccepted,
                        welcomeModalShown: true,
                        dontShowWelcomeAgain: preferences.dontShowAgain
                    }
                }
            };

            // Update profile with preferences
            await supabase
                .from('profiles')
                .update({ settings: updatedSettings })
                .eq('id', session.user.id);

            setShowWelcomeModal(false);
            showToast('✅ Benvenuto! Inizia a esplorare RistoSync AI', 'success');
        } catch (error) {
            console.error('Error saving preferences:', error);
            showToast('Errore nel salvataggio delle preferenze', 'error');
        }
    };

    const handleSocialChange = (network: keyof SocialLinks, value: string) => {
        setProfileForm((prev: RestaurantProfile) => ({
            ...prev,
            socials: {
                ...prev.socials,
                [network]: value
            }
        }));
    };

    // --- MENU MANAGEMENT ---
    const handleSaveItem = () => {
        if (!editingItem.name || !editingItem.price) return;

        const itemToSave: MenuItem = {
            id: editingItem.id || Date.now().toString(),
            name: editingItem.name,
            price: parseFloat(editingItem.price.toString()),
            category: editingItem.category || Category.ANTIPASTI,
            description: editingItem.description || '',
            ingredients: editingItem.ingredients || '',
            allergens: editingItem.allergens || [],
            image: editingItem.image,
            isCombo: editingItem.category === Category.MENU_COMPLETO,
            comboItems: editingItem.comboItems || [],
            specificDepartment: editingItem.specificDepartment
        };

        if (isEditingItem && editingItem.id) {
            updateMenuItem(itemToSave);
        } else {
            addMenuItem(itemToSave);
        }

        setMenuItems(getMenuItems());
        setEditingItem({});
        setIsEditingItem(false);
    };

    const confirmDelete = async (item: MenuItem) => {
        const confirmed = await showConfirm(
            "Elimina Piatto",
            `Sei sicuro di voler eliminare "${item.name}"? Questa azione non può essere annullata.`
        );
        if (confirmed) {
            deleteMenuItem(item.id);
            setMenuItems(getMenuItems());
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600; // Reduced from 1024 for stability
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    setEditingItem((prev: Partial<MenuItem>) => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.5) }));
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const SIZE = 400; // Logo size 400x400
                    canvas.width = SIZE;
                    canvas.height = SIZE;
                    const ctx = canvas.getContext('2d');
                    // Center crop for square logo
                    const minDim = Math.min(img.width, img.height);
                    const sx = (img.width - minDim) / 2;
                    const sy = (img.height - minDim) / 2;
                    ctx?.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE);
                    setProfileForm((prev: RestaurantProfile) => ({ ...prev, logo: canvas.toDataURL('image/png', 0.9) }));
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBulkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files) as File[];
        let updatedCount = 0;
        const currentMenu = getMenuItems();
        let hasUpdates = false;
        const menuMap = new Map();
        currentMenu.forEach((item, index) => { menuMap.set(item.name.toLowerCase().trim().replace(/[-_]/g, ' '), index); });

        for (const file of files) {
            const cleanName = file.name.split('.')[0].toLowerCase().trim().replace(/[-_]/g, ' ');
            if (menuMap.has(cleanName)) {
                const index = menuMap.get(cleanName);
                const reader = new FileReader();
                await new Promise((resolve) => {
                    reader.onload = (evt) => {
                        const img = new Image();
                        img.src = evt.target?.result as string;
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 600; let width = img.width; let height = img.height;
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                            canvas.width = width; canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            const resizedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                            currentMenu[index].image = resizedBase64;
                            updateMenuItem(currentMenu[index]);
                            updatedCount++; hasUpdates = true; resolve(null);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
        if (hasUpdates) { setMenuItems(getMenuItems()); showToast(`✅ Associate ${updatedCount} immagini ai piatti!`, 'success'); } else { showToast("⚠️ Nessuna immagine corrispondeva ai nomi dei piatti.", 'error'); }
    };

    // AI Smart Import State
    const smartInputRef = useRef<HTMLInputElement>(null);
    const [isSmartScanning, setIsSmartScanning] = useState(false);

    // --- SMART IMPORT HANDLER ---
    const handleSmartImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSmartScanning(true);
        showToast("🤖 Analisi AI (Avanzata) in corso... attendere...", "info");

        try {
            let extractedItems: any[] = [];

            // 1. Image (OCR via Tesseract.js)
            if (file.type.startsWith('image/')) {
                const result = await Tesseract.recognize(
                    file,
                    'ita',
                    // { logger: m => console.log(m) }
                );

                // Block-based parsing (Better for columns/cards)
                // We assume each "Pizza/Item" is grouped visually in a paragraph/block
                const blocks = result.data.blocks || [];

                if (blocks.length > 0) {
                    blocks.forEach((block: any) => {
                        const blockText = block.text.trim();
                        if (!blockText) return;

                        // Match Price (European format 14,00 or 14.00, optional €)
                        // Regex looks for "digits + [.,] + digits" at end of line or string
                        const priceRegex = /(\d{1,3}[.,]\d{2})\s*€?/;
                        const priceMatch = blockText.match(priceRegex);

                        if (priceMatch) {
                            const priceVal = parseFloat(priceMatch[1].replace(',', '.'));

                            // Remove price from text
                            let cleanText = blockText.replace(priceMatch[0], '').replace('€', '').trim();

                            // Split remaining text into lines
                            const lines = cleanText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

                            if (lines.length > 0) {
                                const name = lines[0]; // First line is usually Title
                                const description = lines.slice(1).join(' '); // Rest is desc

                                // Filters
                                if (name.length > 3 && priceVal > 0) {
                                    extractedItems.push({
                                        name: name,
                                        price: priceVal,
                                        category: 'Pizze Speciali', // Default for this import
                                        description: description,
                                        ingredients: description // Often desc contains ingredients
                                    });
                                }
                            }
                        }
                    });
                } else {
                    // Fallback to line-based if blocks fail
                    console.log("No blocks found, falling back to lines.");
                    const lines = result.data.text.split('\n');
                    // ... (Simple line logic would go here, but blocks are preferred)
                }
            }
            // 2. CSV / Excel (via PapaParse)
            else if (file.type.includes('csv') || file.type.includes('excel') || file.name.toLowerCase().endsWith('.csv')) {
                Papa.parse(file, {
                    complete: (results) => {
                        if (results.data && Array.isArray(results.data)) {
                            results.data.forEach((row: any) => {
                                if (Array.isArray(row) && row.length >= 2) {
                                    const name = row[0];
                                    const priceStr = String(row[1]).replace(/[€\s]/g, '').replace(',', '.');
                                    const price = parseFloat(priceStr);
                                    const cat = row[2] || 'Nuovi Arrivi';

                                    if (name && !isNaN(price)) {
                                        extractedItems.push({
                                            name: name,
                                            price: price,
                                            category: cat,
                                            description: row[3] || 'Importato da CSV'
                                        });
                                    }
                                }
                            });
                            finalizeSmartImport(extractedItems);
                        }
                    },
                    header: false
                });
                return; // Papa is async, finalize called inside
            } else {
                showToast("Formato file non supportato. Usa Immagini o CSV.", "error");
                setIsSmartScanning(false);
                return;
            }

            // Finalize Image Import
            if (extractedItems.length > 0) {
                finalizeSmartImport(extractedItems);
            } else {
                showToast("⚠️ Nessun piatto riconosciuto. Prova una foto più chiara.", "error");
                setIsSmartScanning(false);
            }

        } catch (err) {
            console.error(err);
            showToast("Errore analisi.", "error");
            setIsSmartScanning(false);
        } finally {
            if (smartInputRef.current) smartInputRef.current.value = '';
        }
    };

    const finalizeSmartImport = (items: any[]) => {
        let count = 0;
        items.forEach(item => {
            const newItem: MenuItem = {
                id: Date.now().toString() + Math.random().toString().slice(2, 5),
                name: item.name,
                price: item.price,
                category: (Object.values(Category).includes(item.category) ? item.category : Category.ANTIPASTI) as Category,
                description: item.description || '',
                ingredients: item.ingredients || '',
                allergens: []
            };
            addMenuItem(newItem);
            count++;
        });
        setMenuItems(getMenuItems());
        setIsSmartScanning(false);
        showToast(`✅ Importati ${count} piatti con successo!`, "success");
    };

    const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target?.result as string);
                    if (Array.isArray(data)) {
                        data.forEach((item: any) => {
                            if (item.name && item.price && item.category) {
                                addMenuItem({
                                    id: Date.now().toString() + Math.random(),
                                    name: item.name,
                                    price: parseFloat(item.price),
                                    category: item.category,
                                    description: item.description,
                                    ingredients: item.ingredients,
                                    allergens: item.allergens || [],
                                    image: item.image,
                                    isCombo: item.category === Category.MENU_COMPLETO,
                                    comboItems: item.comboItems || [],
                                    specificDepartment: item.specificDepartment
                                });
                            }
                        });
                        setMenuItems(getMenuItems());
                        showToast(`Importati ${data.length} piatti!`);
                    }
                } catch (err) { showToast("Errore nel file JSON"); }
            };
            reader.readAsText(file);
        }
    };

    const exportMenu = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(menuItems, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "menu_ristosync.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const generateDesc = async () => {
        if (!editingItem.name) return;
        setIsGeneratingDesc(true);
        const desc = await generateDishDescription(editingItem.name, editingItem.ingredients || '');
        if (desc) setEditingItem((prev: Partial<MenuItem>) => ({ ...prev, description: desc }));
        setIsGeneratingDesc(false);
    };

    const generateIngr = async () => {
        if (!editingItem.name) return;
        setIsGeneratingIngr(true);

        // Genera ingredienti
        const ingr = await generateDishIngredients(editingItem.name);

        if (ingr) {
            // Rileva automaticamente allergeni dagli ingredienti
            const detectedAllergens = await detectAllergensFromIngredients(ingr);

            // Aggiorna sia ingredienti che allergeni
            setEditingItem((prev: Partial<MenuItem>) => ({
                ...prev,
                ingredients: ingr,
                allergens: detectedAllergens
            }));

            // Mostra toast con allergeni rilevati
            if (detectedAllergens.length > 0) {
                showToast(`✅ Rilevati ${detectedAllergens.length} allergeni: ${detectedAllergens.join(', ')}`, 'success');
            }
        }

        setIsGeneratingIngr(false);
    };

    // Debounce timer per rilevamento allergeni
    const allergensDetectionTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Handler per cambio ingredienti manuale con rilevamento allergeni automatico
    const handleIngredientsChange = async (newIngredients: string) => {
        // Aggiorna subito gli ingredienti
        setEditingItem((prev: Partial<MenuItem>) => ({ ...prev, ingredients: newIngredients }));

        // Cancella il timer precedente
        if (allergensDetectionTimerRef.current) {
            clearTimeout(allergensDetectionTimerRef.current);
        }

        // Imposta nuovo timer per rilevare allergeni dopo 500ms di inattività
        if (newIngredients.trim().length > 0) {
            allergensDetectionTimerRef.current = setTimeout(async () => {
                const detectedAllergens = await detectAllergensFromIngredients(newIngredients);
                setEditingItem((prev: Partial<MenuItem>) => ({
                    ...prev,
                    allergens: detectedAllergens
                }));
            }, 500);
        }
    };

    // --- PROFILE AI & MIC HANDLERS ---
    const handleGenerateBio = async () => {
        if (!profileForm.name) {
            showToast("Inserisci prima il nome del ristorante.");
            return;
        }
        setIsGeneratingBio(true);
        const bio = await generateRestaurantDescription(profileForm.name);
        if (bio) setProfileForm((prev: RestaurantProfile) => ({ ...prev, description: bio }));
        setIsGeneratingBio(false);
    };

    const handleMicBio = () => {
        if (!('webkitSpeechRecognition' in window)) {
            showToast("Il tuo browser non supporta il riconoscimento vocale. Usa Chrome.");
            return;
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListeningBio(true);
        recognition.onend = () => setIsListeningBio(false);
        recognition.onerror = () => setIsListeningBio(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                setProfileForm((prev: RestaurantProfile) => ({ ...prev, description: (prev.description ? prev.description + ' ' : '') + transcript }));
            }
        };
        recognition.start();
    };

    // --- TABLE COUNT MANAGER ---
    const handleUpdateTableCount = async (increment: number) => {
        const current = appSettings.restaurantProfile?.tableCount || 12;
        const newCount = Math.max(1, current + increment);
        const newSettings = { ...appSettings, restaurantProfile: { ...appSettings.restaurantProfile, tableCount: newCount } };
        setAppSettingsState(newSettings);
        setProfileForm((prev: RestaurantProfile) => ({ ...prev, tableCount: newCount }));
        await saveAppSettings(newSettings);
    };

    // --- ANALYTICS METRICS ---
    const handleGenerateAnalysis = async () => {
        if (ordersForAnalytics.length === 0) { setAiAnalysisResult("Nessun dato disponibile per questa data."); return; }
        setIsAnalyzing(true);

        // Gather real analytics data
        const topDishes = analyticsData?.topItems?.map((item: [string, number]) => item[0]) || [];
        const bottomDishes = analyticsData?.bottomItems?.map((item: [string, number]) => item[0]) || [];

        const stats = {
            totalRevenue: analyticsData?.revenue || 0,
            totalItems: analyticsData?.totalDishes || 0,
            avgWait: analyticsData?.avgWaitTime || 0,
            topDishes: topDishes.slice(0, 5),
            bottomDishes: bottomDishes.slice(0, 3),
            totalOrders: analyticsData?.totalOrders || 0,
            avgOrderValue: analyticsData?.avgOrder || 0,
            foodCost: analyticsData?.foodCost || 0
        };
        const result = await generateRestaurantAnalysis(stats, selectedDate.toLocaleDateString());
        setAiAnalysisResult(result);
        setIsAnalyzing(false);
    };

    const analyticsData = useMemo(() => {
        const dailyOrders = ordersForAnalytics.filter(o => {
            const d = new Date(o.createdAt || o.timestamp);
            return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear() && o.status === OrderStatus.DELIVERED;
        });
        const revenue = dailyOrders.reduce((acc: number, o: Order) => acc + o.items.reduce((sum: number, i: OrderItem) => sum + (i.menuItem.price * i.quantity), 0), 0);
        const totalDishes = dailyOrders.reduce((acc: number, o: Order) => acc + o.items.reduce((sum: number, i: OrderItem) => sum + i.quantity, 0), 0);
        const avgOrder = dailyOrders.length ? (revenue / dailyOrders.length) : 0;

        // Food Cost Estimates (32% of revenue)
        const foodCost = revenue * 0.32;

        // Average Wait Time (from order creation to delivery)
        let totalWaitMinutes = 0;
        let deliveredCount = 0;
        dailyOrders.forEach((o: Order) => {
            if (o.status === OrderStatus.DELIVERED && o.createdAt && o.timestamp) {
                const waitMs = o.timestamp - o.createdAt;
                if (waitMs > 0 && waitMs < 24 * 60 * 60 * 1000) { // Sanity check: less than 24 hours
                    totalWaitMinutes += waitMs / 60000;
                    deliveredCount++;
                }
            }
        });
        const avgWaitTime = deliveredCount > 0 ? Math.round(totalWaitMinutes / deliveredCount) : 0;

        // Top Items (increased to 5)
        const itemCounts: Record<string, number> = {};
        dailyOrders.forEach((o: Order) => o.items.forEach((i: OrderItem) => { itemCounts[i.menuItem.name] = (itemCounts[i.menuItem.name] || 0) + i.quantity; }));
        const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
        const topItems = sortedItems.slice(0, 5);

        // Bottom Items (least ordered - 3 items, only if they have at least 1 order)
        const bottomItems = sortedItems.length > 5
            ? sortedItems.slice(-3).reverse()
            : sortedItems.length > 0
                ? sortedItems.slice(-Math.min(3, sortedItems.length)).reverse()
                : [];

        // Ingredients / Raw Material Consumption
        const ingredientCounts: Record<string, number> = {};
        dailyOrders.forEach((o: Order) => {
            o.items.forEach((i: OrderItem) => {
                const ingredients = i.menuItem.ingredients ? i.menuItem.ingredients.split(',').map(s => s.trim()).filter(Boolean) : [];
                ingredients.forEach(ing => {
                    ingredientCounts[ing] = (ingredientCounts[ing] || 0) + i.quantity;
                });
            });
        });
        const topIngredients = Object.entries(ingredientCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const hourCounts: Record<number, number> = {};
        dailyOrders.forEach((o: Order) => { const h = new Date(o.createdAt || o.timestamp).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1; });
        const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        const totalOrders = dailyOrders.length;

        return { revenue, totalDishes, avgOrder, topItems, bottomItems, peakHour, totalOrders, foodCost, topIngredients, avgWaitTime };
    }, [ordersForAnalytics, selectedDate]);

    // --- SETTINGS & SHARE ---
    const saveDestinations = async () => { const newSettings: AppSettings = { ...appSettings, categoryDestinations: tempDestinations, printEnabled: tempPrintSettings }; await saveAppSettings(newSettings); setAppSettingsState(newSettings); setHasUnsavedDestinations(false); showToast("✅ Impostazioni salvate con successo!", 'success'); };
    const handleSaveAppSettings = async () => { const newSettings: AppSettings = { categoryDestinations: tempDestinations, printEnabled: tempPrintSettings, restaurantProfile: { ...appSettings.restaurantProfile, ...profileForm } }; await saveAppSettings(newSettings); setAppSettingsState(newSettings); setHasUnsavedDestinations(false); await showSuccess("✅ Profilo Salvato", "La configurazione è stata salvata con successo!"); };
    const handleSaveApiKey = async () => { await saveGoogleApiKey(apiKeyInput); setHasApiKey(true); showToast("API Key salvata con successo!", 'success'); };
    const handleRemoveApiKey = async () => {
        if (await showConfirm("Eliminare API Key?", "Vuoi davvero rimuovere la chiave API? Le funzionalità AI smetteranno di funzionare.")) {
            await removeGoogleApiKey();
            setApiKeyInput('');
            setHasApiKey(false);
            showToast("API Key rimossa correttamente.", 'info');
        }
    };
    const handlePrintQR = () => {
        const url = `${window.location.origin}?menu=${session?.user?.id}`;
        const win = window.open('', '', 'width=600,height=600');
        if (win) { win.document.write(`<html><head><title>QR Menu</title><style>body{font-family:sans-serif;text-align:center;padding:50px;} h1{font-size:30px;} .url{margin-top:20px;font-size:20px;font-weight:bold;}</style></head><body><h1>Scansiona per il Menu</h1><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" /><div class="url">${restaurantName}</div><p>Powered by RistoSync</p><script>window.print();</script></body></html>`); win.document.close(); }
    };
    const digitalMenuLink = session?.user?.id ? `${window.location.origin}?menu=${session.user.id}` : '';
    const qrCodeUrl = digitalMenuLink ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(digitalMenuLink)}` : '';
    const copyToClipboard = () => { navigator.clipboard.writeText(digitalMenuLink); showToast("📋 Link copiato negli appunti!", 'success'); };
    const shareLink = () => { if (navigator.share) { navigator.share({ title: restaurantName, text: 'Guarda il nostro menu!', url: digitalMenuLink }).catch(console.error); } else { copyToClipboard(); } };

    const handleAskChef = async () => {
        if (!chatQuery) return;
        setIsChatting(true);
        const answer = await askChefAI(chatQuery, null);
        setChatResponse(answer);
        setIsChatting(false);
    };

    const handleLoginWaiter = () => {
        if (!waiterNameInput.trim()) return;
        saveWaiterName(waiterNameInput.trim());
        setRole('waiter');
        setShowLogin(false);
    };

    // --- DELETE HANDLERS ---
    const handleFactoryReset = async () => {
        const confirmed = await showDelete(
            "Factory Reset Completo",
            "⚠️ ATTENZIONE: Questa azione cancellerà TUTTI i dati (Ordini, Menu, Impostazioni). Questa operazione è IRREVERSIBILE. Sei assolutamente sicuro?"
        );
        if (confirmed) {
            performFactoryReset();
            showToast("🔄 Reset completato. Ricaricamento...", "info");
            setTimeout(() => window.location.reload(), 2000);
        }
    };

    // RENDER LOGIC
    if (publicMenuId) return <DigitalMenu restaurantId={publicMenuId} />;

    // Landing Page Route
    if (showLandingPage) {
        return <LandingPage onNavigateToApp={() => {
            setShowLandingPage(false);
            window.history.pushState({}, '', '?landing=false');
        }}
            onSelectPlan={(planId) => {
                setShowLandingPage(false);
                window.history.pushState({}, '', '?landing=false');
                if (planId !== 'trial') {
                    // If not trial, open subscription manager to pay
                    setShowSubscriptionManager(true);
                    // Pre-select plan
                    localStorage.setItem('preselected_plan', planId);
                } else {
                    // Trial logic: Go to Auth Screen in Register Mode
                    localStorage.setItem('auth_mode', 'register');
                    setShowSubscriptionManager(false);
                }
            }}
        />;
    }

    if (loadingSession) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><Loader className="animate-spin text-orange-500" size={48} /></div>;
    if (!session) return <AuthScreen initialMode={localStorage.getItem('auth_mode') === 'register' ? 'register' : 'login'} />;
    if (isSuperAdmin && adminViewMode === 'dashboard') return <SuperAdminDashboard onEnterApp={() => setAdminViewMode('app')} />;
    if (isBanned) return <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center text-white p-8 text-center"><Shield size={64} className="mb-6 text-red-500" /><h1 className="text-4xl font-black mb-4">ACCOUNT BLOCCATO</h1><p className="text-xl mb-8">Il tuo account è stato disabilitato permanentemente per violazione dei termini.</p><button onClick={signOut} className="bg-red-700 hover:bg-red-600 px-8 py-3 rounded-xl font-bold">Esci</button></div>;
    if (accountDeleted) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center"><AlertTriangle size={64} className="mb-6 text-slate-500" /><h1 className="text-4xl font-black mb-4">ACCOUNT DISATTIVATO</h1><p className="text-xl mb-8 max-w-md">Il tuo account è stato disattivato. Contatta l'amministrazione per richiedere la riattivazione.</p><div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 max-w-md w-full mb-8 text-left"><p className="font-bold text-slate-300 mb-2">Contatta l'amministrazione:</p><div className="flex items-center gap-2 text-white mb-1"><Mail size={16} /> {adminContactEmail}</div><div className="flex items-center gap-2 text-white"><PhoneCall size={16} /> {adminPhone}</div></div><button onClick={signOut} className="bg-slate-700 hover:bg-slate-600 px-8 py-3 rounded-xl font-bold">Esci</button></div>;
    if (isSuspended) return (
        <div className="min-h-screen bg-gradient-to-br from-orange-950 via-slate-900 to-slate-950 flex flex-col items-center justify-start text-white p-6 overflow-y-auto">
            {/* Header */}
            <div className="text-center mb-8 pt-8">
                <Clock size={64} className="mx-auto mb-4 text-orange-500" />
                <h1 className="text-4xl font-black mb-2">SERVIZIO IN ATTESA</h1>
                <p className="text-lg text-slate-300 max-w-md mx-auto">Il tuo abbonamento è in attesa di rinnovo. Scegli un piano per riattivare immediatamente il servizio.</p>
            </div>

            {/* PIANI ABBONAMENTO */}
            <div className="w-full max-w-4xl mb-8">
                <h2 className="text-xl font-black text-center mb-6 text-orange-400">📦 Piani Disponibili</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PIANO BASIC */}
                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 text-center hover:border-blue-500/50 transition-all hover:scale-105 flex flex-col">
                        <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Store size={28} className="text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">BASIC</h3>
                        <div className="text-4xl font-black text-white mb-1">€49,90<span className="text-lg text-slate-400">/mese</span></div>
                        <p className="text-sm text-slate-400 mb-6 font-bold">L'essenziale per il tuo locale</p>

                        <ul className="text-xs text-slate-300 text-left space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Menu Digitale Illimitato</li>
                            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Gestione Ordini & Tavoli</li>
                            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Statistiche Base</li>
                            <li className="flex items-center gap-2 opacity-50"><X size={14} className="text-slate-500 shrink-0" /> No WhatsApp Marketing</li>
                            <li className="flex items-center gap-2 opacity-50"><X size={14} className="text-slate-500 shrink-0" /> No AI Assistant</li>
                        </ul>
                        <button
                            onClick={() => openPaymentInstructions('Basic', '49.90')}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                        >
                            Attiva Basic
                        </button>
                    </div>

                    {/* PIANO PRO - EVIDENZIATO */}
                    <div className="bg-gradient-to-b from-purple-900/40 to-slate-900/80 backdrop-blur-sm border-2 border-purple-500 rounded-2xl p-6 text-center relative hover:scale-105 transition-all shadow-lg shadow-purple-900/20 flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">CONSIGLIATO</div>
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 mt-2">
                            <Sparkles size={28} className="text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">PRO AI</h3>
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">€99,90<span className="text-lg text-slate-400 font-normal">/mese</span></div>
                        <p className="text-sm text-purple-200 mb-6 font-bold">La suite completa con AI</p>

                        <ul className="text-xs text-white text-left space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 font-bold"><CheckCircle size={14} className="text-purple-400 shrink-0" /> Tutto incluso nel Basic</li>
                            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-400 shrink-0" /> WhatsApp Marketing Auto</li>
                            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-400 shrink-0" /> Menu Intelligence AI</li>
                            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-400 shrink-0" /> Analisi Food Cost</li>
                            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-400 shrink-0" /> Supporto Prioritario VIP</li>
                        </ul>
                        <button
                            onClick={() => openPaymentInstructions('Pro', '99.90')}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
                        >
                            Attiva Pro AI
                        </button>
                    </div>
                </div>
            </div>

            {/* PAGAMENTO */}
            <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 w-full max-w-xl mb-6">
                <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><CreditCard size={20} className="text-green-500" /> Modalità di Pagamento</h3>
                <p className="text-sm text-slate-300 mb-4">Effettua il bonifico bancario con la causale "Abbonamento RistoSync - {restaurantName}"</p>

                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 w-full bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-500 uppercase mb-1">IBAN</p>
                        <p className="font-mono text-white text-lg select-all break-all">{adminIban}</p>
                        <button
                            onClick={() => { navigator.clipboard.writeText(adminIban); showToast('IBAN copiato!', 'success'); }}
                            className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 mt-1 font-bold"
                        >
                            <Copy size={12} /> Copia IBAN
                        </button>
                        <p className="text-xs text-slate-500 uppercase mt-3 mb-1">Intestatario</p>
                        <p className="font-bold text-white">{adminHolder}</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-slate-200 shrink-0 flex flex-col items-center">
                        <QRCodeGenerator
                            value={`BCD\n002\n2\nSCT\n\n${adminHolder}\n${adminIban}\nEUR\n\n\nAbbonamento ${new Date().toLocaleString('it-IT', { month: 'long' })} ${restaurantName}`}
                            size={120}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            level="M"
                        />
                        <p className="text-center text-[10px] font-bold text-slate-900 mt-2 uppercase flex items-center gap-1"><QrCode size={10} /> Paga con App</p>
                    </div>
                </div>

                {/* PayPal Option */}
                <div className="mt-6 border-t border-slate-800 pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="text-center md:text-left">
                            <p className="font-bold text-white flex items-center justify-center md:justify-start gap-2 mb-1">
                                <span className="bg-[#003087] text-white px-2 py-0.5 rounded italic font-black text-sm">Pay</span><span className="text-[#009cde] font-black text-sm italic -ml-2">Pal</span>
                                <span className="text-slate-300 text-sm font-normal">Disponibile</span>
                            </p>
                            <p className="text-xs text-slate-400">Invia il pagamento a <span className="text-white font-mono">{adminContactEmail}</span></p>
                        </div>
                        <button
                            onClick={() => window.open('https://paypal.me/ristosync', '_blank')}
                            className="bg-[#003087] hover:bg-[#00256b] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg text-sm"
                        >
                            Paga con PayPal <ExternalLink size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTATTI */}
            <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 w-full max-w-xl mb-8">
                <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><PhoneCall size={20} className="text-orange-500" /> Contatta l'Amministrazione</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <Mail size={20} className="text-blue-400" />
                        <div>
                            <p className="text-xs text-slate-500">Email</p>
                            <p className="text-sm text-white font-medium">{adminContactEmail}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <PhoneCall size={20} className="text-green-400" />
                        <div>
                            <p className="text-xs text-slate-500">Telefono</p>
                            <p className="text-sm text-white font-medium">{adminPhone}</p>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={signOut} className="bg-orange-600 hover:bg-orange-500 px-8 py-3 rounded-xl font-bold mb-8 transition-all active:scale-95">Esci</button>
        </div>
    );

    if (showMonitor) return <TableMonitor onExit={() => {
        setShowMonitor(false);
        // Clear param but keep query string clean for dashboard
        window.history.pushState({}, '', window.location.pathname);
    }} />;

    if (showReservations) return <ReservationManager onClose={() => setShowReservations(false)} showToast={showToast} showConfirm={showConfirm} />;


    if (!role && !showAdmin) {
        const planLabel = appSettings.restaurantProfile?.planType || 'Trial';
        const isFreePlan = planLabel === 'Free' || planLabel === 'Demo';
        let subText = "Licenza Attiva"; let subColor = "text-emerald-400";
        if (subscriptionExpired) { subText = "Abbonamento Scaduto"; subColor = "text-red-500 animate-pulse"; } else if (daysRemaining !== null) { subText = `${daysRemaining} Giorni Rimasti`; if (daysRemaining <= 5) subColor = "text-orange-400"; } else if (isFreePlan) { subText = "Versione Gratuita"; subColor = "text-blue-400"; }

        return (
            <>
                {showWelcomeModal && session && (
                    <WelcomeModal
                        onClose={() => setShowWelcomeModal(false)}
                        onAccept={handleWelcomeAccept}
                        restaurantName={restaurantName}
                    />
                )}
                <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col font-sans relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 pointer-events-none"></div>
                    <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10 flex justify-between items-center mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20 transform rotate-3"><ChefHat size={36} className="text-white drop-shadow-md" /></div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight flex items-center gap-2">Risto<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Sync</span><span className="text-blue-500 font-black ml-1">AI</span><span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md border border-slate-700 font-mono tracking-widest uppercase">{planLabel}</span></h1>
                                <p className="text-slate-400 font-medium text-sm mt-1 flex items-center gap-2">{restaurantName} <span className="w-1 h-1 bg-slate-500 rounded-full"></span> {new Date().toLocaleDateString()}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">{session?.user?.email}</p>
                                <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${subColor} flex items-center gap-1`}>{subscriptionExpired ? <AlertTriangle size={10} /> : <Clock size={10} />} {subText}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            {isSuperAdmin && (
                                <button onClick={() => setAdminViewMode('dashboard')} className="group bg-indigo-900/30 hover:bg-indigo-600 p-4 rounded-2xl transition-all duration-300 border border-indigo-500/30 hover:border-indigo-400 flex flex-col items-center gap-1 shadow-lg active:scale-95" title="Super Admin Dashboard">
                                    <ShieldCheck className="text-indigo-400 group-hover:text-white" size={24} />
                                    <span className="text-[10px] uppercase font-bold text-indigo-400 group-hover:text-white">Super Admin</span>
                                </button>
                            )}

                            <button onClick={handleAdminAuth} className="group bg-slate-800 hover:bg-slate-700 p-4 rounded-2xl transition-all duration-300 border border-slate-700 hover:border-slate-500 flex flex-col items-center gap-1 shadow-lg active:scale-95" title="Impostazioni Admin"><Settings className="text-slate-400 group-hover:text-white group-hover:rotate-45 transition-transform" size={24} /><span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300">Admin</span></button><button onClick={signOut} className="group bg-slate-800 hover:bg-red-900/20 p-4 rounded-2xl transition-all duration-300 border border-slate-700 hover:border-red-500/50 flex flex-col items-center gap-1 shadow-lg active:scale-95" title="Esci"><LogOut className="text-slate-400 group-hover:text-red-400" size={24} /><span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-red-400">Esci</span></button></div>
                    </div>
                    {subscriptionExpired && (<div className="relative z-10 mb-8 bg-red-600/10 border border-red-500/30 p-4 rounded-2xl flex items-center justify-between animate-pulse"><div className="flex items-center gap-3 text-red-400 font-bold"><AlertTriangle size={24} /><span>Abbonamento Scaduto! Rinnova per continuare a usare tutte le funzioni.</span></div><button onClick={() => setShowSubscriptionManager(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500">Rinnova</button></div>)}
                    {daysRemaining !== null && daysRemaining <= 5 && !subscriptionExpired && (<div className="relative z-10 mb-8 bg-orange-600/10 border border-orange-500/30 p-4 rounded-2xl flex items-center justify-between"><div className="flex items-center gap-3 text-orange-400 font-bold"><Clock size={24} /><span>Abbonamento in scadenza tra {daysRemaining} giorni.</span></div><button onClick={() => setShowSubscriptionManager(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-500">Gestisci</button></div>)}
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-7xl mx-auto px-4">
                        <div className="flex flex-col gap-5 md:row-span-2">
                            <button onClick={() => checkRoleAccess('waiter')} className="group relative flex-1 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 overflow-hidden min-h-[160px]">
                                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-700 group-hover:border-blue-500 group-hover:scale-105 transition-all shadow-inner">
                                    <Smartphone size={28} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="text-center relative z-10">
                                    <h2 className="text-xl font-black text-white mb-0.5 group-hover:text-blue-400 transition-colors">SALA</h2>
                                    <p className="text-slate-500 text-xs font-medium">Gestione Comande</p>
                                </div>
                            </button>

                            <button onClick={() => {
                                setShowMonitor(true);
                                setRole(null); // Ensure no role is active
                                window.history.pushState({}, '', '?monitor=true');
                            }} className="group relative flex-1 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/50 overflow-hidden min-h-[160px]">
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-700 group-hover:border-purple-500 group-hover:scale-105 transition-all shadow-inner">
                                    <Users size={28} className="text-slate-400 group-hover:text-purple-500 transition-colors" />
                                </div>
                                <div className="text-center relative z-10">
                                    <h2 className="text-xl font-black text-white mb-0.5 group-hover:text-purple-400 transition-colors">MONITOR</h2>
                                    <p className="text-slate-500 text-xs font-medium">Stato Tavoli</p>
                                </div>
                            </button>
                        </div>
                        <button onClick={() => checkRoleAccess('kitchen')} className="group relative h-48 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/50 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-orange-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-700 group-hover:border-orange-500 group-hover:scale-105 transition-all shadow-inner"><ChefHat size={28} className="text-slate-400 group-hover:text-orange-500 transition-colors" /></div><div className="text-center relative z-10"><h2 className="text-lg font-black text-white mb-0.5 group-hover:text-orange-400 transition-colors">CUCINA</h2><p className="text-slate-500 text-xs font-medium">Ordini food</p></div></button>
                        <button onClick={() => checkRoleAccess('pizzeria')} className="group relative h-48 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10 hover:border-red-500/50 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-700 group-hover:border-red-500 group-hover:scale-105 transition-all shadow-inner"><Pizza size={28} className="text-slate-400 group-hover:text-red-500 transition-colors" /></div><div className="text-center relative z-10"><h2 className="text-lg font-black text-white mb-0.5 group-hover:text-red-400 transition-colors">PIZZERIA</h2><p className="text-slate-500 text-xs font-medium">Forno</p></div></button>
                        <button onClick={() => checkRoleAccess('pub')} className="group relative h-48 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-500/50 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-amber-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-700 group-hover:border-amber-500 group-hover:scale-105 transition-all shadow-inner"><Sandwich size={28} className="text-slate-400 group-hover:text-amber-500 transition-colors" /></div><div className="text-center relative z-10"><h2 className="text-lg font-black text-white mb-0.5 group-hover:text-amber-400 transition-colors">PUB/BAR</h2><p className="text-slate-500 text-xs font-medium">Bevande</p></div></button>
                        <button onClick={() => checkRoleAccess('delivery')} className="group relative h-48 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10 hover:border-green-500/50 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-green-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-700 group-hover:border-green-500 group-hover:scale-105 transition-all shadow-inner"><Bike size={28} className="text-slate-400 group-hover:text-green-500 transition-colors" /></div><div className="text-center relative z-10"><h2 className="text-lg font-black text-white mb-0.5 group-hover:text-green-400 transition-colors">DELIVERY</h2><p className="text-slate-500 text-xs font-medium">Asporto</p></div></button>
                    </div>

                    {/* PULSANTE PRENOTAZIONI - Rettangolare Allungato */}
                    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 mt-5">
                        <button
                            onClick={() => setShowReservations(true)}
                            className="group w-full bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 hover:from-orange-500 hover:via-red-500 hover:to-orange-500 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-4 transition-all duration-300 shadow-2xl hover:shadow-orange-500/50 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-orange-400/30 hover:border-orange-300 overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 group-hover:animate-shimmer"></div>
                            <Calendar size={32} className="group-hover:rotate-12 transition-transform duration-300 drop-shadow-lg" />
                            <span className="text-2xl tracking-wide drop-shadow-lg relative z-10">GESTIONE PRENOTAZIONI</span>
                            <Users size={32} className="group-hover:-rotate-12 transition-transform duration-300 drop-shadow-lg" />
                        </button>
                    </div>


                    {showLogin && (<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"><div className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] shadow-2xl w-full max-w-sm relative animate-slide-up"><button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={24} /></button><div className="text-center mb-6"><div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4"><User size={32} className="text-blue-500" /></div><h2 className="text-2xl font-bold text-white">Chi sei?</h2><p className="text-slate-400 text-sm mt-1">Inserisci il tuo nome per iniziare</p></div><input type="text" value={waiterNameInput} onChange={(e) => setWaiterNameInput(e.target.value)} placeholder="Es. Marco" className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-4 rounded-xl mb-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-bold text-center text-lg" autoFocus /><button onClick={handleLoginWaiter} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">Inizia Turno <ArrowRight size={20} /></button></div></div>)}
                </div>
            </>
        );
    }

    if (role === 'kitchen') return <KitchenDisplay onExit={() => setRole(null)} department="Cucina" />;
    if (role === 'pizzeria') return <KitchenDisplay onExit={() => setRole(null)} department="Pizzeria" />;
    if (role === 'pub') return <KitchenDisplay onExit={() => setRole(null)} department="Pub" />;
    if (role === 'waiter') return <WaiterPad onExit={() => setRole(null)} />;
    if (role === 'delivery') return <DeliveryManager onExit={() => setRole(null)} menuItems={menuItems} showToast={(msg, type) => showToast(msg, type)} />;


    if (showAdmin) {
        return (
            <>
                {showWelcomeModal && session && (
                    <WelcomeModal
                        onClose={() => setShowWelcomeModal(false)}
                        onAccept={handleWelcomeAccept}
                        restaurantName={restaurantName}
                    />
                )}
                {showPrintableMenu && (
                    <PrintableMenu
                        menuItems={menuItems}
                        restaurantProfile={profileForm}
                        publicUrl={digitalMenuLink}
                        onClose={() => setShowPrintableMenu(false)}
                    />
                )}
                <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col md:flex-row">
                    <div className="w-full md:w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0">
                        <div className="p-6 border-b border-slate-800 flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg"><ChefHat size={20} className="text-white" /></div><h1 className="font-black text-xl tracking-tight">Risto<span className="text-orange-500">Sync</span><span className="text-blue-500 font-black ml-1">AI</span></h1></div>
                        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                            <button onClick={() => setAdminTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Store size={18} /> Profilo Ristorante</button>
                            <button onClick={() => setAdminTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'menu' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Utensils size={18} /> Gestione Menu</button>
                            <button onClick={() => setAdminTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'customers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Users size={18} /> Gestione Clienti</button>
                            <button onClick={() => setAdminTab('share')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'share' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><QrCode size={18} /> Menu Digitale/Cartaceo</button>
                            <button onClick={() => setAdminTab('messages')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all relative ${adminTab === 'messages' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                <Mail size={18} /> Messaggi / News
                                {unreadMessagesCount > 0 && <span className="absolute right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadMessagesCount}</span>}
                            </button>
                            <button onClick={() => setAdminTab('notif')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'notif' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Bell size={18} /> Notifiche & Reparti</button>
                            <button onClick={() => setShowSubscriptionManager(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-slate-400 hover:bg-slate-800 hover:text-white bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30`}><CreditCard size={18} className="text-purple-400" /> Abbonamento</button>
                            <button onClick={() => setAdminTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'analytics' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><BarChart3 size={18} /> Statistiche</button>
                            <button onClick={() => setAdminTab('receipts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'receipts' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Receipt size={18} /> Scontrini Cassa</button>
                            <button
                                onClick={() => {
                                    const plan = (profileForm?.planType || '').toLowerCase();
                                    if (plan.includes('basic')) {
                                        showToast('Questa funzione richiede il piano PRO', 'error');
                                        return;
                                    }
                                    setAdminTab('ai');
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'ai' ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' : (profileForm?.planType || '').toLowerCase().includes('basic') ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Bot size={18} /> AI Intelligence
                                {(profileForm?.planType || '').toLowerCase().includes('basic') && <Lock size={14} className="ml-auto" />}
                            </button>

                            <button
                                onClick={() => {
                                    const plan = (profileForm?.planType || '').toLowerCase();
                                    if (plan.includes('basic')) {
                                        showToast('Questa funzione richiede il piano PRO', 'error');
                                        return;
                                    }
                                    setAdminTab('marketing');
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'marketing' ? 'bg-pink-500 text-white shadow-lg shadow-pink-900/20' : (profileForm?.planType || '').toLowerCase().includes('basic') ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Megaphone size={18} /> Marketing
                                {(profileForm?.planType || '').toLowerCase().includes('basic') ? <Lock size={14} className="ml-auto" /> : <span className="ml-auto bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Beta</span>}
                            </button>

                            <button
                                onClick={() => {
                                    const plan = (profileForm?.planType || '').toLowerCase();
                                    if (plan.includes('basic')) {
                                        showToast('Questa funzione richiede il piano PRO', 'error');
                                        return;
                                    }
                                    setAdminTab('whatsapp');
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'whatsapp' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : (profileForm?.planType || '').toLowerCase().includes('basic') ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <MessageCircle size={18} /> WhatsApp Marketing
                                {(profileForm?.planType || '').toLowerCase().includes('basic') && <Lock size={14} className="ml-auto" />}
                            </button>
                            <button onClick={() => setAdminTab('delivery')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'delivery' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Bike size={18} /> Piattaforme Delivery</button>
                            <button onClick={() => setAdminTab('info')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${adminTab === 'info' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Info size={18} /> Info & Supporto</button>
                        </nav>
                        <div className="p-4 border-t border-slate-800"><button onClick={() => setShowAdmin(false)} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold transition-colors"><ArrowLeft size={18} /> Torna alla Home</button></div>
                    </div>

                    <div ref={mainContentRef} className="flex-1 h-screen overflow-y-auto bg-slate-950 p-6 md:p-10 custom-scroll">
                        {adminTab === 'profile' && (
                            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
                                <h2 className="text-3xl font-black text-white mb-8">Profilo Ristorante</h2>
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Store className="text-blue-500" /> Dati Pubblici</h3>
                                    <p className="text-slate-400 text-sm mb-6">Questi dati appariranno nel Menu Digitale.</p>
                                    <div className="space-y-4">
                                        {/* LOGO + NAME ROW */}
                                        <div className="flex gap-4 items-start">
                                            {/* Logo Upload */}
                                            <div className="shrink-0">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Logo (Opzionale)</label>
                                                <div
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="relative w-24 h-24 bg-slate-950 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center cursor-pointer hover:border-orange-500 transition-all group overflow-hidden"
                                                >
                                                    {profileForm.logo ? (
                                                        <>
                                                            <img src={profileForm.logo} alt="Logo" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-[10px] text-white font-bold uppercase">Cambia</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setProfileForm({ ...profileForm, logo: undefined }); }}
                                                                className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors z-50"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="text-center p-2">
                                                            <ChefHat size={24} className="mx-auto text-slate-600 group-hover:text-orange-500 transition-colors" />
                                                            <span className="text-[8px] text-slate-600 mt-1 block">400x400</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                                                <p className="text-[8px] text-slate-600 mt-1 text-center">Formato quadrato</p>
                                            </div>
                                            {/* Name Input */}
                                            <div className="flex-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Insegna (Nome Ristorante)</label>
                                                <input type="text" value={profileForm.name || ''} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500 outline-none" />
                                                <p className="text-[10px] text-slate-600 mt-1">Il nome e il logo appariranno nel Menu Digitale</p>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold block">Bio / Descrizione</label>
                                                <div className="flex gap-2">
                                                    <button onClick={handleGenerateBio} disabled={isGeneratingBio} className="text-[10px] bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors disabled:opacity-50"><Sparkles size={10} /> {isGeneratingBio ? '...' : 'AI'}</button>
                                                    <button onClick={handleMicBio} disabled={isListeningBio} className={`text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${isListeningBio ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{isListeningBio ? <MicOff size={10} /> : <Mic size={10} />} REC</button>
                                                </div>
                                            </div>
                                            <textarea value={profileForm.description || ''} onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none h-24 resize-none" placeholder="Breve descrizione del locale..." />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Sito Web (Url)</label>
                                            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-blue-500">
                                                <Globe size={16} className="text-slate-500" />
                                                <input type="text" value={profileForm.website || ''} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} className="w-full bg-transparent text-white text-sm outline-none" placeholder="www.ristorante.com" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Share2 className="text-pink-500" /> Social & Presenza Online</h3>
                                    <p className="text-slate-400 text-sm mb-6">Inserisci i link ai tuoi profili social per mostrarli nel menu digitale.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-700 focus-within:border-blue-500">
                                            <Instagram className="text-pink-500 ml-2" size={18} />
                                            <input type="text" value={profileForm.socials?.instagram || ''} onChange={(e) => handleSocialChange('instagram', e.target.value)} className="bg-transparent outline-none text-white text-sm w-full placeholder-slate-600" placeholder="Link Instagram" />
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-700 focus-within:border-blue-500">
                                            <Facebook className="text-blue-600 ml-2" size={18} />
                                            <input type="text" value={profileForm.socials?.facebook || ''} onChange={(e) => handleSocialChange('facebook', e.target.value)} className="bg-transparent outline-none text-white text-sm w-full placeholder-slate-600" placeholder="Link Facebook" />
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-700 focus-within:border-blue-500">
                                            <Music className="text-white ml-2" size={18} />
                                            <input type="text" value={profileForm.socials?.tiktok || ''} onChange={(e) => handleSocialChange('tiktok', e.target.value)} className="bg-transparent outline-none text-white text-sm w-full placeholder-slate-600" placeholder="Link TikTok" />
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-700 focus-within:border-blue-500">
                                            <Store className="text-blue-400 ml-2" size={18} />
                                            <input type="text" value={profileForm.socials?.google || ''} onChange={(e) => handleSocialChange('google', e.target.value)} className="bg-transparent outline-none text-white text-sm w-full placeholder-slate-600" placeholder="Link Google Business" />
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-700 focus-within:border-blue-500">
                                            <Compass className="text-green-500 ml-2" size={18} />
                                            <input type="text" value={profileForm.socials?.tripadvisor || ''} onChange={(e) => handleSocialChange('tripadvisor', e.target.value)} className="bg-transparent outline-none text-white text-sm w-full placeholder-slate-600" placeholder="Link TripAdvisor" />
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-700 focus-within:border-blue-500">
                                            <UtensilsCrossed className="text-emerald-500 ml-2" size={18} />
                                            <input type="text" value={profileForm.socials?.thefork || ''} onChange={(e) => handleSocialChange('thefork', e.target.value)} className="bg-transparent outline-none text-white text-sm w-full placeholder-slate-600" placeholder="Link TheFork" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Briefcase className="text-orange-500" /> Dati Aziendali (Fatturazione)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Ragione Sociale Completa</label>
                                            <input type="text" value={profileForm.businessName || ''} onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">P.IVA / Codice Fiscale</label>
                                            <input type="text" value={profileForm.vatNumber || ''} onChange={(e) => setProfileForm({ ...profileForm, vatNumber: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Codice SDI (Destinatario)</label>
                                            <input type="text" value={profileForm.sdiCode || ''} onChange={(e) => setProfileForm({ ...profileForm, sdiCode: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase" placeholder="XXXXXXX" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Indirizzo Sede Legale</label>
                                            <input type="text" value={profileForm.address || ''} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Indirizzo PEC</label>
                                            <input type="email" value={profileForm.pecEmail || ''} onChange={(e) => setProfileForm({ ...profileForm, pecEmail: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Phone className="text-green-500" /> Contatti Amministrativi</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Email Amministrazione</label>
                                            <input type="email" value={profileForm.email || ''} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Telefono / Cellulare</label>
                                            <input type="text" value={profileForm.phoneNumber || ''} onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-6 rounded-2xl border border-red-500/20 shadow-xl">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings className="text-red-500" /> Gestione Account</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Email di Login (Account ID)</label>
                                            <div className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 font-mono text-sm flex items-center gap-2">
                                                <Mail size={14} />
                                                {session?.user?.email || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="flex justify-center">
                                            <button onClick={handleFactoryReset} className="w-full md:w-1/2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20">
                                                <AlertTriangle size={16} /> FACTORY RESET
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end"><button onClick={handleSaveAppSettings} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"><Save size={18} /> Salva Profilo</button></div>
                            </div>
                        )}
                        {adminTab === 'menu' && (
                            <div className="max-w-6xl mx-auto animate-fade-in">
                                <div className="flex justify-between items-center mb-8"><div><h2 className="text-3xl font-black text-white mb-2">Gestione Menu</h2><p className="text-slate-400">Aggiungi, modifica o rimuovi piatti dal tuo menu digitale.</p></div><div className="flex gap-3"><button onClick={() => { setEditingItem({}); setIsEditingItem(!isEditingItem); mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 ${isEditingItem ? 'bg-slate-700 text-white' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20'}`}>{isEditingItem ? <X size={20} /> : <Plus size={20} />} {isEditingItem ? 'Chiudi Editor' : 'NUOVO PIATTO'}</button></div></div>
                                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"><div className="flex items-center gap-4"><div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl"><LayoutGrid size={24} /></div><div><h3 className="font-bold text-white text-lg">Configurazione Sala</h3><p className="text-xs text-slate-400 font-medium">Imposta il numero di tavoli attivi nel ristorante.</p></div></div><div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-700"><button onClick={() => handleUpdateTableCount(-1)} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"><Minus size={18} strokeWidth={3} /></button><span className="font-black text-3xl w-16 text-center text-white">{appSettings.restaurantProfile?.tableCount || 12}</span><button onClick={() => handleUpdateTableCount(1)} className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-lg text-white shadow-lg shadow-blue-600/20 transition-colors"><Plus size={18} strokeWidth={3} /></button></div></div>
                                <div className="bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-800/50 mb-8">
                                    {/* Toolbar Row */}
                                    <div className="flex flex-wrap gap-3 items-center">
                                        {/* IMPORT/EXPORT GROUP */}
                                        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl">
                                            <button onClick={() => bulkInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-all" title="Importa menu da file JSON">
                                                <Upload size={14} /> JSON
                                            </button>
                                            <input type="file" ref={bulkInputRef} onChange={handleBulkImport} accept=".json" className="hidden" />
                                            <button onClick={exportMenu} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-all" title="Esporta menu in JSON">
                                                <Download size={14} /> Esporta
                                            </button>
                                        </div>

                                        {/* DIVIDER */}
                                        <div className="w-px h-8 bg-slate-700 hidden sm:block"></div>

                                        {/* QUICK ACTIONS GROUP */}
                                        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl">
                                            <button onClick={() => bulkImagesRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-slate-300 hover:bg-pink-600/20 hover:text-pink-400 transition-all" title="Carica più foto insieme">
                                                <ImageIcon size={14} /> Foto Bulk
                                            </button>
                                            <input type="file" ref={bulkImagesRef} onChange={handleBulkImageUpload} accept="image/*" multiple className="hidden" />

                                            <button onClick={() => smartInputRef.current?.click()} disabled={isSmartScanning} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-all ${isSmartScanning ? 'bg-indigo-600/50 text-white animate-pulse' : 'text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-400'}`} title="Importa Menu da Foto o CSV con AI">
                                                {isSmartScanning ? <Loader className="animate-spin" size={14} /> : <Scan size={14} />} {isSmartScanning ? 'Analisi...' : 'Scan AI'}
                                            </button>
                                            <input type="file" ref={smartInputRef} onChange={handleSmartImport} accept="image/*,.csv,.xlsx,.xls" className="hidden" />

                                            <button onClick={async () => { if (await showConfirm("Conferma", "Caricare piatti dimostrativi? Verranno sincronizzati automaticamente al cloud per il menu digitale.")) { await importDemoMenu(); showToast("✅ Menu demo caricato! I piatti sono pronti per la prova.", "success"); setTimeout(() => window.location.reload(), 2000); } }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-slate-300 hover:bg-purple-600/20 hover:text-purple-400 transition-all" title="Carica piatti dimostrativi">
                                                <Sparkles size={14} /> Demo
                                            </button>
                                        </div>

                                        {/* SPACER */}
                                        <div className="flex-1"></div>

                                        {/* DANGER ZONE */}
                                        <button onClick={async () => { if (await showDelete("Elimina Menu Completo", "Sei sicuro di voler eliminare tutti i piatti dal menu? Questa azione non può essere annullata.")) { await deleteAllMenuItems(); showToast("✅ Menu eliminato con successo!", "success"); setTimeout(() => window.location.reload(), 2000); } }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-red-400 hover:bg-red-600 hover:text-white transition-all border border-red-500/30 hover:border-red-500" title="Elimina tutti i piatti">
                                            <Trash2 size={14} /> Svuota Menu
                                        </button>
                                    </div>
                                </div>
                                {(isEditingItem || Object.keys(editingItem).length > 0) && (
                                    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-2xl mb-10 relative overflow-hidden animate-slide-up max-w-5xl mx-auto">
                                        <h3 className="font-bold text-white mb-5 flex items-center gap-2 text-xl border-b border-slate-800 pb-3"><Edit2 size={20} /> {editingItem.id ? 'Modifica Piatto' : 'Crea Nuovo Piatto'}</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-5">
                                                <div className="flex gap-4 items-start">
                                                    <div className="relative w-28 h-28 bg-slate-950 rounded-2xl border-2 border-slate-700 border-dashed flex items-center justify-center overflow-hidden shrink-0 group hover:border-blue-500 transition-colors">
                                                        {editingItem.image ? (<>
                                                            <img src={editingItem.image} alt="Preview" className="w-full h-full object-cover" />
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingItem(prev => ({ ...prev, image: undefined })); }} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:scale-110"><X size={14} /></button>
                                                        </>) : <ImageIcon className="text-slate-600" size={28} />}
                                                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                                        <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-10 font-bold text-xs text-white uppercase tracking-wider">Cambia</div>
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Piatto</label>
                                                            <input type="text" placeholder="Es. Spaghetti alla Carbonara" value={editingItem.name || ''} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:border-blue-500 outline-none transition-colors" />
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="w-24">
                                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Prezzo</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-base">€</span>
                                                                    <input type="number" placeholder="0.00" value={editingItem.price || ''} onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-white font-mono font-bold text-left text-sm focus:border-green-500 outline-none transition-colors" />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Categoria</label>
                                                                <div className="relative">
                                                                    <select
                                                                        value={editingItem.category || Category.ANTIPASTI}
                                                                        onChange={e => setEditingItem({ ...editingItem, category: e.target.value as Category })}
                                                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-white font-bold text-sm focus:border-blue-500 outline-none appearance-none transition-colors cursor-pointer hover:border-slate-600"
                                                                    >
                                                                        <option value={Category.MENU_COMPLETO}>{Category.MENU_COMPLETO}</option>
                                                                        <option value={Category.ANTIPASTI}>{Category.ANTIPASTI}</option>
                                                                        <option value={Category.PANINI}>{Category.PANINI}</option>
                                                                        <option value={Category.PIZZE}>{Category.PIZZE}</option>
                                                                        <option value={Category.PRIMI}>{Category.PRIMI}</option>
                                                                        <option value={Category.SECONDI}>{Category.SECONDI}</option>
                                                                        <option value={Category.DOLCI}>{Category.DOLCI}</option>
                                                                        <option value={Category.BEVANDE}>{Category.BEVANDE}</option>
                                                                    </select>
                                                                    {/* Icon on the left based on selected category */}
                                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                                        {editingItem.category === Category.MENU_COMPLETO && <UtensilsCrossed size={16} />}
                                                                        {editingItem.category === Category.ANTIPASTI && <Utensils size={16} />}
                                                                        {editingItem.category === Category.PANINI && <Sandwich size={16} />}
                                                                        {editingItem.category === Category.PIZZE && <Pizza size={16} />}
                                                                        {editingItem.category === Category.PRIMI && <Utensils size={16} />}
                                                                        {editingItem.category === Category.SECONDI && <Flame size={16} />}
                                                                        {editingItem.category === Category.DOLCI && <CakeSlice size={16} />}
                                                                        {editingItem.category === Category.BEVANDE && <Wine size={16} />}
                                                                    </div>
                                                                    {/* Chevron down icon */}
                                                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Reparto di Destinazione (Opzionale)</label>
                                                    <select value={editingItem.specificDepartment || ''} onChange={e => setEditingItem({ ...editingItem, specificDepartment: e.target.value as Department | undefined })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-300 text-sm outline-none focus:border-purple-500 transition-colors cursor-pointer">
                                                        <option value="">Usa Default della Categoria</option>
                                                        <option value="Cucina">Forza Cucina</option>
                                                        <option value="Pizzeria">Forza Pizzeria</option>
                                                        <option value="Pub">Forza Pub</option>
                                                        <option value="Sala">Forza Sala</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-xs font-bold text-slate-500 uppercase">Ingredienti</label>
                                                        <button onClick={generateIngr} disabled={!editingItem.name} className="text-xs bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 px-2 py-0.5 rounded-lg font-bold flex gap-1 items-center transition-colors disabled:opacity-50"><Sparkles size={12} /> AI</button>
                                                    </div>
                                                    <textarea placeholder="Elenco ingredienti separati da virgola..." value={editingItem.ingredients || ''} onChange={e => setEditingItem({ ...editingItem, ingredients: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-purple-500 transition-colors resize-none h-24" />
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-xs font-bold text-slate-500 uppercase">Descrizione Menu</label>
                                                        <button onClick={generateDesc} disabled={!editingItem.name} className="text-xs bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 px-2 py-0.5 rounded-lg font-bold flex gap-1 items-center transition-colors disabled:opacity-50"><Sparkles size={12} /> AI</button>
                                                    </div>
                                                    <textarea placeholder="Descrizione accattivante per il menu digitale..." value={editingItem.description || ''} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-purple-500 transition-colors resize-none h-24" />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Allergeni</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {ALLERGENS_CONFIG.map(alg => {
                                                            const Icon = alg.icon;
                                                            return (
                                                                <button key={alg.id} onClick={() => { const current = editingItem.allergens || []; setEditingItem({ ...editingItem, allergens: current.includes(alg.id) ? current.filter(a => a !== alg.id) : [...current, alg.id] }); }}
                                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${editingItem.allergens?.includes(alg.id) ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                                                                >
                                                                    <Icon size={14} className="shrink-0" />
                                                                    {alg.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 pt-3 border-t border-slate-800">
                                                    <button onClick={() => { setEditingItem({}); setIsEditingItem(false); }} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors">Annulla</button>
                                                    <button onClick={handleSaveItem} disabled={!editingItem.name || !editingItem.price} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-95"><Save size={18} /> SALVA</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-8">
                                    {menuItems.length === 0 && <div className="text-center py-20 text-slate-600"><UtensilsCrossed size={64} className="mx-auto mb-4 opacity-50" /><p className="font-bold text-xl">Menu Vuoto</p><p className="text-sm">Aggiungi il tuo primo piatto usando il pulsante "Nuovo Piatto".</p></div>}
                                    {ADMIN_CATEGORY_ORDER.map(category => {
                                        const categoryItems = menuItems.filter(item => item.category === category);
                                        if (categoryItems.length === 0) return null;
                                        return (
                                            <div key={category} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                                                    <h3 className="text-xl font-bold text-white uppercase tracking-wide">{category}</h3>
                                                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">{categoryItems.length}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {categoryItems.map(item => (
                                                        <div key={item.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-blue-500 transition-all group flex flex-col gap-3 shadow-lg hover:shadow-xl cursor-pointer relative" onClick={() => { setEditingItem(item); setIsEditingItem(true); mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-20 h-20 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                                                    {item.image ? <img src={item.image} className="w-full h-full object-cover" alt={item.name} /> : <Utensils size={24} className="text-slate-600" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-bold text-white text-base line-clamp-2 leading-tight mb-1" title={item.name}>{item.name}</h4>
                                                                    <p className="text-orange-400 font-mono font-bold text-sm">€ {item.price.toFixed(2)}</p>
                                                                    {item.ingredients && <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{item.ingredients}</p>}
                                                                </div>
                                                            </div>
                                                            {item.allergens && item.allergens.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {item.allergens.slice(0, 4).map(alg => (
                                                                        <span key={alg} className="px-1.5 py-0.5 bg-orange-900/30 text-orange-400 border border-orange-900/50 rounded text-[9px] font-bold uppercase tracking-wide">{alg}</span>
                                                                    ))}
                                                                    {item.allergens.length > 4 && <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded text-[9px] font-bold">+{item.allergens.length - 4}</span>}
                                                                </div>
                                                            )}
                                                            <button onClick={(e) => { e.stopPropagation(); confirmDelete(item); }} className="absolute top-3 right-3 w-8 h-8 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100" title="Elimina piatto">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {adminTab === 'notif' && (
                            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><ArrowRightLeft className="text-purple-500" /> Smistamento Reparti</h3><p className="text-slate-400 text-sm mb-6">Decidi in quale monitor inviare gli ordini per ogni categoria.</p><div className="space-y-4">{ADMIN_CATEGORY_ORDER.map(cat => (<div key={cat} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800"><span className="font-bold text-sm text-slate-300">{cat}</span><div className="relative"><select value={tempDestinations[cat] || 'Cucina'} onChange={(e) => { const newDest = { ...tempDestinations, [cat]: e.target.value as Department }; setTempDestinations(newDest); setHasUnsavedDestinations(true); }} className="appearance-none bg-slate-800 text-white text-xs font-bold py-2 pl-3 pr-8 rounded-lg border border-slate-700 outline-none focus:border-purple-500"><option value="Cucina">Cucina</option><option value="Pizzeria">Pizzeria</option><option value="Pub">Pub / Bar</option><option value="Sala">Sala (Auto)</option></select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} /></div></div>))}</div></div>
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Printer className="text-blue-500" /> Stampa Scontrini (Beta)</h3><div className="space-y-3">{Object.keys(tempPrintSettings).map(key => (<div key={key} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800"><span className="font-bold text-sm text-slate-300">Stampa in {key}</span><button onClick={() => { const newSettings = { ...tempPrintSettings, [key]: !tempPrintSettings[key] }; setTempPrintSettings(newSettings); setHasUnsavedDestinations(true); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${tempPrintSettings[key] ? 'bg-green-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${tempPrintSettings[key] ? 'translate-x-6' : ''}`}></div></button></div>))}</div></div>
                                {hasUnsavedDestinations && (<div className="sticky bottom-6"><button onClick={saveDestinations} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg animate-bounce flex items-center justify-center gap-2"><Save size={20} /> SALVA MODIFICHE</button></div>)}
                            </div>
                        )}
                        {adminTab === 'marketing' && <MarketingPanel />}

                        {adminTab === 'subscription' && (
                            <div className="max-w-6xl mx-auto animate-fade-in pb-20 space-y-8">
                                {/* STATO ATTUALE */}
                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-3xl border border-slate-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 text-[200px] font-black text-white/5 leading-none">
                                        {daysRemaining !== null ? daysRemaining : '∞'}
                                    </div>
                                    <div className="relative z-10 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase mb-2 flex items-center gap-2">
                                                {subscriptionExpired ? <AlertTriangle size={14} className="text-red-500" /> : <Check size={14} className="text-green-500" />}
                                                STATO ATTUALE
                                            </p>
                                            <h3 className="text-4xl font-black text-white mb-1">
                                                {appSettings.restaurantProfile?.planType || 'Trial'}
                                                <span className={`ml-4 text-xs px-3 py-1 rounded-full ${subscriptionExpired ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {subscriptionExpired ? 'SCADUTO' : 'ATTIVO'}
                                                </span>
                                            </h3>
                                            <p className="text-slate-400 text-sm">
                                                Scadenza: <span className="font-mono">{appSettings.restaurantProfile?.subscriptionEndDate ? new Date(appSettings.restaurantProfile.subscriptionEndDate).toLocaleDateString() : 'Non impostato'}</span>
                                            </p>
                                        </div>
                                        {daysRemaining !== null && (
                                            <div className="text-right">
                                                <p className="text-6xl font-black text-white">{daysRemaining}</p>
                                                <p className="text-xs text-slate-400 font-bold uppercase">GIORNI RIMASTI</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SCEGLI IL TUO PIANO */}
                                <div>
                                    <h2 className="text-2xl font-black text-white mb-6 text-center flex items-center justify-center gap-2">
                                        <Sparkles className="text-yellow-500" size={28} />
                                        Scegli il tuo Piano
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* TRIAL - Gratis */}
                                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 hover:border-blue-500 transition-all flex flex-col">
                                            <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">TRIAL</h4>
                                            <div className="mb-4">
                                                <p className="text-4xl font-black text-white">Gratis</p>
                                                <p className="text-xs text-slate-500">15 Giorni</p>
                                            </div>
                                            <ul className="space-y-2 mb-6 flex-1 text-sm">
                                                <li className="flex items-center gap-2 text-slate-300">
                                                    <Check size={16} className="text-blue-500" /> Tutte le funzionalità
                                                </li>
                                                <li className="flex items-center gap-2 text-slate-300">
                                                    <Check size={16} className="text-blue-500" /> Menu Digitale
                                                </li>
                                                <li className="flex items-center gap-2 text-slate-300">
                                                    <Check size={16} className="text-blue-500" /> Nessun impegno
                                                </li>
                                            </ul>
                                            <div className="w-full py-3 text-center text-slate-500 font-bold text-sm bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                                                Piano Attuale
                                            </div>
                                        </div>

                                        {/* STANDARD MESE */}
                                        <div className={`bg-slate-900 p-6 rounded-2xl border ${promoData ? 'border-purple-500 relative overflow-hidden' : 'border-slate-700'} hover:border-cyan-500 transition-all flex flex-col`}>
                                            {promoData && (
                                                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded-bl-xl uppercase tracking-wider animate-pulse z-20">
                                                    {promoData.name} ATTIVA
                                                </div>
                                            )}
                                            <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">STANDARD MESE</h4>
                                            <div className="mb-4 relative">
                                                {promoData ? (
                                                    <>
                                                        <div className="flex items-baseline gap-2">
                                                            <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                                                € {parseFloat(promoData.cost).toFixed(2).replace('.', ',')}
                                                            </p>
                                                            <p className="text-lg font-bold text-slate-500 line-through decoration-red-500 decoration-2">
                                                                € {parseFloat(globalDefaultCost).toFixed(2).replace('.', ',')}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-purple-300 font-bold mb-1">
                                                            Offerta valida per {promoData.duration}
                                                        </p>
                                                        {/* Timer Inline */}
                                                        <PromoTimer deadlineHours={promoData.deadlineHours || '72'} lastUpdated={promoData.lastUpdated} />
                                                    </>
                                                ) : (
                                                    <p className="text-4xl font-black text-white">€ {parseFloat(globalDefaultCost).toFixed(2).replace('.', ',')}</p>
                                                )}
                                                <p className="text-xs text-slate-500">/mese</p>
                                            </div>
                                            <ul className="space-y-2 mb-6 flex-1 text-sm">
                                                <li className="flex items-center gap-2 text-slate-300">
                                                    <Check size={16} className="text-cyan-500" /> Tutte le funzionalità
                                                </li>
                                                <li className="flex items-center gap-2 text-slate-300">
                                                    <Check size={16} className="text-cyan-500" /> Multi Device Sync
                                                </li>
                                                <li className="flex items-center gap-2 text-slate-300">
                                                    <Check size={16} className="text-cyan-500" /> Aggiornamenti inclusi
                                                </li>
                                            </ul>
                                            <button onClick={() => openPaymentInstructions(promoData ? `Promo ${promoData.name}` : 'Standard Mensile', parseFloat(promoData ? promoData.cost : globalDefaultCost).toFixed(2).replace('.', ','))} className={`w-full py-3 ${promoData ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-900/20' : 'bg-slate-800 hover:bg-cyan-600'} text-white font-bold rounded-xl border ${promoData ? 'border-transparent' : 'border-slate-700 hover:border-cyan-500'} transition-all`}>
                                                {promoData ? `Attiva ${promoData.name}` : 'Attiva Mensile'}
                                            </button>
                                        </div>

                                        {/* STANDARD ANNO - BEST VALUE */}
                                        <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-2xl border-2 border-orange-500 flex flex-col relative transform lg:-translate-y-2 shadow-2xl shadow-orange-900/30">
                                            <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                                                BEST VALUE
                                            </div>
                                            <h4 className="text-sm font-bold text-orange-100 uppercase tracking-wider mb-2">STANDARD ANNO</h4>
                                            <div className="mb-4">
                                                <p className="text-4xl font-black text-white">€ {(parseFloat(globalDefaultCost) * 10).toFixed(0)}</p>
                                                <p className="text-xs text-orange-100">/anno</p>
                                            </div>
                                            <div className="bg-green-500/20 text-green-300 text-xs font-bold px-2 py-1 rounded mb-4 inline-block">
                                                🎁 2 MESI GRATIS
                                            </div>
                                            <ul className="space-y-2 mb-6 flex-1 text-sm">
                                                <li className="flex items-center gap-2 text-white">
                                                    <Check size={16} className="text-yellow-300" /> Tutte le funzionalità
                                                </li>
                                                <li className="flex items-center gap-2 text-white">
                                                    <Check size={16} className="text-yellow-300" /> AI Menu Intelligence
                                                </li>
                                                <li className="flex items-center gap-2 text-white">
                                                    <Check size={16} className="text-yellow-300" /> Priorità Supporto
                                                </li>
                                                <li className="flex items-center gap-2 text-white">
                                                    <Check size={16} className="text-yellow-300" /> Setup Gratuito
                                                </li>
                                            </ul>
                                            <button onClick={() => openPaymentInstructions('Standard Annuale', (parseFloat(globalDefaultCost) * 10).toFixed(2).replace('.', ','))} className="w-full py-4 bg-white hover:bg-yellow-400 text-orange-600 font-black rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95">
                                                ATTIVA ANNUALE
                                            </button>
                                        </div>

                                        {/* VIP - Contattaci */}
                                        <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-2xl border border-purple-500 hover:border-purple-400 transition-all flex flex-col">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Crown className="text-yellow-400" size={20} />
                                                <h4 className="text-sm font-bold text-purple-200 uppercase tracking-wider">VIP</h4>
                                            </div>
                                            <div className="mb-4">
                                                <p className="text-3xl font-black text-white">Contattaci</p>
                                                <p className="text-xs text-purple-300">Soluzioni su misura</p>
                                            </div>
                                            <ul className="space-y-2 mb-6 flex-1 text-sm">
                                                <li className="flex items-center gap-2 text-purple-200">
                                                    <Crown size={16} className="text-yellow-400" /> Funzioni Maggiori
                                                </li>
                                                <li className="flex items-center gap-2 text-purple-200">
                                                    <Crown size={16} className="text-yellow-400" /> Assistenza Dedicata
                                                </li>
                                                <li className="flex items-center gap-2 text-purple-200">
                                                    <Crown size={16} className="text-yellow-400" /> Modifiche Custom
                                                </li>
                                                <li className="flex items-center gap-2 text-purple-200">
                                                    <Crown size={16} className="text-yellow-400" /> Whitelabel
                                                </li>
                                            </ul>
                                            <button onClick={() => window.open(`mailto:${adminContactEmail}?subject=Richiesta Piano VIP`, '_blank')} className="w-full py-3 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl border border-purple-500 transition-all">
                                                Richiedi Info
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* DATI PER IL PAGAMENTO */}
                                <div id="bank-details" className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
                                    <div className="flex flex-col lg:flex-row gap-8">
                                        {/* Sinistra - Dati Bonifico */}
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                                <CreditCard className="text-blue-500" />
                                                Dati per il Pagamento
                                            </h3>
                                            <p className="text-slate-400 text-sm mb-6">
                                                Per attivare un piano, effettua il bonifico indicando il nome del ristorante nella causale. Invia la distinta a{' '}
                                                <a href={`mailto:${adminContactEmail}`} className="text-blue-400 hover:underline font-bold">
                                                    {adminContactEmail}
                                                </a>{' '}
                                                per l'attivazione immediata.
                                            </p>

                                            <div className="space-y-4">
                                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-700">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">IBAN</p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-mono text-white text-sm select-all">{adminIban}</p>
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(adminIban); showToast('IBAN copiato!', 'success'); }}
                                                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                                        >
                                                            <Copy size={16} className="text-slate-500 hover:text-white" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-700">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">INTESTATARIO</p>
                                                        <p className="text-white text-sm font-bold">{adminHolder}</p>
                                                    </div>
                                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-700">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">CAUSALE</p>
                                                        <p className="text-white text-sm font-bold">Abbonamento Risto demo</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Destra - QR Code Pagamento */}
                                        <div className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-xl">
                                            <div className="text-center mb-3">
                                                <p className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-1">PAGAMENTO SMART</p>
                                                <p className="text-slate-500 text-xs">Inquadra con l'app della banca</p>
                                            </div>
                                            <div className="w-40 h-40 bg-white flex items-center justify-center rounded-xl p-2 border-2 border-slate-200">
                                                <QRCodeGenerator
                                                    value={`BCD\n002\n2\nSCT\n\n${adminHolder}\n${adminIban}\nEUR\n\n\nAbbonamento ${new Date().toLocaleString('it-IT', { month: 'long' })} ${profileForm.name || restaurantName}`}
                                                    size={140}
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                    level="M"
                                                />
                                            </div>
                                            <p className="text-xs text-blue-600 font-bold mt-3 uppercase">PAGAMENTO SICURO</p>
                                        </div>
                                    </div>
                                </div>

                                {showPaymentModal?.isOpen && (
                                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                                        <div className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative animate-slide-up flex flex-col gap-6">
                                            <button onClick={() => setShowPaymentModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>

                                            <div className="text-center">
                                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                                                    <Banknote size={32} className="text-green-500" />
                                                </div>
                                                <h3 className="text-2xl font-black text-white mb-1">Attiva {showPaymentModal.plan}</h3>
                                                <p className="text-slate-400">Segui questi passaggi per l'attivazione immediata</p>
                                            </div>

                                            <div className="space-y-4 bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                                                <div className="flex gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">1</div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">Inquadra il QR Code</p>
                                                        <p className="text-xs text-slate-400">In basso trovi il QR Code per il pagamento automatico.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">2</div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">Effettua il Bonifico</p>
                                                        <p className="text-xs text-slate-400">Importo da saldare: <span className="text-white font-bold">€ {showPaymentModal.price}</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">3</div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">Causale Corretta</p>
                                                        <p className="text-xs text-slate-400">Assicurati che la causale includa:</p>
                                                        <ul className="text-xs text-orange-400 font-bold mt-1 list-disc pl-4">
                                                            <li>Nome del Ristorante</li>
                                                            <li>Tipo Abbonamento ({showPaymentModal.plan.includes('Mensile') ? 'Mese' : 'Annuale'})</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <button onClick={() => setShowPaymentModal(null)} className="w-full py-4 bg-white hover:bg-slate-200 text-slate-900 font-black rounded-xl transition-all shadow-lg active:scale-95">
                                                HO CAPITO, PROCEDO
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {adminTab === 'share' && (
                            <div className="space-y-8 pb-24 animate-fade-in">
                                {/* Header Sezione */}
                                <div className="text-center mb-8">
                                    <h2 className="text-4xl font-black text-white mb-2">Distribuzione Menu</h2>
                                    <p className="text-slate-400">Gestisci come i tuoi clienti visualizzano il tuo menu: digitale o cartaceo.</p>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
                                    {/* COLONNA 1: VERSIONE DIGITALE */}
                                    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col items-center shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 to-blue-600"></div>

                                        <div className="flex items-center gap-3 mb-6">
                                            <QrCode className="text-cyan-400" size={32} />
                                            <h3 className="text-2xl font-black text-white">Versione Digitale</h3>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-8 items-center w-full justify-center">

                                            {/* QR Code Card */}
                                            <div className="flex flex-col gap-4 items-center">
                                                <div className="bg-white p-4 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300">
                                                    {qrCodeUrl ? (
                                                        <img src={qrCodeUrl} alt="Menu QR" className="w-48 h-48 mx-auto mix-blend-multiply" />
                                                    ) : (
                                                        <div className="w-48 h-48 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                                                            QR non disponibile
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
                                                    <button
                                                        onClick={copyToClipboard}
                                                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 border border-slate-700 transition-all"
                                                    >
                                                        <Copy size={14} /> Copia
                                                    </button>
                                                    <button
                                                        onClick={handlePrintQR}
                                                        className="py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                                                    >
                                                        <Printer size={14} /> Stampa
                                                    </button>
                                                </div>

                                                <div className="w-full max-w-[250px] bg-slate-950 p-3 rounded-lg border border-slate-800 flex gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={digitalMenuLink}
                                                        className="flex-1 bg-transparent text-slate-400 text-[10px] font-mono select-all outline-none"
                                                    />
                                                    <button onClick={shareLink} className="text-cyan-400 hover:text-cyan-300">
                                                        <Share2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Preview iPhone Mini */}
                                            <div className="relative transform scale-75 origin-top md:origin-center">
                                                <div className="h-[500px] w-[240px] bg-slate-950 border-[8px] border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden pointer-events-none select-none">
                                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30"></div>
                                                    <div className="absolute inset-0 bg-slate-900 rounded-[2rem] overflow-hidden">
                                                        <DigitalMenu
                                                            restaurantId={session?.user?.id}
                                                            isPreview
                                                            activeMenuData={menuItems}
                                                            activeRestaurantName={profileForm.name}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COLONNA 2: VERSIONE CARTACEA */}
                                    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col items-center shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>

                                        <div className="flex items-center gap-3 mb-6">
                                            <FileText className="text-orange-500" size={32} />
                                            <h3 className="text-2xl font-black text-white">Versione Cartacea</h3>
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center items-center gap-8 w-full">

                                            {/* A5 Preview Grande - Clickabile */}
                                            <div
                                                className="relative group cursor-pointer"
                                                onClick={() => setShowPrintableMenu(true)}
                                            >
                                                {/* Foglio Dietro (Effetto Pila) */}
                                                <div className="absolute top-2 -right-4 w-[210px] h-[297px] bg-white rounded shadow-md transform rotate-6 opacity-30"></div>
                                                <div className="absolute top-1 -right-2 w-[210px] h-[297px] bg-white rounded shadow-md transform rotate-3 opacity-60"></div>

                                                {/* Foglio Davanti */}
                                                <div className="relative w-[210px] h-[297px] bg-white rounded shadow-2xl overflow-hidden flex flex-col items-center pt-8 hover:-translate-y-2 transition-transform duration-300 border border-slate-200">
                                                    {/* Mini Logo */}
                                                    {profileForm.logo ? (
                                                        <div className="w-16 h-16 rounded-full overflow-hidden border border-orange-200 mb-4 shadow-sm">
                                                            <img src={profileForm.logo} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <ChefHat size={32} className="text-orange-500 mb-4" />
                                                    )}

                                                    {/* Testo simulato */}
                                                    <div className="w-32 h-2 bg-slate-800 rounded mb-2"></div>
                                                    <div className="w-24 h-1 bg-slate-300 rounded mb-1"></div>
                                                    <div className="w-28 h-1 bg-slate-300 rounded mb-6"></div>

                                                    <div className="w-10 h-10 rounded-full border border-orange-100 flex items-center justify-center mb-8">
                                                        <span className="text-xs text-orange-500">★</span>
                                                    </div>

                                                    {/* Footer QR simulato */}
                                                    <div className="mt-auto mb-6 flex flex-col items-center gap-1 opacity-50">
                                                        <div className="w-12 h-12 bg-slate-100 rounded"></div>
                                                        <div className="w-16 h-1 bg-slate-200 rounded"></div>
                                                    </div>

                                                    {/* Overlay Hover */}
                                                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 flex items-center justify-center transition-colors">
                                                        <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur px-4 py-2 rounded-full font-bold text-slate-900 shadow-xl transform scale-90 group-hover:scale-100 transition-all">
                                                            Clicca per Anteprima
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center gap-2">
                                                <p className="text-slate-400 text-sm max-w-xs text-center">
                                                    Genera automaticamente un PDF A5 professionale con copertina, lista piatti e QR code.
                                                </p>
                                                <button
                                                    onClick={() => setShowPrintableMenu(true)}
                                                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 transform active:scale-95 transition-all flex items-center gap-2 text-lg"
                                                >
                                                    <Printer size={20} />
                                                    GENERATORE DI MENU
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COLONNA 3: LOCANDINA DELIVERY */}
                                    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col items-center shadow-xl relative overflow-hidden xl:col-span-2 2xl:col-span-1">
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-600 to-yellow-500"></div>

                                        <div className="flex items-center gap-3 mb-6">
                                            <Bike className="text-orange-500" size={32} />
                                            <h3 className="text-2xl font-black text-white">Locandina Delivery</h3>
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center items-center gap-6 w-full py-4 text-center">
                                            <div
                                                className="w-48 aspect-[148/210] bg-slate-950 border-4 border-slate-800 rounded-lg relative overflow-hidden group cursor-pointer shadow-2xl hover:-translate-y-2 transition-transform"
                                                onClick={() => setShowDeliveryFlyer(true)}
                                            >
                                                {/* Preview Content */}
                                                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-2 p-2">
                                                    <div className="w-12 h-12 rounded-full border-2 border-orange-600 bg-slate-800"></div>
                                                    <div className="w-20 h-1 bg-orange-600"></div>
                                                    <QrCode className="text-white opacity-80" size={60} />
                                                </div>
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                                    <span className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded">ANTEPRIMA</span>
                                                </div>
                                            </div>

                                            <p className="text-slate-400 text-sm max-w-xs">
                                                Crea una locandina A5 "aggressiva" ottimizzata per promuovere il tuo servizio di delivery con QR code.
                                            </p>

                                            <button
                                                onClick={() => setShowDeliveryFlyer(true)}
                                                className="px-8 py-3 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-600 text-white font-black rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                <Bike size={20} className="text-orange-500" />
                                                CREA LOCANDINA
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                        {adminTab === 'analytics' && (
                            <div className="w-full min-h-full bg-slate-950 text-white p-6 pb-24 overflow-y-auto">
                                <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                                    {/* Header & Date Selector */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <h2 className="text-4xl font-black text-white mb-2">Business Intelligence</h2>
                                            <p className="text-slate-400 text-sm flex items-center gap-2">
                                                <MapPin size={16} className="text-slate-500" />
                                                {profileForm.name ? profileForm.name : 'Località non impostata'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shadow-lg">
                                            <button
                                                onClick={() => {
                                                    const d = new Date(selectedDate);
                                                    d.setDate(d.getDate() - 1);
                                                    setSelectedDate(d);
                                                }}
                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <div className="flex items-center gap-3 px-2">
                                                <Calendar className="text-orange-500" size={20} />
                                                <span className="font-bold text-lg capitalize">
                                                    {selectedDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const d = new Date(selectedDate);
                                                    d.setDate(d.getDate() + 1);
                                                    setSelectedDate(d);
                                                }}
                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* KPI Metrics Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        {/* Incasso Netto */}
                                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
                                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Euro size={80} />
                                            </div>
                                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                <Wallet size={14} /> Incasso Netto
                                            </div>
                                            <div className="text-xl md:text-2xl font-black text-white whitespace-nowrap">
                                                € {(analyticsData?.revenue || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        {/* Piatti Serviti */}
                                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
                                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Utensils size={80} />
                                            </div>
                                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                <Utensils size={14} /> Piatti Serviti
                                            </div>
                                            <div className="text-3xl font-black text-white">
                                                {analyticsData?.totalDishes || 0}
                                            </div>
                                        </div>

                                        {/* Tempo Medio Attesa */}
                                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
                                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Clock size={80} />
                                            </div>
                                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                <History size={14} /> Tempo Medio Attesa
                                            </div>
                                            <div className="text-3xl font-black text-white mb-1">
                                                {analyticsData?.avgWaitTime || 0} <span className="text-base font-normal text-slate-500">min</span>
                                            </div>
                                            <div className={`text-xs ${(analyticsData?.avgWaitTime || 0) <= 20 ? 'text-green-500' : 'text-orange-500'}`}>Target: &lt; 20 min</div>
                                        </div>

                                        {/* Tavoli Serviti */}
                                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
                                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Users size={80} />
                                            </div>
                                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                <Users size={14} /> Tavoli Serviti
                                            </div>
                                            <div className="text-3xl font-black text-white">
                                                {analyticsData?.totalOrders || 0}
                                            </div>
                                        </div>

                                        {/* Food Cost */}
                                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
                                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <TrendingUp size={80} />
                                            </div>
                                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                <TrendingDown size={14} /> Food Cost (Est. 32%)
                                            </div>
                                            <div className="text-3xl font-black text-orange-500 mb-1">
                                                € {(analyticsData?.foodCost || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-xs text-slate-500">Scontrino: € {(analyticsData?.avgOrder || 0).toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {/* Middle Section: Consumption & Top Items */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Consumo Materie Prime */}
                                        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl relative min-h-[300px] flex flex-col">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                                        <Package size={24} />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white">Consumo Materie Prime</h3>
                                                </div>
                                                <button className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-slate-400 transition-colors">
                                                    Calcolato su Ingredienti Menu
                                                </button>
                                            </div>

                                            <div className="flex-1 w-full overflow-y-auto pr-2">
                                                {analyticsData?.topIngredients?.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {analyticsData.topIngredients.map((item: any, index: number) => (
                                                            <div key={index} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                                                                        {index + 1}
                                                                    </div>
                                                                    <span className="font-bold text-slate-200 capitalize">{item.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-white bg-slate-800 px-2 py-1 rounded">{item.count}</span>
                                                                    <span className="text-xs text-slate-500">unità</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50 h-full">
                                                        <Package size={48} strokeWidth={1} />
                                                        <div className="text-center">
                                                            <p className="text-sm">Nessun dato ingredienti disponibile.</p>
                                                            <p className="text-xs">Assicurati di aver compilato il campo "Ingredienti" nel menu.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Top Piatti */}
                                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl min-h-[300px]">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-500">
                                                    <Trophy size={24} />
                                                </div>
                                                <h3 className="text-xl font-bold text-white">Top 5 Piatti</h3>
                                            </div>

                                            <div className="space-y-3">
                                                {analyticsData?.topItems?.length > 0 ? (
                                                    analyticsData.topItems.map((item, index) => (
                                                        <div key={index} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black' :
                                                                    index === 1 ? 'bg-slate-400 text-black' :
                                                                        index === 2 ? 'bg-orange-700 text-white' :
                                                                            'bg-slate-700 text-white'
                                                                    }`}>
                                                                    {index + 1}
                                                                </div>
                                                                <span className="font-medium text-slate-200">{item[0]}</span>
                                                            </div>
                                                            <span className="font-bold text-slate-400">{item[1]} <span className="text-xs font-normal">ordini</span></span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10 text-slate-600 italic">
                                                        Nessun dato.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Piatti (Meno Richiesti) */}
                                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="bg-red-500/20 p-2 rounded-lg text-red-400">
                                                <TrendingDown size={24} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Piatti Meno Richiesti</h3>
                                        </div>

                                        <div className="space-y-3">
                                            {analyticsData?.bottomItems?.length > 0 ? (
                                                analyticsData.bottomItems.map((item: [string, number], index: number) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-red-900/30 hover:border-red-800/50 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-red-900/50 flex items-center justify-center font-bold text-sm text-red-300">
                                                                {index + 1}
                                                            </div>
                                                            <span className="font-medium text-slate-300">{item[0]}</span>
                                                        </div>
                                                        <span className="font-bold text-red-400">{item[1]} <span className="text-xs font-normal text-slate-500">ordini</span></span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 text-slate-600 italic">
                                                    Nessun dato sufficiente.
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-slate-500 text-xs mt-4 text-center">
                                            💡 Considera promozioni o modifiche per questi piatti
                                        </p>
                                    </div>

                                    {/* AI Supply Chain Section */}
                                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 relative overflow-hidden border border-indigo-500/30 shadow-2xl">
                                        <div className="absolute right-0 bottom-0 opacity-10 translate-y-1/3 translate-x-1/4">
                                            <Factory size={400} />
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                                                    <Bot size={32} className="text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-white">Supply Chain & Efficienza AI</h3>
                                                    <p className="text-indigo-200">Analisi operativa, fornitori e food cost per <span className="font-bold text-white">la tua zona</span>.</p>
                                                </div>
                                            </div>

                                            <div className="mt-8 bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center max-w-3xl mx-auto">
                                                {aiAnalysisResult ? (
                                                    <div className="text-left space-y-4">
                                                        <div className="flex items-start gap-4">
                                                            <Sparkles className="text-yellow-400 shrink-0 mt-1" />
                                                            <div className="prose prose-invert max-w-none">
                                                                <p className="text-lg text-slate-200 leading-relaxed whitespace-pre-line">
                                                                    {aiAnalysisResult}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <p className="text-lg text-slate-300">
                                                            L'intelligenza artificiale valuterà la velocità della cucina (0 min/tavolo),<br />
                                                            i flussi di lavoro e i consumi per suggerirti miglioramenti strutturali.
                                                        </p>
                                                        <div className="flex justify-center">
                                                            <button
                                                                onClick={handleGenerateAnalysis}
                                                                disabled={isAnalyzing}
                                                                className="px-8 py-4 bg-white hover:bg-slate-100 text-indigo-900 font-black rounded-xl shadow-lg transition-all flex items-center gap-3 disabled:opacity-70 transform hover:scale-105"
                                                            >
                                                                {isAnalyzing ? (
                                                                    <>
                                                                        <Loader className="animate-spin" size={20} />
                                                                        Analisi in corso...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Sparkles size={20} className="text-indigo-600" />
                                                                        GENERA CONSULENZA COMPLETA
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {adminTab === 'receipts' && (
                            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">

                                {/* Header Section with Date & Summary */}
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <h2 className="text-4xl font-black text-white flex items-center gap-3">
                                            <Receipt className="text-yellow-500" size={40} />
                                            Movimenti Cassa
                                        </h2>

                                        {/* Date Selector */}
                                        <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 flex items-center shadow-lg">
                                            <button
                                                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }}
                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <div className="flex items-center gap-3 px-2">
                                                <Calendar className="text-orange-500" size={20} />
                                                <span className="font-bold text-lg capitalize text-white">
                                                    {selectedDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }}
                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Daily Summary Cards (Top Presentation) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(() => {
                                            // Use ordersForAnalytics (guaranteed to be defined in App scope)
                                            const dayOrders = ordersForAnalytics.filter(o => {
                                                const orderDate = new Date(o.timestamp);
                                                return orderDate.toDateString() === selectedDate.toDateString();
                                            });
                                            // Fix: Access item.menuItem.price instead of item.price
                                            const totalRevenue = dayOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.menuItem.price * i.quantity), 0), 0);
                                            const totalReceipts = dayOrders.length;
                                            const avgReceipt = totalReceipts > 0 ? totalRevenue / totalReceipts : 0;

                                            return (
                                                <>
                                                    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                                                        <div className="absolute right-0 top-0 p-4 opacity-5"><Euro size={80} /></div>
                                                        <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400">
                                                            <Wallet size={32} />
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Incasso Giornaliero</p>
                                                            <p className="text-3xl font-black text-white">€ {totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                                                        <div className="absolute right-0 top-0 p-4 opacity-5"><Receipt size={80} /></div>
                                                        <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400">
                                                            <Printer size={32} />
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Scontrini Emessi</p>
                                                            <p className="text-3xl font-black text-white">{totalReceipts}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                                                        <div className="absolute right-0 top-0 p-4 opacity-5"><TrendingUp size={80} /></div>
                                                        <div className="bg-purple-500/10 p-3 rounded-xl text-purple-400">
                                                            <BarChart3 size={32} />
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Scontrino Medio</p>
                                                            <p className="text-3xl font-black text-white">€ {avgReceipt.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Receipts List */}
                                <div className="bg-slate-950 rounded-3xl border border-slate-800/50 p-6 shadow-2xl">
                                    {(() => {
                                        const dayOrders = ordersForAnalytics.filter(o => {
                                            const orderDate = new Date(o.timestamp);
                                            return orderDate.toDateString() === selectedDate.toDateString();
                                        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                                        if (dayOrders.length === 0) {
                                            return (
                                                <div className="text-center py-20 flex flex-col items-center">
                                                    <div className="bg-slate-900 p-6 rounded-full mb-4 opacity-50">
                                                        <Receipt size={48} className="text-slate-500" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white mb-2">Nessun movimento</h3>
                                                    <p className="text-slate-500 max-w-sm">
                                                        Non ci sono scontrini emessi per la data selezionata.
                                                        Gli ordini completati appariranno qui automaticamente.
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                {dayOrders.map(order => {
                                                    const orderTime = new Date(order.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                                                    // Fix: Access item.menuItem.price
                                                    const orderTotal = order.items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

                                                    return (
                                                        <div key={order.id} className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col">
                                                            {/* Receipt Header Style */}
                                                            <div className="bg-slate-100 p-4 border-b border-dashed border-slate-300 flex justify-between items-center">
                                                                <div>
                                                                    <span className="block text-xs text-slate-500 font-bold uppercase tracking-wider">Tavolo</span>
                                                                    <span className="text-2xl font-black text-slate-800">{order.tableNumber.replace('_HISTORY', '')}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="block text-xs text-slate-500 font-bold uppercase tracking-wider">{orderTime}</span>
                                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${order.status === 'Servito' ? 'bg-green-100 text-green-700' :
                                                                        order.status === 'Pronto' ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-slate-200 text-slate-600'
                                                                        }`}>
                                                                        {order.status}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Items List */}
                                                            <div className="p-4 flex-1 max-h-[250px] overflow-y-auto">
                                                                <ul className="space-y-2 text-sm font-mono">
                                                                    <li className="text-center text-xs text-slate-400 mb-2">--- INIZIO SCONTRINO ---</li>
                                                                    {order.items.map((item, idx) => (
                                                                        <li key={idx} className="flex justify-between items-start border-b border-slate-100 pb-1 last:border-0">
                                                                            <span className="font-bold w-8">{item.quantity}x</span>
                                                                            <span className="flex-1 truncate mr-2">{item.menuItem.name}</span>
                                                                            <span className="text-slate-600">€ {(item.menuItem.price * item.quantity).toFixed(2)}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>

                                                            {/* Total & Actions */}
                                                            <div className="bg-slate-50 p-4 border-t border-dashed border-slate-300">
                                                                <div className="flex justify-between items-end mb-4">
                                                                    <span className="text-slate-500 font-bold uppercase text-xs">Totale Complessivo</span>
                                                                    <span className="text-3xl font-black text-slate-900">€ {orderTotal.toFixed(2)}</span>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <button
                                                                        onClick={() => {
                                                                            const printWindow = window.open('', '', 'width=300,height=600');
                                                                            if (printWindow) {
                                                                                printWindow.document.write(`
                                                                                <html>
                                                                                <head>
                                                                                    <title>Scontrino Tavolo ${order.tableNumber.replace('_HISTORY', '')}</title>
                                                                                    <style>
                                                                                        body { font-family: 'Courier New', monospace; padding: 10px; width: 100%; max-width: 300px; margin: 0 auto; color: #000; background: #fff; }
                                                                                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                                                                                        .title { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; }
                                                                                        .info { font-size: 12px; margin: 5px 0; }
                                                                                        .item { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
                                                                                        .total-section { border-top: 2px dashed #000; margin-top: 15px; padding-top: 10px; }
                                                                                        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 5px; }
                                                                                        .footer { text-align: center; margin-top: 30px; font-size: 10px; text-transform: uppercase; }
                                                                                    </style>
                                                                                </head>
                                                                                <body>
                                                                                    <div class="header">
                                                                                        <p class="title">${restaurantName}</p>
                                                                                        <p class="info">Via Roma 123, Italia</p>
                                                                                        <p class="info">P.IVA: 12345678901</p>
                                                                                        <br/>
                                                                                        <p class="info">Scontrino Non Fiscale</p>
                                                                                        <p class="info">Tavolo: ${order.tableNumber.replace('_HISTORY', '')} • ${order.waiterName || 'Sala'}</p>
                                                                                        <p class="info">${new Date(order.timestamp).toLocaleString('it-IT')}</p>
                                                                                    </div>
                                                                                    
                                                                                    ${order.items.map(item => `
                                                                                        <div class="item">
                                                                                            <span>${item.quantity} x ${item.menuItem.name}</span>
                                                                                            <span>${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                                                                                        </div>
                                                                                    `).join('')}
                                                                                    
                                                                                    <div class="total-section">
                                                                                        <div class="total-row">
                                                                                            <span>TOTALE</span>
                                                                                            <span>€ ${orderTotal.toFixed(2)}</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div class="footer">
                                                                                        <p>Grazie e Arrivederci</p>
                                                                                        <p>Software: RistoSync AI</p>
                                                                                    </div>
                                                                                    <script>window.onload = () => { window.print(); window.close(); }</script>
                                                                                </body>
                                                                                </html>
                                                                            `);
                                                                                printWindow.document.close();
                                                                            }
                                                                        }}
                                                                        className="py-2.5 bg-slate-900 hover:bg-black text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                                                    >
                                                                        <Printer size={16} /> Stampa
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const receiptText = `${restaurantName}\nTavolo: ${order.tableNumber.replace('_HISTORY', '')}\nData: ${new Date(order.timestamp).toLocaleString('it-IT')}\n--------------------------------\n${order.items.map(i => `${i.quantity}x ${i.menuItem.name} ... € ${(i.menuItem.price * i.quantity).toFixed(2)}`).join('\n')}\n--------------------------------\nTOTALE: € ${orderTotal.toFixed(2)}`;
                                                                            alert(receiptText);
                                                                        }}
                                                                        className="py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                                                                    >
                                                                        <Eye size={16} /> Anteprima
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                        {adminTab === 'ai' && (
                            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Key className="text-yellow-500" /> Configurazione API</h3>
                                    <p className="text-slate-400 text-sm mb-4">Inserisci la tua Google Gemini API Key per abilitare le funzioni intelligenti.</p>
                                    <div className="flex gap-2">
                                        <input type="password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="Incolla la tua API Key qui..." className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500" />
                                        <button onClick={handleSaveApiKey} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 py-3 rounded-xl transition-colors">Salva</button>
                                        {hasApiKey && (
                                            <>
                                                <button
                                                    onClick={async () => {
                                                        setIsChatting(true);
                                                        const testResult = await askChefAI("Test connessione", null);
                                                        showToast(testResult.includes('❌') || testResult.includes('⏳') || testResult.includes('🔒') || testResult.includes('🌐') ? testResult : '✅ API Key funzionante!', testResult.includes('❌') || testResult.includes('⏳') || testResult.includes('🔒') || testResult.includes('🌐') ? 'error' : 'success');
                                                        setIsChatting(false);
                                                    }}
                                                    disabled={isChatting}
                                                    className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                                                    title="Testa la connessione API"
                                                >
                                                    {isChatting ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                                    Test
                                                </button>
                                                <button onClick={handleRemoveApiKey} className="bg-slate-800 hover:bg-red-600/20 hover:text-red-500 text-slate-400 p-3 rounded-xl transition-colors border border-slate-700 hover:border-red-500/50" title="Rimuovi API Key">
                                                    <Trash2 size={20} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Non hai una chiave? <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">Richiedila qui</a>.</p>
                                    {hasApiKey && (
                                        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                                            <p className="text-xs text-blue-300 flex items-center gap-2">
                                                <Info size={14} />
                                                <span>💡 <strong>Suggerimento:</strong> Le API gratuite hanno limiti giornalieri. Se ricevi errori di quota, riprova domani o passa a un piano a pagamento su Google AI Studio.</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col h-[500px]">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Bot className="text-blue-400" /> Chef Assistant</h3>
                                    <div className="flex-1 bg-slate-950 rounded-xl border border-slate-700 p-4 overflow-y-auto mb-4">
                                        {chatResponse ? (
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0"><Bot size={16} className="text-white" /></div>
                                                <div className="bg-slate-800 p-3 rounded-r-xl rounded-bl-xl text-sm leading-relaxed text-slate-200">{chatResponse}</div>
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-center text-sm mt-10">Chiedimi qualcosa sul menu, sugli allergeni o per un consiglio!</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} placeholder="Fai una domanda allo Chef AI..." className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" onKeyDown={(e) => e.key === 'Enter' && handleAskChef()} />
                                        <button onClick={handleAskChef} disabled={isChatting} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50">{isChatting ? <Loader className="animate-spin" /> : <Send size={20} />}</button>
                                    </div>
                                </div>
                            </div>
                        )
                        }

                        {adminTab === 'messages' && (
                            <div className="h-full p-6 animate-fade-in">
                                <div className="max-w-6xl mx-auto h-[600px] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                                    <MessagesPanel session={session} showToast={showToast} showConfirm={showConfirm} />
                                </div>
                            </div>
                        )}
                        {adminTab === 'info' && (
                            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
                                <h2 className="text-3xl font-black text-white mb-4">Benvenuto in RistoSync!</h2>

                                {/* HERO PRESENTATION */}
                                <div className="bg-gradient-to-br from-orange-600 to-red-600 p-8 rounded-3xl shadow-2xl text-white">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                            <ChefHat size={32} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black">RistoSync AI</h3>
                                            <p className="text-white/80 text-sm">Il Sistema Gestionale Smart per il Tuo Ristorante</p>
                                        </div>
                                    </div>
                                    <p className="text-white/90 leading-relaxed mb-6">
                                        RistoSync è la soluzione completa per gestire ordini, menu e comunicazione tra sala e cucina in tempo reale.
                                        Progettato per ristoranti, pizzerie, pub e bar che vogliono digitalizzare il proprio servizio senza complicazioni.
                                    </p>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                                <Check size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg">🎉 Prova Gratuita 15 Giorni</p>
                                                <p className="text-white/80 text-sm">Tutte le funzionalità sbloccate per testare l'app senza limiti!</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* HOW IT WORKS - TUTORIAL */}
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                    <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-xl">
                                        <Lightbulb className="text-yellow-500" /> Come Funziona
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">1</div>
                                                <h4 className="font-bold text-white">Configura il Menu</h4>
                                            </div>
                                            <p className="text-slate-400 text-sm">Vai in "Gestione Menu" e aggiungi i tuoi piatti con prezzi, ingredienti e allergeni. Puoi anche importare da file JSON o usare l'AI!</p>
                                        </div>
                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold">2</div>
                                                <h4 className="font-bold text-white">Imposta le Postazioni</h4>
                                            </div>
                                            <p className="text-slate-400 text-sm">In "Impostazioni" configura dove vanno gli ordini: Cucina, Pizzeria, Pub. Ogni postazione riceverà solo i suoi piatti.</p>
                                        </div>
                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">3</div>
                                                <h4 className="font-bold text-white">Cameriere Prende Ordini</h4>
                                            </div>
                                            <p className="text-slate-400 text-sm">Il cameriere usa il suo tablet/telefono per inserire gli ordini. Seleziona il tavolo, aggiunge i piatti e invia alla cucina in un tap!</p>
                                        </div>
                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">4</div>
                                                <h4 className="font-bold text-white">Cucina Riceve e Conferma</h4>
                                            </div>
                                            <p className="text-slate-400 text-sm">In cucina vedono l'ordine in tempo reale. Quando è pronto, marcano come completato e il cameriere viene notificato!</p>
                                        </div>
                                    </div>
                                </div>

                                {/* FEATURES */}
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                    <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-xl">
                                        <Star className="text-orange-500" /> Funzionalità Principali
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {[
                                            { icon: <QrCode size={20} />, label: "Menu Digitale QR" },
                                            { icon: <Smartphone size={20} />, label: "Ordini da Tablet" },
                                            { icon: <Bell size={20} />, label: "Notifiche Real-Time" },
                                            { icon: <BarChart size={20} />, label: "Analytics & Report" },
                                            { icon: <Sparkles size={20} />, label: "AI Integrata" },
                                            { icon: <Receipt size={20} />, label: "Scontrini Digitali" },
                                            { icon: <Users size={20} />, label: "Multi-Postazione" },
                                            { icon: <Cloud size={20} />, label: "Sync Cloud" },
                                            { icon: <Printer size={20} />, label: "Stampa Ordini" },
                                        ].map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-lg text-sm">
                                                <span className="text-orange-500">{f.icon}</span>
                                                <span className="text-slate-300 font-medium">{f.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* CONTACT & APP INFO */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Headphones className="text-blue-500" /> Contatti Assistenza</h3>
                                        <ul className="space-y-4">
                                            <li className="flex items-center gap-3 text-slate-300"><Mail className="text-blue-500" /> {adminContactEmail}</li>
                                            <li className="flex items-center gap-3 text-slate-300"><Phone className="text-green-500" /> {adminPhone}</li>
                                            <li className="flex items-center gap-3 text-slate-300"><Globe className="text-purple-500" /> www.ristosyncai.it</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Info className="text-slate-400" /> Informazioni App</h3>
                                        <ul className="space-y-4">
                                            <li className="flex justify-between text-sm"><span className="text-slate-500">Versione</span><span className="text-white font-mono">2.4.0 (Cloud)</span></li>
                                            <li className="flex justify-between text-sm"><span className="text-slate-500">Stato Sync</span><span className="text-green-400 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>Online</span></li>
                                            <li className="flex justify-between text-sm"><span className="text-slate-500">Storage</span><span className="text-white font-mono">Supabase Enterprise</span></li>
                                        </ul>
                                    </div>
                                </div>

                                {/* LEGAL SECTION */}
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                    <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-xl">
                                        <Shield className="text-slate-400" /> Informazioni Legali
                                    </h3>

                                    {/* Titolare Trattamento Dati */}
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><User className="text-blue-500" size={16} /> Titolare del Trattamento Dati</h4>
                                        <p className="text-slate-300 text-sm leading-relaxed">
                                            <strong>Castro Massimo</strong><br />
                                            Email: {adminContactEmail}<br />
                                            Telefono: {adminPhone}<br />
                                            I dati sono conservati su server <strong>Supabase</strong> (infrastruttura cloud conforme GDPR) e non verranno in alcun modo divulgati, venduti o ceduti a terzi.
                                        </p>
                                    </div>

                                    {/* Accordion-style Legal Docs */}
                                    <div className="space-y-4">
                                        {/* TERMINI E CONDIZIONI */}
                                        <details className="group bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors">
                                                <span className="font-bold text-white flex items-center gap-2"><FileText size={16} className="text-orange-500" /> Termini e Condizioni d'Uso</span>
                                                <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="p-4 pt-0 text-slate-400 text-xs leading-relaxed space-y-3 border-t border-slate-700">
                                                <p><strong className="text-slate-300">1. Oggetto del Servizio</strong><br />RistoSync è un software gestionale cloud per la gestione di ordini, menu e comunicazioni interne di attività ristorative. L'accesso e l'utilizzo del servizio implicano l'accettazione dei presenti termini.</p>
                                                <p><strong className="text-slate-300">2. Registrazione e Account</strong><br />L'utente si impegna a fornire dati veritieri durante la registrazione e a mantenere riservate le proprie credenziali. L'account è personale e non cedibile.</p>
                                                <p><strong className="text-slate-300">3. Periodo di Prova</strong><br />Il servizio offre un periodo di prova gratuita di 15 giorni con accesso completo a tutte le funzionalità. Al termine, l'utente potrà scegliere di sottoscrivere un abbonamento.</p>
                                                <p><strong className="text-slate-300">4. Obblighi dell'Utente</strong><br />L'utente si impegna a utilizzare il servizio in conformità alle leggi vigenti, a non tentare accessi non autorizzati ai sistemi e a non utilizzare il software per scopi illeciti.</p>
                                                <p><strong className="text-slate-300">5. Proprietà Intellettuale</strong><br />Tutti i diritti sul software, marchi, loghi e contenuti sono di proprietà esclusiva di Castro Massimo. È vietata la riproduzione non autorizzata.</p>
                                                <p><strong className="text-slate-300">6. Limitazione di Responsabilità</strong><br />Il servizio viene fornito "così com'è". Non si garantisce l'assenza di interruzioni o errori. Il titolare non è responsabile per danni indiretti derivanti dall'uso del servizio.</p>
                                                <p><strong className="text-slate-300">7. Modifiche ai Termini</strong><br />Il titolare si riserva il diritto di modificare i presenti termini con preavviso di 30 giorni tramite comunicazione via email o notifica in-app.</p>
                                                <p><strong className="text-slate-300">8. Foro Competente</strong><br />Per qualsiasi controversia sarà competente il Foro di residenza del titolare.</p>
                                            </div>
                                        </details>

                                        {/* PRIVACY POLICY */}
                                        <details className="group bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors">
                                                <span className="font-bold text-white flex items-center gap-2"><Lock size={16} className="text-green-500" /> Privacy Policy (GDPR)</span>
                                                <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="p-4 pt-0 text-slate-400 text-xs leading-relaxed space-y-3 border-t border-slate-700">
                                                <p><strong className="text-slate-300">Titolare del Trattamento</strong><br />Castro Massimo - Email: {adminContactEmail}</p>
                                                <p><strong className="text-slate-300">Tipologia di Dati Raccolti</strong><br />Raccogliamo: dati di registrazione (email, nome ristorante), dati operativi (menu, ordini), dati di utilizzo (log, analytics anonimizzati). Non raccogliamo dati sensibili dei clienti finali.</p>
                                                <p><strong className="text-slate-300">Finalità del Trattamento</strong><br />I dati sono trattati per: erogazione del servizio, assistenza tecnica, miglioramento dell'esperienza utente, comunicazioni di servizio.</p>
                                                <p><strong className="text-slate-300">Base Giuridica</strong><br />Il trattamento si basa sul consenso espresso al momento della registrazione e sull'esecuzione del contratto di servizio.</p>
                                                <p><strong className="text-slate-300">Conservazione dei Dati</strong><br />I dati sono conservati su server Supabase (AWS, regione EU) con crittografia at-rest e in-transit. I dati vengono conservati per la durata dell'abbonamento + 12 mesi per obblighi legali.</p>
                                                <p><strong className="text-slate-300">Condivisione con Terzi</strong><br />I dati NON vengono venduti, ceduti o condivisi con terze parti per finalità commerciali. Possono essere condivisi solo con fornitori tecnici (es. Supabase per hosting) strettamente necessari all'erogazione del servizio.</p>
                                                <p><strong className="text-slate-300">Diritti dell'Interessato</strong><br />Ai sensi degli artt. 15-22 GDPR, l'utente ha diritto di: accesso, rettifica, cancellazione ("diritto all'oblio"), limitazione, portabilità e opposizione. Per esercitare tali diritti, contattare: {adminContactEmail}</p>
                                                <p><strong className="text-slate-300">Data Protection Officer (DPO)</strong><br />Per appuntamenti legati al trattamento dati: {adminContactEmail}</p>
                                            </div>
                                        </details>

                                        {/* COOKIE POLICY */}
                                        <details className="group bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors">
                                                <span className="font-bold text-white flex items-center gap-2"><Cookie size={16} className="text-yellow-500" /> Cookie Policy</span>
                                                <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="p-4 pt-0 text-slate-400 text-xs leading-relaxed space-y-3 border-t border-slate-700">
                                                <p><strong className="text-slate-300">Cosa sono i Cookie</strong><br />I cookie sono piccoli file di testo memorizzati sul dispositivo dell'utente per migliorare l'esperienza di navigazione.</p>
                                                <p><strong className="text-slate-300">Cookie Tecnici (Necessari)</strong><br />Utilizziamo cookie strettamente necessari per: autenticazione utente, mantenimento della sessione, preferenze di utilizzo. Questi cookie non richiedono consenso in quanto essenziali per il funzionamento del servizio.</p>
                                                <p><strong className="text-slate-300">Cookie Analitici</strong><br />Potremmo utilizzare cookie analitici anonimizzati per comprendere come gli utenti interagiscono con l'applicazione e migliorare il servizio. Nessun dato personale identificabile viene raccolto tramite questi cookie.</p>
                                                <p><strong className="text-slate-300">Cookie di Terze Parti</strong><br />L'applicazione si integra con servizi di terze parti (es. Supabase per autenticazione) che potrebbero utilizzare propri cookie tecnici. Si rimanda alle rispettive privacy policy.</p>
                                                <p><strong className="text-slate-300">Gestione dei Cookie</strong><br />L'utente può gestire le preferenze sui cookie attraverso le impostazioni del proprio browser. La disabilitazione dei cookie tecnici potrebbe compromettere il funzionamento dell'applicazione.</p>
                                                <p><strong className="text-slate-300">Durata</strong><br />I cookie di sessione vengono eliminati alla chiusura del browser. I cookie persistenti hanno durata massima di 12 mesi.</p>
                                            </div>
                                        </details>
                                    </div>

                                    {/* Footer Legal */}
                                    <div className="mt-6 pt-4 border-t border-slate-700 text-center">
                                        <p className="text-slate-400 text-xs italic mb-2">"Un grande software fa una grande azienda..."</p>
                                        <p className="text-slate-500 text-[10px]">
                                            © {new Date().getFullYear()} RistoSync - Tutti i diritti riservati | Titolare: Castro Massimo | Ultimo aggiornamento: Dicembre 2024
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {adminTab === 'delivery' && (
                            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
                                <h2 className="text-3xl font-black text-white mb-4 flex items-center gap-3"><Bike size={32} className="text-green-500" /> Piattaforme Delivery</h2>
                                <p className="text-slate-400 mb-8">Gestisci i tuoi account delivery. Attiva/disattiva piattaforme, inserisci dati contrattuali e API per integrazioni future.</p>

                                {/* Platform List */}
                                {/* Platform List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(appSettings.deliveryPlatforms || []).map((platform, index) => (
                                        <div key={platform.id} className={`bg-slate-900 border ${platform.enabled ? 'border-green-500/30' : 'border-slate-700'} rounded-2xl p-5 relative group transition-all hover:border-slate-500 shadow-lg`}>
                                            {/* Platform Badge */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm ${platform.bgClass || 'bg-slate-700'}`}>
                                                        {platform.shortCode}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg">{platform.name}</h4>
                                                        <p className={`text-xs font-bold ${platform.enabled ? 'text-green-400' : 'text-slate-500'}`}>{platform.enabled ? '● Attivo' : '○ Disattivato'}</p>
                                                    </div>
                                                </div>
                                                {/* Toggle Switch */}
                                                <button
                                                    onClick={() => {
                                                        const updated = [...(appSettings.deliveryPlatforms || [])];
                                                        updated[index] = { ...updated[index], enabled: !updated[index].enabled };
                                                        const newSettings = { ...appSettings, deliveryPlatforms: updated };
                                                        setAppSettingsState(newSettings);
                                                        saveAppSettings(newSettings);
                                                        showToast(`${platform.name} ${!platform.enabled ? 'attivato' : 'disattivato'}`, 'success');
                                                    }}
                                                    className={`w-14 h-7 rounded-full relative transition-colors ${platform.enabled ? 'bg-green-600' : 'bg-slate-700'}`}
                                                >
                                                    <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${platform.enabled ? 'left-8' : 'left-1'}`}></div>
                                                </button>
                                            </div>

                                            {/* Contract Info */}
                                            <div className="space-y-2 text-sm mb-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                                {platform.merchantId ? <p className="text-slate-400 flex justify-between"><span className="text-slate-500">Merchant ID:</span> <span className="font-mono text-slate-300">{platform.merchantId}</span></p> : <p className="text-slate-600 italic">Nessun Merchant ID</p>}
                                                {platform.contractNumber && <p className="text-slate-400 flex justify-between"><span className="text-slate-500">Contratto:</span> <span className="font-mono text-slate-300">{platform.contractNumber}</span></p>}
                                                {platform.commissionPercent !== undefined && <p className="text-slate-400 flex justify-between"><span className="text-slate-500">Commissione:</span> <span className="font-bold text-orange-400">{platform.commissionPercent}%</span></p>}
                                                {platform.apiKey && <p className="text-slate-400 flex justify-between"><span className="text-slate-500">API Key:</span> <span className="font-mono text-slate-300">***{platform.apiKey.slice(-4)}</span></p>}
                                                {platform.notes && <p className="text-slate-500 italic text-xs mt-2 border-t border-slate-800 pt-2">"{platform.notes}"</p>}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingPlatform(platform);
                                                        setIsNewPlatform(false);
                                                    }}
                                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-700 hover:border-slate-500"
                                                >
                                                    <Edit2 size={14} /> Modifica
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Eliminare ${platform.name}?`)) {
                                                            const updated = (appSettings.deliveryPlatforms || []).filter((_, i) => i !== index);
                                                            const newSettings = { ...appSettings, deliveryPlatforms: updated };
                                                            setAppSettingsState(newSettings);
                                                            saveAppSettings(newSettings);
                                                            showToast('Piattaforma eliminata', 'info');
                                                        }
                                                    }}
                                                    className="bg-red-900/20 hover:bg-red-600 text-red-400 hover:text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-red-500/20 hover:border-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Platform Card */}
                                    <button
                                        onClick={() => {
                                            setEditingPlatform({
                                                id: `custom_${Date.now()}`,
                                                name: '',
                                                shortCode: '',
                                                color: '#6b7280',
                                                bgClass: 'bg-slate-600',
                                                borderClass: 'border-slate-600',
                                                enabled: true
                                            });
                                            setIsNewPlatform(true);
                                        }}
                                        className="bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-green-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all text-slate-500 hover:text-green-400 group h-full min-h-[250px]"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-green-500/20 flex items-center justify-center transition-colors">
                                            <Plus size={32} />
                                        </div>
                                        <span className="font-bold text-sm">Aggiungi Piattaforma</span>
                                    </button>
                                </div>

                                {/* Default Platforms Setup */}
                                {(!appSettings.deliveryPlatforms || appSettings.deliveryPlatforms.length === 0) && (
                                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">
                                        <Bike size={48} className="mx-auto text-slate-600 mb-4" />
                                        <h3 className="text-white font-bold mb-2">Nessuna piattaforma configurata</h3>
                                        <p className="text-slate-400 text-sm mb-4">Inizia aggiungendo le piattaforme delivery che utilizzi.</p>
                                        <button
                                            onClick={() => {
                                                const defaultPlatforms: DeliveryPlatform[] = [
                                                    { id: 'just-eat', name: 'Just Eat', shortCode: 'JE', color: '#ff8000', bgClass: 'bg-orange-500', borderClass: 'border-orange-500', enabled: true },
                                                    { id: 'glovo', name: 'Glovo', shortCode: 'GL', color: '#facd3d', bgClass: 'bg-yellow-400', borderClass: 'border-yellow-400', enabled: true },
                                                    { id: 'deliveroo', name: 'Deliveroo', shortCode: 'DE', color: '#00ccbc', bgClass: 'bg-teal-500', borderClass: 'border-teal-500', enabled: true },
                                                    { id: 'uber-eats', name: 'Uber Eats', shortCode: 'UE', color: '#06c167', bgClass: 'bg-green-500', borderClass: 'border-green-500', enabled: false },
                                                    { id: 'phone', name: 'Telefono', shortCode: 'TEL', color: '#3b82f6', bgClass: 'bg-blue-500', borderClass: 'border-blue-500', enabled: true },
                                                    { id: 'takeaway', name: 'Asporto', shortCode: 'ASP', color: '#8b5cf6', bgClass: 'bg-purple-500', borderClass: 'border-purple-500', enabled: true }
                                                ];
                                                const newSettings = { ...appSettings, deliveryPlatforms: defaultPlatforms };
                                                setAppSettingsState(newSettings);
                                                saveAppSettings(newSettings);
                                                showToast('Piattaforme predefinite aggiunte!', 'success');
                                            }}
                                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition-all"
                                        >
                                            Carica Piattaforme Predefinite
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {adminTab === 'marketing' && (
                            <div className="max-w-6xl mx-auto animate-fade-in pb-20">
                                <MarketingPanel />
                            </div>
                        )}
                        {adminTab === 'whatsapp' && (
                            <div className="max-w-4xl mx-auto animate-fade-in pb-20 space-y-8">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                                            <MessageCircle size={32} className="text-green-500" /> WhatsApp Marketing
                                        </h2>
                                        <p className="text-slate-400">Invia messaggi promozionali ai tuoi clienti via WhatsApp Business API</p>
                                    </div>
                                </div>

                                {/* Campaign Manager Section */}
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-slate-700 p-8 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <MessageCircle size={150} className="text-green-500" />
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                                            📱 Campagna Messaggi
                                        </h3>
                                        <p className="text-slate-400 mb-6 max-w-xl">
                                            Invia messaggi personalizzati ai tuoi clienti. Seleziona destinatari, scrivi il messaggio e gestisci la coda di invio.
                                        </p>
                                        <button
                                            onClick={() => setShowWhatsAppManager(true)}
                                            className="bg-green-600 hover:bg-green-500 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-3 transition-all shadow-lg hover:shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <Send size={20} />
                                            Apri WhatsApp Manager
                                        </button>
                                    </div>
                                </div>

                                {/* WhatsApp Settings */}
                                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
                                    <WhatsAppSettings showToast={showToast} />
                                </div>

                                {/* How it works */}
                                <div className="pt-4">
                                    <h3 className="text-xl font-bold text-white mb-6">Come funziona</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 relative group hover:border-slate-700 transition-colors">
                                            <div className="absolute -top-3 -left-3 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg text-lg rotate-3 group-hover:rotate-6 transition-transform">1</div>
                                            <h4 className="font-bold text-white mb-2 mt-2">Configura le Credenziali</h4>
                                            <p className="text-sm text-slate-400">Inserisci il Phone Number ID e l'Access Token dalla piattaforma Meta for Developers.</p>
                                        </div>
                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 relative group hover:border-slate-700 transition-colors">
                                            <div className="absolute -top-3 -left-3 w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg text-lg -rotate-2 group-hover:-rotate-5 transition-transform">2</div>
                                            <h4 className="font-bold text-white mb-2 mt-2">Seleziona i Clienti</h4>
                                            <p className="text-sm text-slate-400">Usa i filtri per scegliere a chi inviare: VIP, per città, o tutti i clienti.</p>
                                        </div>
                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 relative group hover:border-slate-700 transition-colors">
                                            <div className="absolute -top-3 -left-3 w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg text-lg rotate-1 group-hover:rotate-4 transition-transform">3</div>
                                            <h4 className="font-bold text-white mb-2 mt-2">Invia i Messaggi</h4>
                                            <p className="text-sm text-slate-400">L'AI schedula l'invio automatico rispettando i limiti per non essere bloccato.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {adminTab === 'customers' && (
                            <CustomerManager
                                showToast={showToast}
                                showConfirm={showConfirm}
                                onOpenWhatsApp={() => setShowWhatsAppManager(true)}
                                onSendWhatsApp={(customerId) => {
                                    // Pre-select the customer and open WhatsApp Manager
                                    localStorage.setItem('whatsapp_preselected_customer', customerId);
                                    setShowWhatsAppManager(true);
                                }}
                            />
                        )}
                    </div >
                </div >

                <CustomDialog
                    isOpen={dialogState.isOpen}
                    title={dialogState.title}
                    message={dialogState.message}
                    type={dialogState.type}
                    onConfirm={dialogState.onConfirm}
                    onCancel={closeDialog}
                />
                <Toast
                    isOpen={toastState.isOpen}
                    message={toastState.message}
                    type={toastState.type}
                    onClose={closeToast}
                />

                {showPrintableMenu && (
                    <PrintableMenu
                        menuItems={menuItems}
                        restaurantProfile={profileForm}
                        publicUrl={digitalMenuLink}
                        onClose={() => setShowPrintableMenu(false)}
                    />
                )}

                {showDeliveryFlyer && (
                    <DeliveryFlyer
                        restaurantProfile={profileForm}
                        publicUrl={digitalMenuLink}
                        onClose={() => setShowDeliveryFlyer(false)}
                    />
                )}

                {editingPlatform && (
                    <PlatformEditModal
                        platform={editingPlatform}
                        isNew={isNewPlatform}
                        onClose={() => setEditingPlatform(null)}
                        onSave={(updatedPlatform) => {
                            const platforms = appSettings.deliveryPlatforms || [];
                            let updated;

                            if (isNewPlatform) {
                                updated = [...platforms, updatedPlatform];
                                showToast(`${updatedPlatform.name} creata!`, 'success');
                            } else {
                                updated = platforms.map(p =>
                                    p.id === updatedPlatform.id ? updatedPlatform : p
                                );
                                showToast(`${updatedPlatform.name} aggiornata!`, 'success');
                            }

                            const newSettings = { ...appSettings, deliveryPlatforms: updated };
                            setAppSettingsState(newSettings);
                            saveAppSettings(newSettings);
                            setEditingPlatform(null);
                        }}
                    />
                )}


                {showWhatsAppManager && (
                    <WhatsAppManager
                        onClose={() => setShowWhatsAppManager(false)}
                        showToast={showToast}
                        showConfirm={showConfirm}
                    />
                )}

                {showSubscriptionManager && (
                    <SubscriptionManager
                        onClose={() => setShowSubscriptionManager(false)}
                        showToast={showToast}
                    />
                )}
            </>
        );
    }

    // --- WAIT/KITCHEN VIEW RENDER IS ABOVE ---
    return (
        <>
            <CustomDialog
                isOpen={dialogState.isOpen}
                title={dialogState.title}
                message={dialogState.message}
                type={dialogState.type}
                onConfirm={dialogState.onConfirm}
                onCancel={closeDialog}
            />
            <Toast
                isOpen={toastState.isOpen}
                message={toastState.message}
                type={toastState.type}
                onClose={closeToast}
            />
            {showWelcomeModal && session && (
                <WelcomeModal
                    onClose={() => setShowWelcomeModal(false)}
                    onAccept={handleWelcomeAccept}
                    restaurantName={restaurantName}
                />
            )}
            {showPrintableMenu && (
                <PrintableMenu
                    menuItems={menuItems}
                    restaurantProfile={profileForm}
                    onClose={() => setShowPrintableMenu(false)}
                />
            )}
            {showReservations && (
                <ReservationManager
                    onClose={() => setShowReservations(false)}
                    showToast={showToast}
                    showConfirm={showConfirm}
                />
            )}
            {showWhatsAppManager && (
                <WhatsAppManager
                    onClose={() => setShowWhatsAppManager(false)}
                    showToast={showToast}
                    showConfirm={showConfirm}
                />
            )}
            {showSubscriptionManager && (
                <SubscriptionManager
                    onClose={() => setShowSubscriptionManager(false)}
                    showToast={showToast}
                />
            )}
        </>
    );
}

// Wrapper for Provider
export default function AppWrapper() {
    return (
        <ToastProvider>
            <App />
        </ToastProvider>
    );
}
