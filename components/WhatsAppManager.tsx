import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle, Send, Users, User, Filter, Clock, CheckCircle, XCircle,
    AlertTriangle, Play, Pause, RefreshCw, Trash2, ChevronDown, ChevronRight,
    Phone, MapPin, Baby, Crown, Calendar, TrendingUp, X, Search, Edit3,
    Zap, Settings, BarChart3, MessageSquare, UserCheck, Loader2, List, Sparkles
} from 'lucide-react';
import { Customer } from '../types';
import { generateWhatsAppMessage } from '../services/geminiService';
// Ensure correct casing for Vercel build
import { sendTextMessage, formatPhoneNumber, WhatsAppConfig } from '../services/whatsappService';
import { getAppSettings } from '../services/storageService';

interface WhatsAppManagerProps {
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
}

// Message Status Types
type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';

interface QueuedMessage {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    message: string;
    status: MessageStatus;
    scheduledTime: number;
    sentTime?: number;
    deliveredTime?: number;
    readTime?: number;
    error?: string;
    retryCount: number;
    isTemplate?: boolean;
    templateName?: string;
    templateLang?: string;
}

interface MessageTemplate {
    id: string;
    name: string;
    content: string;
    variables: string[];
}

// Filter Types
interface CustomerFilter {
    gender?: 'male' | 'female' | 'all';
    cities?: string[];
    hasChildren?: boolean;
    isVip?: boolean;
    minVisits?: number;
    maxDaysSinceLastVisit?: number;
    minSpent?: number;
}

// AI Scheduler Configuration
const AI_SCHEDULER_CONFIG = {
    // Orari di invio (0-23)
    highPriorityHours: [8, 9, 10, 11], // Mattina: alta frequenza
    mediumPriorityHours: [12, 13, 14, 15, 16, 17], // Pomeriggio: media frequenza
    lowPriorityHours: [18, 19], // Sera presto: bassa frequenza
    blockedHours: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7], // Notte: nessun invio

    // Rate limiting
    maxMessagesPerMinute: 2,
    maxMessagesPerHour: 50,
    maxMessagesPerDay: 300,

    // Delays (in ms)
    minDelayBetweenMessages: 30000, // 30 secondi minimo
    maxDelayBetweenMessages: 120000, // 2 minuti massimo

    // Retry
    maxRetries: 3,
    retryDelayMs: 300000, // 5 minuti
};

const WhatsAppManager: React.FC<WhatsAppManagerProps> = ({ onClose, showToast, showConfirm }) => {
    // State
    const [view, setView] = useState<'compose' | 'queue' | 'stats' | 'templates'>('compose');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
    const messageQueueRef = useRef<QueuedMessage[]>([]); // Ref to avoid stale closures in interval

    // Sync ref with state
    useEffect(() => {
        messageQueueRef.current = messageQueue;
    }, [messageQueue]);

    const [isQueueRunning, setIsQueueRunning] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Template Mode State
    const [isTemplateMode, setIsTemplateMode] = useState(false);
    const [templateNameInput, setTemplateNameInput] = useState('hello_world'); // Default Meta test template

    // AI Wizard State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const [sendMode, setSendMode] = useState<'single' | 'filtered' | 'all'>('single');
    const [selectedStatDetail, setSelectedStatDetail] = useState<'sent' | 'delivered' | 'failed' | 'queued' | null>(null);

    // Filters
    const [filters, setFilters] = useState<CustomerFilter>({
        gender: 'all',
        cities: [],
        hasChildren: undefined,
        isVip: undefined,
        minVisits: undefined,
        maxDaysSinceLastVisit: undefined,
        minSpent: undefined,
    });

    // Stats
    const [stats, setStats] = useState({
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalInQueue: 0,
    });

    // Templates
    const [templates, setTemplates] = useState<MessageTemplate[]>([
        {
            id: 'custom',
            name: '✨ Scrivi Tuo',
            content: '',
            variables: []
        },
        {
            id: 'welcome',
            name: 'Benvenuto',
            content: 'Ciao {nome}! 👋 Grazie per aver scelto il nostro ristorante. Ti aspettiamo presto!',
            variables: ['nome']
        },
        {
            id: 'promo',
            name: 'Promozione',
            content: '🎉 {nome}, abbiamo una sorpresa per te! Sconto del 20% sul tuo prossimo pranzo. Valido fino a {data}. Prenotati!',
            variables: ['nome', 'data']
        },
        {
            id: 'birthday',
            name: 'Compleanno',
            content: '🎂 Tanti auguri {nome}! Per festeggiare il tuo compleanno, ti offriamo un dolce speciale. Ti aspettiamo!',
            variables: ['nome']
        },
        {
            id: 'reminder',
            name: 'Ci Manchi',
            content: 'Ciao {nome}! È da un po\' che non ti vediamo... 😢 Torna a trovarci, abbiamo nuovi piatti da farti provare!',
            variables: ['nome']
        }
    ]);

    const queueIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load data
    useEffect(() => {
        loadCustomers();
        loadQueue();
        loadStats();

        // Check for pre-selected customer from CustomerManager
        const preselectedId = localStorage.getItem('whatsapp_preselected_customer');
        if (preselectedId) {
            setSendMode('single');
            setSelectedCustomers([preselectedId]);
            localStorage.removeItem('whatsapp_preselected_customer');
        }

        // IMPORTANTE: NON riavviare automaticamente la coda
        // L'utente deve avviarla manualmente per evitare loop infiniti
        // const savedQueueState = localStorage.getItem('whatsapp_queue_running');
        // if (savedQueueState === 'true') {
        //     setIsQueueRunning(true);
        // }

        return () => {
            // CLEANUP: Ferma SEMPRE la coda quando il componente viene smontato
            if (queueIntervalRef.current) {
                clearInterval(queueIntervalRef.current);
                queueIntervalRef.current = null;
            }
            // Salva che la coda è stata fermata
            localStorage.setItem('whatsapp_queue_running', 'false');
        };
    }, []);

    // Effect to handle the "Sending" state - if we are running but no message is "sending", pick next



    const loadCustomers = () => {
        try {
            const stored = localStorage.getItem('customers');
            if (stored) {
                setCustomers(JSON.parse(stored));
            }
        } catch (error) {
            console.warn('Error loading customers:', error);
            setCustomers([]);
        }
    };

    const loadQueue = () => {
        try {
            const stored = localStorage.getItem('whatsapp_message_queue');
            if (stored) {
                setMessageQueue(JSON.parse(stored));
            }
        } catch (error) {
            console.warn('Error loading queue:', error);
            setMessageQueue([]);
        }
    };

    const loadStats = () => {
        try {
            const stored = localStorage.getItem('whatsapp_stats');
            if (stored) {
                setStats(JSON.parse(stored));
            }
        } catch (error) {
            console.warn('Error loading stats:', error);
            setStats({ totalSent: 0, totalDelivered: 0, totalFailed: 0, totalInQueue: 0 });
        }
    };

    const saveQueue = (queue: QueuedMessage[]) => {
        localStorage.setItem('whatsapp_message_queue', JSON.stringify(queue));
        setMessageQueue(queue);
    };

    const saveStats = (newStats: typeof stats) => {
        localStorage.setItem('whatsapp_stats', JSON.stringify(newStats));
        setStats(newStats);
    };

    // AI Scheduler: Check if current time is valid for sending
    const isValidSendingTime = (): boolean => {
        const hour = new Date().getHours();
        return !AI_SCHEDULER_CONFIG.blockedHours.includes(hour);
    };

    // AI Scheduler: Get delay based on current hour
    const getSmartDelay = (): number => {
        const hour = new Date().getHours();

        if (AI_SCHEDULER_CONFIG.highPriorityHours.includes(hour)) {
            // Mattina: delay più breve
            return AI_SCHEDULER_CONFIG.minDelayBetweenMessages + Math.random() * 10000;
        } else if (AI_SCHEDULER_CONFIG.mediumPriorityHours.includes(hour)) {
            // Pomeriggio: delay medio
            return AI_SCHEDULER_CONFIG.minDelayBetweenMessages + Math.random() * 30000;
        } else if (AI_SCHEDULER_CONFIG.lowPriorityHours.includes(hour)) {
            // Sera: delay lungo
            return AI_SCHEDULER_CONFIG.maxDelayBetweenMessages;
        }

        return AI_SCHEDULER_CONFIG.minDelayBetweenMessages;
    };

    // Check rate limits
    const checkRateLimits = (): boolean => {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const oneHourAgo = now - 3600000;
        const oneDayAgo = now - 86400000;

        const currentQueue = messageQueueRef.current;

        const sentLastMinute = currentQueue.filter(m =>
            m.status === 'sent' && m.sentTime && m.sentTime > oneMinuteAgo
        ).length;

        const sentLastHour = currentQueue.filter(m =>
            m.status === 'sent' && m.sentTime && m.sentTime > oneHourAgo
        ).length;

        const sentLastDay = currentQueue.filter(m =>
            m.status === 'sent' && m.sentTime && m.sentTime > oneDayAgo
        ).length;

        return (
            sentLastMinute < AI_SCHEDULER_CONFIG.maxMessagesPerMinute &&
            sentLastHour < AI_SCHEDULER_CONFIG.maxMessagesPerHour &&
            sentLastDay < AI_SCHEDULER_CONFIG.maxMessagesPerDay
        );
    };

    // Process the next message in queue (One at a time)
    const processNextMessage = async (currentQueue: QueuedMessage[] = messageQueue) => {
        const pendingMessages = currentQueue.filter(m => m.status === 'queued');

        if (pendingMessages.length === 0) {
            console.log('✅ Queue empty');
            setIsQueueRunning(false);
            showToast('Tutti i messaggi sono stati inviati!', 'success');
            return;
        }

        // Get next message
        const nextMessage = pendingMessages[0];

        // Update status to sending
        const updatedQueue = currentQueue.map(m =>
            m.id === nextMessage.id ? { ...m, status: 'sending' as MessageStatus } : m
        );
        saveQueue(updatedQueue);

        // Send via Meta API
        try {
            // Note: sendWhatsAppMessage will trigger confirmMessageSent on success
            await sendWhatsAppMessage(nextMessage);
        } catch (error: any) {
            // If API failed, mark as failed immediately
            handleMessageError(nextMessage.id, error.message);
        }
    };

    const confirmMessageSent = (messageId: string) => {
        // Fetch latest queue from storage to avoid stale closure issues during async recursion
        const storedQueue = localStorage.getItem('whatsapp_queue');
        const latestQueue: QueuedMessage[] = storedQueue ? JSON.parse(storedQueue) : messageQueue;

        const updatedQueue = latestQueue.map(m =>
            m.id === messageId ? {
                ...m,
                status: 'sent' as MessageStatus,
                sentTime: Date.now()
            } : m
        );

        // Stats
        const newStats = { ...stats, totalSent: stats.totalSent + 1, totalInQueue: stats.totalInQueue - 1 };
        saveStats(newStats);

        // CHAIN REACTION: If active, process next immediately using the updated queue state
        if (isQueueRunning) {
            // Small delay to prevent API rate limiting (Meta limit is ~80 messages/sec, but we stay safe)
            setTimeout(() => {
                processNextMessage(updatedQueue);
            }, 1000);
        } else {
            saveQueue(updatedQueue);
        }
    };

    const handleMessageError = (messageId: string, errorMsg: string) => {
        const message = messageQueue.find(m => m.id === messageId);
        if (!message) return;

        const updatedQueue = messageQueue.map(m => {
            if (m.id === messageId) {
                if (m.retryCount < AI_SCHEDULER_CONFIG.maxRetries) {
                    return {
                        ...m,
                        status: 'queued' as MessageStatus, // Put back in queue
                        retryCount: m.retryCount + 1,
                        scheduledTime: Date.now() + 5000 // Retry delay
                    };
                } else {
                    return {
                        ...m,
                        status: 'failed' as MessageStatus,
                        error: errorMsg
                    };
                }
            }
            return m;
        });
        saveQueue(updatedQueue);

        if (message.retryCount >= AI_SCHEDULER_CONFIG.maxRetries) {
            const newStats = { ...stats, totalFailed: stats.totalFailed + 1, totalInQueue: stats.totalInQueue - 1 };
            saveStats(newStats);
        }
    };

    // Send WhatsApp message using official Meta Cloud API
    const sendWhatsAppMessage = async (message: QueuedMessage): Promise<void> => {
        try {
            // Migrate WhatsApp credentials from legacy 'appSettings' to 'ristosync_app_settings' if needed
            try {
                const legacySettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                const legacyConfig = legacySettings.restaurantProfile?.whatsappApiConfig;

                if (legacyConfig?.phoneNumberId && legacyConfig?.accessToken) {
                    const currentSettings = getAppSettings();

                    // Check if credentials are missing in the correct location
                    if (!currentSettings.restaurantProfile?.whatsappApiConfig?.phoneNumberId) {
                        console.log('🔄 Migrating WhatsApp credentials from legacy storage...');

                        // Migrate credentials to correct location
                        currentSettings.restaurantProfile = currentSettings.restaurantProfile || {};
                        currentSettings.restaurantProfile.whatsappApiConfig = legacyConfig;

                        // Save to correct location
                        localStorage.setItem('ristosync_app_settings', JSON.stringify(currentSettings));

                        console.log('✅ WhatsApp credentials migrated successfully!');
                        showToast('✅ Credenziali WhatsApp migrate con successo!', 'success');
                    }
                }
            } catch (migrationError) {
                console.error('Error migrating WhatsApp credentials:', migrationError);
            }

            // Get WhatsApp API configuration from app settings
            const settings = getAppSettings();
            const whatsappConfig = settings.restaurantProfile?.whatsappApiConfig;

            if (!whatsappConfig?.phoneNumberId || !whatsappConfig?.accessToken) {
                throw new Error('WhatsApp API non configurato. Vai in Impostazioni → Profilo Ristorante per configurare le credenziali.');
            }

            const config: WhatsAppConfig = {
                phoneNumberId: whatsappConfig.phoneNumberId,
                accessToken: whatsappConfig.accessToken,
                businessAccountId: whatsappConfig.businessAccountId,
                apiVersion: whatsappConfig.apiVersion || 'v22.0'
            };

            // Format phone number (remove spaces, add country code if needed)
            const formattedPhone = formatPhoneNumber(message.customerPhone);

            // Send via API
            let result;

            if (message.isTemplate && message.templateName) {
                // MARKETING MODE: Send Official Template
                // Note: For advanced templates with variables, we would need to pass 'components' param.
                // For this version we support simple templates or 'hello_world' style.
                result = await sendTemplateMessage(
                    config,
                    formattedPhone,
                    message.templateName,
                    message.templateLang || 'it'
                );
            } else {
                // SUPPORT MODE: Send Free Text (Only works within 24h window or Test Numbers)
                result = await sendTextMessage(config, formattedPhone, message.message);
            }

            if (!result.success) {
                throw new Error(result.error || 'Errore sconosciuto');
            }

            // Success! Auto-confirm the message as sent
            showToast(`✅ Messaggio inviato a ${message.customerName}!`, 'success');

            // Auto-confirm (no need for manual confirmation anymore)
            setTimeout(() => {
                confirmMessageSent(message.id);
            }, 500);

        } catch (error: any) {
            showToast(`❌ Errore invio a ${message.customerName}: ${error.message}`, 'error');
            throw error;
        }
    };

    // Apply filters to customers
    const getFilteredCustomers = (): Customer[] => {
        let filtered = [...customers];

        // Search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.firstName.toLowerCase().includes(query) ||
                c.lastName.toLowerCase().includes(query) ||
                c.phone.includes(query) ||
                (c.city && c.city.toLowerCase().includes(query))
            );
        }


        // Gender filter
        if (filters.gender && filters.gender !== 'all') {
            filtered = filtered.filter(c => c.gender === filters.gender);
        }

        // City filter
        if (filters.cities && filters.cities.length > 0) {
            filtered = filtered.filter(c => c.city && filters.cities!.includes(c.city));
        }

        // VIP filter
        if (filters.isVip !== undefined) {
            filtered = filtered.filter(c => c.vip === filters.isVip);
        }

        // Min visits
        if (filters.minVisits !== undefined) {
            filtered = filtered.filter(c => (c.totalVisits || 0) >= filters.minVisits!);
        }

        // Days since last visit
        if (filters.maxDaysSinceLastVisit !== undefined && filters.maxDaysSinceLastVisit > 0) {
            const cutoffDate = Date.now() - (filters.maxDaysSinceLastVisit * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(c => !c.lastVisit || c.lastVisit < cutoffDate);
        }

        // Min spent
        if (filters.minSpent !== undefined) {
            filtered = filtered.filter(c => (c.totalSpent || 0) >= filters.minSpent!);
        }

        return filtered;
    };

    // Get unique cities from customers
    const getUniqueCities = (): string[] => {
        const cities = customers.map(c => c.city).filter(Boolean) as string[];
        return [...new Set(cities)].sort();
    };

    // Add messages to queue
    const addToQueue = () => {
        if (!isTemplateMode && !messageText.trim()) {
            showToast('⚠️ Scrivi un messaggio prima di inviare', 'error');
            return;
        }
        if (isTemplateMode && !templateNameInput.trim()) {
            showToast('⚠️ Inserisci il nome del template Meta', 'error');
            return;
        }

        let targetCustomers: Customer[] = [];

        if (sendMode === 'single') {
            targetCustomers = customers.filter(c => selectedCustomers.includes(c.id));
        } else if (sendMode === 'filtered') {
            targetCustomers = getFilteredCustomers();
        } else if (sendMode === 'all') {
            targetCustomers = customers.filter(c => c.phone);
        }

        if (targetCustomers.length === 0) {
            showToast('⚠️ Nessun cliente selezionato', 'error');
            return;
        }

        const newMessages: QueuedMessage[] = targetCustomers.map(c => ({
            id: `msg_${Date.now()}_${c.id}`,
            customerId: c.id,
            customerName: `${c.firstName} ${c.lastName}`,
            customerPhone: c.phone,
            message: isTemplateMode ? `Template: ${templateNameInput}` : personalizeMessage(messageText, c),
            status: 'queued' as MessageStatus,
            scheduledTime: Date.now() + getSmartDelay(),
            retryCount: 0,
            isTemplate: isTemplateMode,
            templateName: isTemplateMode ? templateNameInput : undefined,
            templateLang: 'it'
        }));

        const updatedQueue = [...messageQueue, ...newMessages];
        saveQueue(updatedQueue);

        const newStats = { ...stats, totalInQueue: stats.totalInQueue + newMessages.length };
        saveStats(newStats);

        showToast(`✅ ${newMessages.length} messaggi aggiunti alla coda`, 'success');

        // Reset
        setMessageText('');
        setSelectedCustomers([]);
        setView('queue');

        // AUTO-START: Avvia automaticamente l'invio se non è già attivo
        if (!isQueueRunning) {
            setIsQueueRunning(true);
            showToast('🚀 Invio automatico avviato...', 'info');
            setTimeout(() => processNextMessage(updatedQueue), 500);
        }
    };

    // Personalize message with customer data
    const personalizeMessage = (template: string, customer: Customer): string => {
        return template
            .replace(/{nome}/g, customer.firstName)
            .replace(/{cognome}/g, customer.lastName)
            .replace(/{citta}/g, customer.city || 'la tua città')
            .replace(/{data}/g, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT'));
    };

    // Cancel message
    const cancelMessage = (messageId: string) => {
        const updated = messageQueue.map(m =>
            m.id === messageId && m.status === 'queued'
                ? { ...m, status: 'cancelled' as MessageStatus }
                : m
        );
        saveQueue(updated);
        showToast('Messaggio cancellato', 'info');
    };

    // Clear completed/failed messages
    const clearCompleted = async () => {
        const confirmed = await showConfirm('Pulisci Coda', 'Rimuovere tutti i messaggi completati e falliti?');
        if (confirmed) {
            const updated = messageQueue.filter(m => m.status === 'queued' || m.status === 'sending');
            saveQueue(updated);
            showToast('Coda pulita', 'success');
        }
    };

    // Retry failed messages
    const retryFailed = () => {
        const updated = messageQueue.map(m =>
            m.status === 'failed'
                ? { ...m, status: 'queued' as MessageStatus, retryCount: 0, error: undefined }
                : m
        );
        saveQueue(updated);
        showToast('Messaggi falliti rimessi in coda', 'info');
    };




    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-800 shadow-2xl overflow-hidden relative">

                {/* --- CONFIRMATION OVERLAY REMOVED (API MODE) --- */}
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                            <MessageCircle className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">WhatsApp Messaging</h2>
                            <p className="text-slate-400 text-sm">Invia messaggi ai tuoi clienti in modo intelligente</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Queue Status Badge */}
                        {messageQueue.filter(m => m.status === 'queued').length > 0 && (
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${isQueueRunning ? 'bg-green-900/30 border border-green-500' : 'bg-yellow-900/30 border border-yellow-500'}`}>
                                {isQueueRunning ? (
                                    <>
                                        <Loader2 size={16} className="text-green-400 animate-spin" />
                                        <span className="text-green-400 font-bold text-sm">Invio Attivo</span>
                                    </>
                                ) : (
                                    <>
                                        <Pause size={16} className="text-yellow-400" />
                                        <span className="text-yellow-400 font-bold text-sm">In Pausa</span>
                                    </>
                                )}
                                <span className="text-slate-400 text-xs">({messageQueue.filter(m => m.status === 'queued').length} in coda)</span>
                            </div>
                        )}


                        <button
                            onClick={() => {
                                if (isQueueRunning) setIsQueueRunning(false);
                                onClose();
                            }}
                            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
                        >
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-800 px-6">
                    <div className="flex gap-2">
                        {[
                            { id: 'compose', label: 'Componi', icon: Edit3 },
                            { id: 'queue', label: 'Coda', icon: Clock, badge: messageQueue.filter(m => m.status === 'queued').length },
                            { id: 'stats', label: 'Statistiche', icon: BarChart3 },
                            { id: 'templates', label: 'Template', icon: MessageSquare }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id as any)}
                                className={`px-4 py-3 font-bold text-sm transition-colors flex items-center gap-2 border-b-2 ${view === tab.id
                                    ? 'text-green-400 border-green-400'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">{tab.badge}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {view === 'compose' && (
                        <div className="h-full flex">
                            {/* Left: Customer Selection */}
                            <div className="w-1/2 border-r border-slate-800 flex flex-col">
                                <div className="p-4 border-b border-slate-800 space-y-3">
                                    {/* Send Mode Selection */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSendMode('single')}
                                            className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${sendMode === 'single'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            <UserCheck size={16} />
                                            Manuale
                                        </button>
                                        <button
                                            onClick={() => setSendMode('filtered')}
                                            className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${sendMode === 'filtered'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            <Filter size={16} />
                                            Filtrati
                                        </button>
                                        <button
                                            onClick={() => setSendMode('all')}
                                            className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${sendMode === 'all'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            <Users size={16} />
                                            Tutti
                                        </button>
                                    </div>

                                    {/* Search & Actions */}
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Cerca cliente..."
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 text-sm outline-none focus:border-green-500"
                                            />
                                        </div>
                                        {sendMode === 'single' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const visibleIds = getFilteredCustomers().map(c => c.id);
                                                        setSelectedCustomers(prev => [...new Set([...prev, ...visibleIds])]);
                                                    }}
                                                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg py-1.5 text-xs font-bold text-slate-300 transition-colors"
                                                >
                                                    Seleziona Tutti
                                                </button>
                                                <button
                                                    onClick={() => setSelectedCustomers([])}
                                                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg py-1.5 text-xs font-bold text-slate-300 transition-colors"
                                                >
                                                    Deseleziona
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Filters Toggle */}
                                    {sendMode === 'filtered' && (
                                        <button
                                            onClick={() => setShowFilters(!showFilters)}
                                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-300 flex items-center justify-between transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Filter size={16} />
                                                Filtri Avanzati
                                            </span>
                                            {showFilters ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                    )}

                                    {/* Filter Panel */}
                                    {showFilters && sendMode === 'filtered' && (
                                        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-700">
                                            {/* City Filter */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Città</label>
                                                <select
                                                    value={filters.cities?.[0] || ''}
                                                    onChange={(e) => setFilters({ ...filters, cities: e.target.value ? [e.target.value] : [] })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                                >
                                                    <option value="">Tutte le città</option>
                                                    {getUniqueCities().map(city => (
                                                        <option key={city} value={city}>{city}</option>
                                                    ))}
                                                </select>
                                            </div>



                                            {/* Gender Filter */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Sesso</label>
                                                <select
                                                    value={filters.gender || 'all'}
                                                    onChange={(e) => setFilters({ ...filters, gender: e.target.value as any })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                                >
                                                    <option value="all">Tutti</option>
                                                    <option value="male">Uomini</option>
                                                    <option value="female">Donne</option>
                                                    <option value="other">Altro</option>
                                                </select>
                                            </div>

                                            {/* VIP Filter */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300 flex items-center gap-2">
                                                    <Crown size={14} className="text-yellow-400" />
                                                    Solo VIP
                                                </span>
                                                <button
                                                    onClick={() => setFilters({ ...filters, isVip: filters.isVip === true ? undefined : true })}
                                                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${filters.isVip ? 'bg-yellow-500' : 'bg-slate-700'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${filters.isVip ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>

                                            {/* Min Visits */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Minimo Visite</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={filters.minVisits || ''}
                                                    onChange={(e) => setFilters({ ...filters, minVisits: parseInt(e.target.value) || undefined })}
                                                    placeholder="0"
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                                />
                                            </div>

                                            {/* Days Since Last Visit */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Non vengono da (giorni)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={filters.maxDaysSinceLastVisit || ''}
                                                    onChange={(e) => setFilters({ ...filters, maxDaysSinceLastVisit: parseInt(e.target.value) || undefined })}
                                                    placeholder="30"
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Customer List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {(sendMode === 'single' ? getFilteredCustomers() : sendMode === 'filtered' ? getFilteredCustomers() : customers).slice(0, 100).map(customer => (
                                        <button
                                            key={customer.id}
                                            onClick={() => {
                                                if (sendMode === 'single') {
                                                    setSelectedCustomers(prev =>
                                                        prev.includes(customer.id)
                                                            ? prev.filter(id => id !== customer.id)
                                                            : [...prev, customer.id]
                                                    );
                                                }
                                            }}
                                            disabled={sendMode !== 'single'}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${selectedCustomers.includes(customer.id)
                                                ? 'bg-green-900/30 border-green-500'
                                                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                                } ${sendMode !== 'single' ? 'opacity-60' : ''}`}
                                        >
                                            {/* Selection Checkbox */}
                                            {sendMode === 'single' && (
                                                <div className="shrink-0">
                                                    {selectedCustomers.includes(customer.id) ? (
                                                        <CheckCircle size={20} className="text-green-500" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                                                    )}
                                                </div>
                                            )}

                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${customer.vip ? 'bg-yellow-500/20' : 'bg-slate-700'
                                                }`}>
                                                {customer.vip ? (
                                                    <Crown size={18} className="text-yellow-400" />
                                                ) : (
                                                    <User size={18} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white text-sm truncate">
                                                    {customer.firstName} {customer.lastName}
                                                </div>
                                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                                    <Phone size={10} /> {customer.phone}
                                                    {customer.city && (
                                                        <>
                                                            <MapPin size={10} /> {customer.city}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {sendMode === 'single' && selectedCustomers.includes(customer.id) && (
                                                <CheckCircle size={20} className="text-green-400" />
                                            )}
                                        </button>
                                    ))}

                                    {customers.length === 0 && (
                                        <div className="text-center py-12 text-slate-500">
                                            <Users size={48} className="mx-auto mb-4 opacity-50" />
                                            <p>Nessun cliente nel database</p>
                                        </div>
                                    )}
                                </div>

                                {/* Selection Summary */}
                                <div className="p-4 border-t border-slate-800 bg-slate-800/50">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">
                                            {sendMode === 'single' && `${selectedCustomers.length} selezionati`}
                                            {sendMode === 'filtered' && `${getFilteredCustomers().length} clienti corrispondenti`}
                                            {sendMode === 'all' && `${customers.filter(c => c.phone).length} clienti totali`}
                                        </span>
                                        <span className="text-green-400 font-bold">
                                            {sendMode === 'single' ? selectedCustomers.length : sendMode === 'filtered' ? getFilteredCustomers().length : customers.filter(c => c.phone).length} destinatari
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Message Composer */}
                            <div className="w-1/2 flex flex-col">
                                <div className="p-4 border-b border-slate-800">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Edit3 size={18} className="text-green-400" />
                                        Componi Messaggio
                                    </h3>
                                </div>

                                {/* Mode Toggle */}
                                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                                    <span className="text-sm font-bold text-slate-300">Modalità Invio</span>
                                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                        <button
                                            onClick={() => setIsTemplateMode(false)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!isTemplateMode ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Testo Libero (Supporto)
                                        </button>
                                        <button
                                            onClick={() => setIsTemplateMode(true)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isTemplateMode ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Template Meta (Marketing)
                                        </button>
                                    </div>
                                </div>

                                {/* Template Quick Select (Only in Free Text Mode) */}
                                {!isTemplateMode && (
                                    <div className="p-4 border-b border-slate-800">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Template Rapidi</label>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setShowAiModal(true)}
                                                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1 shadow-lg shadow-purple-900/20"
                                            >
                                                <Sparkles size={12} />
                                                AI Magic Writer
                                            </button>
                                            {templates.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setMessageText(t.content)}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Message Editor OR Template Name Input */}
                                <div className="flex-1 p-4 flex flex-col gap-4">
                                    {isTemplateMode ? (
                                        <div className="space-y-4">
                                            <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-xl">
                                                <h4 className="text-yellow-400 font-bold text-sm mb-1 flex items-center gap-2">
                                                    <AlertTriangle size={16} />
                                                    Attenzione
                                                </h4>
                                                <p className="text-xs text-yellow-200/80">
                                                    Per invii di massa (Marketing) devi usare <strong>Template approvati da Meta</strong>.
                                                    Inserisci qui sotto il nome ESATTO del template (es. <code>hello_world</code> o il tuo template personalizzato).
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome Template Meta</label>
                                                <input
                                                    type="text"
                                                    value={templateNameInput}
                                                    onChange={(e) => setTemplateNameInput(e.target.value)}
                                                    placeholder="es. hello_world"
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-green-500 font-mono text-sm"
                                                />
                                            </div>

                                            <div className="text-xs text-slate-500">
                                                Nota: Se il template ha variabili, per ora verranno ignorate in questa versione semplificata. Assicurati di usare template senza parametri o statici per il test.
                                            </div>
                                        </div>
                                    ) : (
                                        <textarea
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Scrivi il tuo messaggio qui...

Usa {nome} per inserire il nome del cliente
Usa {cognome} per il cognome
Usa {citta} per la città
Usa {data} per una data futura (7 giorni)"
                                            className="w-full h-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 resize-none outline-none focus:border-green-500"
                                        />
                                    )}
                                </div>

                                {/* Preview */}
                                {messageText && (
                                    <div className="p-4 border-t border-slate-800">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Anteprima</label>
                                        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-sm text-green-300">
                                            {personalizeMessage(messageText, {
                                                id: 'preview',
                                                firstName: 'Mario',
                                                lastName: 'Rossi',
                                                phone: '3331234567',
                                                city: 'Roma',
                                                createdAt: Date.now(),
                                                totalVisits: 5,
                                                totalSpent: 250,
                                                vip: false
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="p-4 border-t border-slate-800 flex gap-3">
                                    <button
                                        onClick={addToQueue}
                                        disabled={!messageText.trim() || (sendMode === 'single' && selectedCustomers.length === 0)}
                                        className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send size={18} />
                                        Aggiungi alla Coda
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'queue' && (
                        <div className="h-full flex flex-col">
                            {/* Queue Controls */}
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (!isQueueRunning) {
                                                setIsQueueRunning(true);
                                                processNextMessage(messageQueue);
                                            } else {
                                                setIsQueueRunning(false);
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${isQueueRunning
                                            ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                            : 'bg-green-600 hover:bg-green-500 text-white'
                                            }`}
                                    >
                                        {isQueueRunning ? <Pause size={16} /> : <Play size={16} />}
                                        {isQueueRunning ? 'Pausa' : 'Avvia'}
                                    </button>
                                    <button
                                        onClick={retryFailed}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm text-slate-300 flex items-center gap-2 transition-colors"
                                    >
                                        <RefreshCw size={16} />
                                        Riprova Falliti
                                    </button>
                                    <button
                                        onClick={clearCompleted}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm text-slate-300 flex items-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        Pulisci
                                    </button>
                                </div>

                                {/* AI Schedule Info */}
                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <Zap size={14} className="text-green-400" />
                                        <span>AI Scheduler Attivo</span>
                                    </div>
                                    <div>
                                        {isValidSendingTime() ? (
                                            <span className="text-green-400">✓ Orario valido per invio</span>
                                        ) : (
                                            <span className="text-red-400">✗ Fuori orario (invii bloccati)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Queue List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {messageQueue.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Clock size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Nessun messaggio in coda</p>
                                        <p className="text-xs mt-2">Componi un messaggio per iniziare</p>
                                    </div>
                                ) : (
                                    messageQueue.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`p-4 rounded-xl border flex items-center gap-4 ${msg.status === 'queued' ? 'bg-slate-800 border-slate-700' :
                                                msg.status === 'sending' ? 'bg-blue-900/20 border-blue-500' :
                                                    msg.status === 'sent' ? 'bg-green-900/20 border-green-500' :
                                                        msg.status === 'failed' ? 'bg-red-900/20 border-red-500' :
                                                            msg.status === 'cancelled' ? 'bg-slate-800/50 border-slate-700' :
                                                                'bg-slate-800 border-slate-700'
                                                }`}
                                        >
                                            {/* Status Icon */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.status === 'queued' ? 'bg-slate-700' :
                                                msg.status === 'sending' ? 'bg-blue-500/20' :
                                                    msg.status === 'sent' ? 'bg-green-500/20' :
                                                        msg.status === 'failed' ? 'bg-red-500/20' :
                                                            'bg-slate-700'
                                                }`}>
                                                {msg.status === 'queued' && <Clock size={20} className="text-slate-400" />}
                                                {msg.status === 'sending' && <Loader2 size={20} className="text-blue-400 animate-spin" />}
                                                {msg.status === 'sent' && <CheckCircle size={20} className="text-green-400" />}
                                                {msg.status === 'failed' && <XCircle size={20} className="text-red-400" />}
                                                {msg.status === 'cancelled' && <X size={20} className="text-slate-500" />}
                                            </div>

                                            {/* Message Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white text-sm">{msg.customerName}</div>
                                                <div className="text-xs text-slate-400">{msg.customerPhone}</div>
                                                <div className="text-xs text-slate-500 mt-1 truncate">{msg.message}</div>
                                                {msg.error && (
                                                    <div className="text-xs text-red-400 mt-1">{msg.error}</div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {msg.status === 'queued' && (
                                                <button
                                                    onClick={() => cancelMessage(msg.id)}
                                                    className="p-2 bg-slate-700 hover:bg-red-900/30 rounded-lg transition-colors"
                                                >
                                                    <X size={16} className="text-slate-400 hover:text-red-400" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'stats' && (
                        <div className="p-6 space-y-6 h-full flex flex-col overflow-hidden">
                            <h3 className="text-xl font-black text-white shrink-0">Statistiche Messaggi</h3>

                            <div className="grid grid-cols-4 gap-4 shrink-0">
                                <button
                                    onClick={() => setSelectedStatDetail(selectedStatDetail === 'sent' ? null : 'sent')}
                                    className={`rounded-2xl p-6 text-center transition-all border-2 ${selectedStatDetail === 'sent' ? 'bg-green-900/20 border-green-500' : 'bg-slate-800 border-transparent hover:border-slate-600'}`}
                                >
                                    <div className="text-4xl font-black text-green-400">{stats.totalSent}</div>
                                    <div className="text-sm text-slate-400 mt-2">Inviati</div>
                                </button>
                                <button
                                    onClick={() => setSelectedStatDetail(selectedStatDetail === 'delivered' ? null : 'delivered')}
                                    className={`rounded-2xl p-6 text-center transition-all border-2 ${selectedStatDetail === 'delivered' ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800 border-transparent hover:border-slate-600'}`}
                                >
                                    <div className="text-4xl font-black text-blue-400">{stats.totalDelivered}</div>
                                    <div className="text-sm text-slate-400 mt-2">Consegnati</div>
                                </button>
                                <button
                                    onClick={() => setSelectedStatDetail(selectedStatDetail === 'failed' ? null : 'failed')}
                                    className={`rounded-2xl p-6 text-center transition-all border-2 ${selectedStatDetail === 'failed' ? 'bg-red-900/20 border-red-500' : 'bg-slate-800 border-transparent hover:border-slate-600'}`}
                                >
                                    <div className="text-4xl font-black text-red-400">{stats.totalFailed}</div>
                                    <div className="text-sm text-slate-400 mt-2">Falliti</div>
                                </button>
                                <button
                                    onClick={() => setSelectedStatDetail(selectedStatDetail === 'queued' ? null : 'queued')}
                                    className={`rounded-2xl p-6 text-center transition-all border-2 ${selectedStatDetail === 'queued' ? 'bg-yellow-900/20 border-yellow-500' : 'bg-slate-800 border-transparent hover:border-slate-600'}`}
                                >
                                    <div className="text-4xl font-black text-yellow-400">{stats.totalInQueue}</div>
                                    <div className="text-sm text-slate-400 mt-2">In Coda</div>
                                </button>
                            </div>

                            {selectedStatDetail && (
                                <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                                        <h4 className="font-bold text-white flex items-center gap-2">
                                            <List size={18} className="text-slate-400" />
                                            Dettaglio: {
                                                selectedStatDetail === 'sent' ? 'Messaggi Inviati' :
                                                    selectedStatDetail === 'delivered' ? 'Messaggi Consegnati' :
                                                        selectedStatDetail === 'failed' ? 'Messaggi Falliti' : 'Messaggi in Coda'
                                            }
                                        </h4>
                                        <button onClick={() => setSelectedStatDetail(null)} className="p-1 hover:bg-slate-700 rounded-full transition-colors">
                                            <X size={16} className="text-slate-400" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {messageQueue.filter(m =>
                                            selectedStatDetail === 'queued' ? (m.status === 'queued' || m.status === 'sending') :
                                                m.status === selectedStatDetail
                                        ).length === 0 ? (
                                            <div className="text-center py-8 text-slate-500">
                                                <Users size={32} className="mx-auto mb-2 opacity-30" />
                                                <p>Nessun messaggio in questa lista</p>
                                            </div>
                                        ) : (
                                            messageQueue.filter(m =>
                                                selectedStatDetail === 'queued' ? (m.status === 'queued' || m.status === 'sending') :
                                                    m.status === selectedStatDetail
                                            ).map(msg => (
                                                <div key={msg.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                                                        msg.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                            msg.status === 'queued' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                        <User size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-white text-sm">{msg.customerName}</span>
                                                            <span className="text-xs text-slate-500 font-mono">
                                                                {new Date(msg.sentTime || msg.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-400 truncate">{msg.customerPhone}</div>
                                                        <div className="text-xs text-slate-500 truncate mt-0.5 opacity-70">
                                                            {msg.message}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* AI Scheduler Info (only visible if no detail selected) */}
                            {!selectedStatDetail && (
                                <div className="bg-slate-800 rounded-2xl p-6">
                                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <Zap size={18} className="text-yellow-400" />
                                        Configurazione AI Scheduler
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-slate-400">Orari Alta Frequenza:</span>
                                            <span className="text-white ml-2">08:00 - 12:00</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Orari Media Frequenza:</span>
                                            <span className="text-white ml-2">12:00 - 18:00</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Orari Bassa Frequenza:</span>
                                            <span className="text-white ml-2">18:00 - 20:00</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Blocco Notturno:</span>
                                            <span className="text-red-400 ml-2">20:00 - 08:00</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Max Messaggi/Ora:</span>
                                            <span className="text-white ml-2">{AI_SCHEDULER_CONFIG.maxMessagesPerHour}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Max Messaggi/Giorno:</span>
                                            <span className="text-white ml-2">{AI_SCHEDULER_CONFIG.maxMessagesPerDay}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'templates' && (
                        <div className="h-full flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-slate-800">
                                <h3 className="text-xl font-black text-white">Template Messaggi</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid gap-4">
                                    {templates.map(template => (
                                        <div key={template.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-white">{template.name}</h4>
                                                <button
                                                    onClick={() => { setMessageText(template.content); setView('compose'); }}
                                                    className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold text-white transition-colors"
                                                >
                                                    Usa Template
                                                </button>
                                            </div>
                                            <p className="text-sm text-slate-300">{template.content}</p>
                                            <div className="mt-3 flex gap-2">
                                                {template.variables.map(v => (
                                                    <span key={v} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-400">
                                                        {`{${v}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* AI Magic Modal */}
            {
                showAiModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600" />

                            <button
                                onClick={() => setShowAiModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-900/40">
                                    <Sparkles size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-black text-white">AI Magic Writer</h3>
                                <p className="text-slate-400 text-sm mt-1">Descrivi cosa vuoi dire, l'IA scriverà per te.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Obiettivo / Argomento</label>
                                    <textarea
                                        value={aiTopic}
                                        onChange={(e) => setAiTopic(e.target.value)}
                                        placeholder="Es. Offerta speciale per San Valentino, Sconto 20% se prenoti oggi..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-600 outline-none focus:border-purple-500 resize-none h-24 text-sm"
                                        autoFocus
                                    />
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!aiTopic.trim()) return;
                                        setIsGeneratingAi(true);
                                        try {
                                            const generated = await generateWhatsAppMessage(aiTopic);
                                            if (generated) {
                                                setMessageText(generated);
                                                setShowAiModal(false);
                                                setAiTopic('');
                                                showToast('✨ Messaggio generato!', 'success');
                                            }
                                        } catch (e) {
                                            showToast('Errore generazione', 'error');
                                        } finally {
                                            setIsGeneratingAi(false);
                                        }
                                    }}
                                    disabled={!aiTopic.trim() || isGeneratingAi}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isGeneratingAi ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Generazione in corso...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Genera Messaggio
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default WhatsAppManager;
