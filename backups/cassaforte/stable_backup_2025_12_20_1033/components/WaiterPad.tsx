import React, { useState, useEffect, useRef } from 'react';
import {
    Order, OrderStatus, Category, MenuItem, OrderItem
} from '../types';
import {
    getOrders, addOrder, updateOrderStatus, updateOrderItems,
    toggleOrderItemCompletion, serveItem,
    getWaiterName, logoutWaiter, getMenuItems,
    freeTable, getAppSettings, getAutomations, getTableCount,
    fetchSettingsFromCloud
} from '../services/storageService';
import {
    LogOut, Plus, Search, Utensils, CheckCircle,
    ChevronLeft, Trash2, User, Clock,
    DoorOpen, ChefHat, Pizza, Sandwich,
    Wine, CakeSlice, UtensilsCrossed, Send as SendIcon, CheckSquare, Square, BellRing, X, ArrowLeft, AlertTriangle, Home, Lock, Mic, MicOff, Edit3
} from 'lucide-react';

interface WaiterPadProps {
    onExit: () => void;
}

const CATEGORIES = [
    Category.MENU_COMPLETO,
    Category.ANTIPASTI,
    Category.PRIMI,
    Category.SECONDI,
    Category.PIZZE,
    Category.PANINI,
    Category.DOLCI,
    Category.BEVANDE
];

const getCategoryIcon = (cat: Category) => {
    switch (cat) {
        case Category.MENU_COMPLETO: return <Utensils size={16} />;
        case Category.ANTIPASTI: return <UtensilsCrossed size={16} />;
        case Category.PANINI: return <Sandwich size={16} />;
        case Category.PIZZE: return <Pizza size={16} />;
        case Category.PRIMI: return <ChefHat size={16} />;
        case Category.SECONDI: return <Utensils size={16} />;
        case Category.DOLCI: return <CakeSlice size={16} />;
        case Category.BEVANDE: return <Wine size={16} />;
        default: return <Utensils size={16} />;
    }
};

const WaiterPad: React.FC<WaiterPadProps> = ({ onExit }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [tableCount, setTableCount] = useState(12);

    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [view, setView] = useState<'tables' | 'menu' | 'cart'>('tables');
    const [activeCategory, setActiveCategory] = useState<Category>(Category.ANTIPASTI);

    const [cart, setCart] = useState<OrderItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Custom Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSending, setIsSending] = useState(false); // NEW: Sending State
    const [showFreeTableModal, setShowFreeTableModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false); // NEW: Logout Modal State

    // REVIEW TOAST STATE
    const freedTablesCountRef = useRef(0);
    const [showReviewToast, setShowReviewToast] = useState(false);
    const [reviewPlatformName, setReviewPlatformName] = useState('Google');

    // VOICE NOTES STATE
    const [tempNote, setTempNote] = useState(''); // Temporary note input
    const [isRecording, setIsRecording] = useState(false); // Mic recording state
    const [currentNoteItemIndex, setCurrentNoteItemIndex] = useState<number | null>(null); // Which cart item is being edited
    const recognitionRef = useRef<any>(null); // Speech Recognition instance

    // EDIT NOTE MODAL STATE
    const [editingNote, setEditingNote] = useState<{ itemIndex: number; noteIndex: number; currentText: string } | null>(null);

    const waiterName = getWaiterName();

    const loadData = () => {
        try {
            const fetchedOrders = getOrders() || [];
            const fetchedMenu = getMenuItems() || [];
            const fetchedTables = getTableCount() || 12;

            setOrders(fetchedOrders);
            setMenuItems(fetchedMenu);
            setTableCount(fetchedTables);
        } catch (e) {
            console.error("Critical Error loading WaiterPad data:", e);
            setOrders([]);
            setMenuItems([]);
        }
    };

    useEffect(() => {
        loadData();
        const handleStorage = () => loadData();
        window.addEventListener('local-storage-update', handleStorage);
        window.addEventListener('local-menu-update', handleStorage);
        window.addEventListener('local-settings-update', handleStorage);
        return () => {
            window.removeEventListener('local-storage-update', handleStorage);
            window.removeEventListener('local-menu-update', handleStorage);
            window.removeEventListener('local-settings-update', handleStorage);
        };
    }, []);

    // COLLABORATION LOGIC REMOVED - Returning to simple waiter-per-table model

    const getTableStatus = (tableNum: string) => {
        if (!orders) return 'free';
        const tableOrders = orders.filter(o => o.tableNumber === tableNum && o.status !== OrderStatus.DELIVERED);
        if (tableOrders.length === 0) return 'free';

        const allItemsServed = tableOrders.every(order => (order.items || []).every(item => item.served));
        if (allItemsServed) return 'completed';

        const hasItemsToServe = tableOrders.some(o => (o.items || []).some(i => i.completed && !i.served));
        if (hasItemsToServe) return 'ready';

        // Check for delay on ANY active order (PENDING or COOKING)
        const activeOrder = tableOrders.find(o => o.status === OrderStatus.COOKING || o.status === OrderStatus.PENDING);
        if (activeOrder) {
            const elapsedMinutes = (Date.now() - activeOrder.timestamp) / 60000;
            if (elapsedMinutes > 25) return 'delayed'; // 25 min threshold (matches KitchenDisplay)
        }

        if (tableOrders.some(o => o.status === OrderStatus.COOKING)) {
            return 'cooking';
        }

        const settings = getAppSettings();
        const reservations = settings.tableReservations || [];
        if (reservations.includes(tableNum)) return 'reserved';

        return 'occupied';
    };

    // RESERVATION FUNCTION REMOVED - Handled by Cassa

    // Helper to get time elapsed string
    const getElapsedTime = (tableNum: string) => {
        const order = orders.find(o => o.tableNumber === tableNum && (o.status === OrderStatus.COOKING || o.status === OrderStatus.PENDING));
        if (!order) return null;
        const minutes = Math.floor((Date.now() - order.timestamp) / 60000);
        return `${minutes}m`;
    };

    const activeTableOrder = selectedTable
        ? orders.find(o => o.tableNumber === selectedTable && o.status !== OrderStatus.DELIVERED)
        : null;

    const handleTableClick = (tableNum: string) => {
        setSelectedTable(tableNum);
        setCart([]);
        setView('tables');
    };

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.menuItem.id === item.id && !i.notes);
            if (existing) {
                return prev.map(i => i.menuItem.id === item.id && !i.notes
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
                );
            }
            return [...prev, { menuItem: item, quantity: 1, served: false, completed: false }];
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateCartQuantity = (index: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];
            const newQty = item.quantity + delta;
            if (newQty <= 0) return prev.filter((_, i) => i !== index);
            newCart[index] = { ...item, quantity: newQty };
            return newCart;
        });
    };

    const updateItemNotes = (index: number, notes: string) => {
        setCart(prev => {
            const newCart = [...prev];
            newCart[index] = { ...newCart[index], notes };
            return newCart;
        });
    };

    // VOICE RECOGNITION FUNCTIONS
    const toggleRecording = (itemIndex: number) => {
        if (isRecording) {
            // Stop recording
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsRecording(false);
        } else {
            // Start recording
            setCurrentNoteItemIndex(itemIndex);
            setIsRecording(true);

            // Initialize Web Speech API
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('Il tuo browser non supporta il riconoscimento vocale. Usa Chrome o Edge.');
                setIsRecording(false);
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'it-IT';
            recognition.continuous = false; // Stop after pause
            recognition.interimResults = true; // Show results in real-time

            recognition.onresult = (event: any) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setTempNote(transcript);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
                if (event.error === 'no-speech') {
                    alert('Nessun audio rilevato. Riprova.');
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    const addNoteToItem = (itemIndex: number) => {
        if (!tempNote.trim()) return;

        setCart(prev => {
            const newCart = [...prev];
            const currentNotes = newCart[itemIndex].notes || '';
            const notesArray = currentNotes ? currentNotes.split('|||') : [];
            notesArray.push(tempNote.trim());
            newCart[itemIndex] = { ...newCart[itemIndex], notes: notesArray.join('|||') };
            return newCart;
        });

        // Stop microphone if recording
        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }

        setTempNote('');
        setCurrentNoteItemIndex(null);
    };

    const removeNoteFromItem = (itemIndex: number, noteIndex: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const currentNotes = newCart[itemIndex].notes || '';
            const notesArray = currentNotes.split('|||');
            notesArray.splice(noteIndex, 1);
            newCart[itemIndex] = { ...newCart[itemIndex], notes: notesArray.length > 0 ? notesArray.join('|||') : undefined };
            return newCart;
        });
    };

    const editNoteInItem = (itemIndex: number, noteIndex: number, newText: string) => {
        setCart(prev => {
            const newCart = [...prev];
            const currentNotes = newCart[itemIndex].notes || '';
            const notesArray = currentNotes.split('|||');
            notesArray[noteIndex] = newText;
            newCart[itemIndex] = { ...newCart[itemIndex], notes: notesArray.join('|||') };
            return newCart;
        });
    };

    // COLLABORATION FUNCTIONS REMOVED

    const requestSendOrder = () => {
        if (!selectedTable || cart.length === 0) return;
        setShowConfirmModal(true);
    };

    const finalizeOrder = async () => {
        try {
            if (!selectedTable) return;
            if (cart.length === 0) return;
            setIsSending(true);

            const currentOrders = getOrders();
            const currentActiveOrder = currentOrders.find(o => o.tableNumber === selectedTable && o.status !== OrderStatus.DELIVERED);

            if (currentActiveOrder) {
                await updateOrderItems(currentActiveOrder.id, cart);
            } else {
                // MORE ROBUST ID GENERATION TO PREVENT COLLISIONS
                const randomSuffix = Math.random().toString(36).substring(2, 8);
                const newId = `order_${Date.now()}_${randomSuffix}`;

                const newOrder: Order = {
                    id: newId,
                    tableNumber: selectedTable,
                    items: cart,
                    status: OrderStatus.PENDING,
                    timestamp: Date.now(),
                    createdAt: Date.now(),
                    waiterName: waiterName || 'Staff'
                };
                await addOrder(newOrder);
            }

            // SUCCESS PATH (Even if DB fails, local is saved)
            setCart([]);
            setShowConfirmModal(false);
            setSelectedTable(null);
            setView('tables');
            setTimeout(() => loadData(), 100);

        } catch (error: any) {
            console.error("Errore invio ordine:", error);
            // Alert is handled in storageService for QuotaExceeded, but fallback here
            if (!error.message?.includes('quota')) {
                alert(`Si è verificato un errore: ${error.message}`);
            }
            setShowConfirmModal(false);
        } finally {
            setIsSending(false);
        }
    };

    const handleFreeTableRequest = () => {
        if (selectedTable) {
            setShowFreeTableModal(true);
        }
    };

    const confirmFreeTable = async () => {
        if (!selectedTable) return;
        try {
            await freeTable(selectedTable);
            setSelectedTable(null);
            setShowFreeTableModal(false);

            // MARKETING AUTOMATION: REVIEW REQUEST (OGNI 3-5 TAVOLI)
            try {
                const automations = getAutomations();
                const reviewAuto = automations.find(a => a.type === 'review_request' && a.isActive);
                if (reviewAuto) {
                    freedTablesCountRef.current += 1;
                    // Show every 3-5 tables (randomized between 3 and 5)
                    const threshold = freedTablesCountRef.current === 1 ? 3 : (freedTablesCountRef.current % 4 === 0 ? 4 : (freedTablesCountRef.current % 3 === 0 ? 3 : 0));
                    if (freedTablesCountRef.current >= 3 && freedTablesCountRef.current % 3 === 0) {
                        const platform = reviewAuto.config?.reviewPlatform === 'google' ? 'Google' : reviewAuto.config?.reviewPlatform === 'tripadvisor' ? 'TripAdvisor' : 'Google/TripAdvisor';
                        setReviewPlatformName(platform);
                        setTimeout(() => {
                            setShowReviewToast(true);
                            setTimeout(() => setShowReviewToast(false), 5000); // Auto-hide after 5s
                        }, 600);
                    }
                }
            } catch (e) { console.error("Auto error", e); }

            // Give a bit more time for the DB sync or local update to propagate
            setTimeout(loadData, 200);
        } catch (e) {
            console.error("Failed to free table:", e);
            alert("Errore durante la liberazione del tavolo. Riprova.");
            setShowFreeTableModal(false);
        }
    };

    const handleServeItem = (orderId: string, itemIdx: number) => {
        serveItem(orderId, itemIdx);
        setTimeout(loadData, 50);
    };

    const handleBackFromMenu = () => {
        setCart([]);
        setView('tables');
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        logoutWaiter(); // Clear from local storage
        onExit(); // Go back to Role Selection
    };

    const filteredItems = (menuItems || []).filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = item.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    if (!orders || !menuItems) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Caricamento dati...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans relative">

            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up text-center">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500 animate-pulse">
                            <SendIcon size={32} className="ml-1" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Confermi l'ordine?</h3>
                        <p className="text-slate-400 mb-6">
                            Stai per inviare <strong>{cart.reduce((a, b) => a + b.quantity, 0)} piatti</strong><br />
                            al <strong>Tavolo {selectedTable}</strong>.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button onClick={finalizeOrder} disabled={isSending} className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {isSending ? 'INVIO IN CORSO...' : <><CheckCircle size={20} /> SÌ, INVIA IN CUCINA</>}
                            </button>
                            <button onClick={() => setShowConfirmModal(false)} disabled={isSending} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all">
                                ANNULLA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showFreeTableModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up text-center">
                        <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 animate-pulse">
                            <DoorOpen size={32} className="ml-1" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Libera Tavolo</h3>
                        <p className="text-slate-400 mb-6">
                            Vuoi davvero liberare il <strong>Tavolo {selectedTable}</strong>?<br />
                            L'azione cancellerà lo stato del tavolo.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button onClick={confirmFreeTable} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <CheckCircle size={20} /> SÌ, LIBERA
                            </button>
                            <button onClick={() => setShowFreeTableModal(false)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all">
                                ANNULLA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up text-center">
                        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 animate-pulse">
                            <LogOut size={32} className="ml-1" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Cambio Account</h3>
                        <p className="text-slate-400 mb-6">
                            Vuoi uscire dalla sessione di <strong>{waiterName || 'Staff'}</strong>?<br />
                            Dovrai selezionare nuovamente il profilo.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button onClick={confirmLogout} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <LogOut size={20} /> SÌ, ESCI
                            </button>
                            <button onClick={() => setShowLogoutModal(false)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all">
                                ANNULLA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REVIEW REQUEST TOAST */}
            {showReviewToast && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[200] animate-slide-down">
                    <div className="bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-yellow-400/50 flex items-center gap-4 max-w-sm">
                        <div className="text-4xl animate-bounce">⭐</div>
                        <div>
                            <h4 className="text-white font-black text-lg">Chiedi una Recensione!</h4>
                            <p className="text-yellow-100 text-sm font-medium">
                                Ricorda: {reviewPlatformName} 🙏
                            </p>
                        </div>
                        <button
                            onClick={() => setShowReviewToast(false)}
                            className="ml-2 text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* EDIT NOTE MODAL */}
            {editingNote && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up">
                        <h3 className="text-xl font-black text-white mb-4">Modifica Nota</h3>
                        <input
                            type="text"
                            value={editingNote.currentText}
                            onChange={(e) => setEditingNote({ ...editingNote, currentText: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none mb-6"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingNote(null)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => {
                                    if (editingNote.currentText.trim()) {
                                        editNoteInItem(editingNote.itemIndex, editingNote.noteIndex, editingNote.currentText.trim());
                                    }
                                    setEditingNote(null);
                                }}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                            >
                                Salva
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* COLLABORATION TOASTS REMOVED */}

            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shadow-lg z-30 relative shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><User size={18} className="text-white" /></div> {waiterName || 'Waiter Pad'}</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={onExit} className="bg-slate-700 p-2 rounded-full text-slate-300 hover:text-white hover:bg-blue-600 transition-colors" title="Torna alla Home (Mantieni Sessione)">
                        <Home size={20} />
                    </button>
                    <button onClick={handleLogout} className="bg-slate-700 p-2 rounded-full text-slate-300 hover:text-white hover:bg-red-600 transition-colors" title="Cambia Cameriere (Logout)">
                        <LogOut size={20} />
                    </button>

                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative">
                {view === 'tables' && (
                    <div className="flex-1 overflow-y-auto p-4 relative">
                        {selectedTable && (
                            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                                <div className="bg-slate-900 w-full sm:max-w-md h-[85vh] sm:h-auto sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                                    <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800">
                                        <div>
                                            <h2 className="text-2xl font-black text-white">Tavolo {selectedTable}</h2>
                                            <p className={`text-xs font-bold uppercase ${activeTableOrder ? 'text-green-400' : getTableStatus(selectedTable) === 'reserved' ? 'text-purple-400' : 'text-slate-400'}`}>
                                                {activeTableOrder ? 'Occupato' : getTableStatus(selectedTable) === 'reserved' ? 'Prenotato' : 'Libero'}
                                            </p>
                                        </div>
                                        <button onClick={() => setSelectedTable(null)} className="p-2 bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={20} /></button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-5 pb-24">
                                        {activeTableOrder ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase"><Clock size={14} /> Iniziato alle</div>
                                                    <div className="font-mono font-bold">{new Date(activeTableOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Comanda Attuale</p>
                                                    <div className="space-y-2">
                                                        {activeTableOrder.items && activeTableOrder.items.length > 0 ? (
                                                            activeTableOrder.items.map((item, idx) => {
                                                                const isReadyToServe = item.completed && !item.served;
                                                                const isServed = item.served;
                                                                return (
                                                                    <div key={idx} className={`flex justify-between items-center text-sm p-3 rounded-lg border transition-all ${isReadyToServe ? 'bg-green-900/30 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-slate-800/50 border-slate-700'}`}>
                                                                        <div className="flex gap-3 items-center flex-1">
                                                                            <span className="font-bold text-white bg-slate-700 px-2 py-1 rounded text-xs">x{item.quantity}</span>
                                                                            <div className="flex flex-col">
                                                                                <span className={`font-bold text-base ${isServed ? 'line-through text-slate-500' : isReadyToServe ? 'text-white' : 'text-slate-300'}`}>{item.menuItem?.name || 'Item'}</span>
                                                                                {item.notes && <span className="text-xs text-orange-400 italic">{item.notes}</span>}
                                                                                {isReadyToServe && <span className="text-[10px] font-black text-green-400 uppercase tracking-wider animate-pulse flex items-center gap-1 mt-1"><BellRing size={10} /> DA SERVIRE</span>}
                                                                            </div>
                                                                        </div>
                                                                        {isReadyToServe ? (
                                                                            <button onClick={() => handleServeItem(activeTableOrder.id, idx)} className="ml-2 bg-green-500 hover:bg-green-400 text-white p-2 rounded-lg shadow-lg active:scale-95 transition-all">
                                                                                <Square size={20} className="fill-current text-green-700" />
                                                                            </button>
                                                                        ) : isServed ? (
                                                                            <CheckSquare size={20} className="text-slate-600 ml-2" />
                                                                        ) : (
                                                                            <span className="font-mono text-slate-500 ml-2 text-xs">Cooking</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <p className="text-slate-500 italic">Nessun elemento nell'ordine.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                                                <Utensils size={48} className="mb-4" />
                                                <p>Nessun ordine attivo</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 border-t border-slate-800 bg-slate-800 flex gap-2 mb-10">
                                        <button onClick={() => setView('menu')} className="flex-[2] py-4 rounded-2xl font-black text-base tracking-wide text-white shadow-xl bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-transform flex flex-col items-center justify-center gap-1 hover:scale-[1.02] shadow-blue-900/30">
                                            <Plus size={24} /> <span>{activeTableOrder ? 'AGGIUNGI' : 'NUOVO ORDINE'}</span>
                                        </button>
                                        {/* RESERVATION BUTTON REMOVED - Will be handled by Cassa */}
                                        {activeTableOrder && (
                                            <button onClick={handleFreeTableRequest} className="flex-1 bg-orange-500 border-2 border-orange-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:bg-orange-600 transition-all flex flex-col items-center justify-center gap-2 hover:scale-[1.02]">
                                                <DoorOpen size={20} className="mb-1" />
                                                <span className="text-[10px] leading-tight">Sì, Libera</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.from({ length: tableCount }, (_, i) => i + 1).map(num => {
                                const tableNum = num.toString();
                                const status = getTableStatus(tableNum);
                                const isSelected = selectedTable === tableNum;
                                const elapsedTime = getElapsedTime(tableNum);
                                const currentTableOrder = orders.find(o => o.tableNumber === tableNum && o.status !== OrderStatus.DELIVERED);
                                const isLocked = currentTableOrder?.waiterName && waiterName && currentTableOrder.waiterName !== waiterName;

                                let bgClass = "bg-slate-800 border-slate-700 hover:border-slate-500";
                                let statusIcon = null;

                                if (status === 'occupied') { bgClass = "bg-blue-900/40 border-blue-500/50 text-blue-100"; statusIcon = <User size={12} />; }
                                if (status === 'cooking') { bgClass = "bg-orange-900/40 border-orange-500/50 text-orange-100"; statusIcon = <ChefHat size={12} />; }
                                if (status === 'ready') { bgClass = "bg-green-600 border-green-400 text-white animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"; statusIcon = <BellRing size={14} className="animate-wiggle" />; }
                                if (status === 'completed') { bgClass = "bg-orange-700/80 border-orange-500 text-white shadow-lg"; statusIcon = <CheckSquare size={12} />; }
                                if (status === 'delayed') { bgClass = "bg-red-900/20 border-red-500 text-red-500 animate-pulse ring-2 ring-red-500/50"; statusIcon = <AlertTriangle size={12} />; }
                                if (status === 'reserved') { bgClass = "bg-purple-900/20 border-purple-500/50 text-purple-200 border-dashed"; statusIcon = <Lock size={12} />; }

                                if (isSelected) bgClass = "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105";

                                // Tavolo di un altro cameriere: mostra lucchetto ma permetti click
                                if (isLocked && status !== 'free') {
                                    bgClass = "bg-slate-800 border-slate-600 text-slate-500 opacity-60 cursor-not-allowed grayscale";
                                }

                                return (
                                    <button
                                        key={num}
                                        onClick={() => {
                                            // Se il tavolo è di un altro cameriere, non permettere accesso
                                            if (isLocked && status !== 'free') {
                                                return; // Non fare nulla
                                            }
                                            handleTableClick(tableNum);
                                        }}
                                        className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 shadow-lg transition-all active:scale-95 relative ${bgClass}`}
                                    >
                                        <span className="text-3xl font-black">{num}</span>

                                        {/* DELAY TIMER INDICATOR */}
                                        {(status === 'delayed' || status === 'cooking') && elapsedTime && (
                                            <div className={`absolute top-[-8px] right-[-8px] px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm z-10 ${status === 'delayed' ? 'bg-red-500 text-white animate-bounce' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                                                <Clock size={10} /> {elapsedTime}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase min-h-[16px]">
                                            {status !== 'free' && (isLocked ? <Lock size={12} /> : statusIcon)}
                                            {status === 'ready' ? 'SERVIRE' : status === 'reserved' ? 'PRENOTATO' : status === 'free' ? 'LIBERO' : status}
                                        </div>
                                        <div className="text-[9px] font-mono opacity-80 mt-0.5 truncate max-w-[90%] min-h-[14px]">
                                            {currentTableOrder?.waiterName || ''}
                                        </div>
                                        {status === 'ready' && <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {view === 'menu' && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="shrink-0 bg-slate-900 z-20 shadow-md">
                            <div className="bg-slate-800 p-2 border-b border-slate-700 flex items-center gap-2">
                                <button onClick={handleBackFromMenu} className="p-3 bg-slate-700 text-slate-300 rounded-xl font-bold border border-slate-600 hover:bg-slate-600 hover:text-white shrink-0">
                                    <ArrowLeft size={18} />
                                </button>
                                <div className="flex-1 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-slate-400'}`}
                                        >
                                            {getCategoryIcon(cat)} {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 bg-slate-800 border-b border-slate-700">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cerca piatto..."
                                        className="w-full bg-slate-900 text-white rounded-xl pl-10 pr-4 py-3 border border-slate-700 focus:border-blue-500 outline-none font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pb-32">
                            <div className="grid grid-cols-2 gap-3">
                                {filteredItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className="flex flex-col h-32 bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:bg-slate-750 active:scale-[0.98] transition-all relative group shadow-sm overflow-hidden justify-between"
                                    >
                                        <div className="absolute top-2 right-2 p-1.5 bg-blue-600 rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <Plus size={16} />
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center font-bold text-slate-400 shrink-0">
                                            {item.category === Category.BEVANDE ? <Wine size={20} /> : <Utensils size={20} />}
                                        </div>
                                        <div className="w-full">
                                            <h3 className="font-black text-xl leading-none bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent break-words hyphens-auto text-left">
                                                {item.name}
                                            </h3>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {filteredItems.length === 0 && (
                                <div className="text-center py-10 text-slate-500">
                                    <p>Nessun piatto trovato.</p>
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="fixed bottom-6 left-4 right-4 z-30 flex gap-3 shadow-2xl animate-slide-up">
                                <button onClick={() => setView('cart')} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-green-600/30 flex items-center justify-between px-6 transition-transform active:scale-95">
                                    <span className="tracking-wide">RIEPILOGO</span>
                                    <span className="bg-white text-green-600 font-black w-8 h-8 flex items-center justify-center rounded-full text-sm shadow-sm">
                                        {cart.reduce((a, b) => a + b.quantity, 0)}
                                    </span>
                                </button>
                                <button onClick={requestSendOrder} className="w-20 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center transition-transform active:scale-95 border-2 border-orange-400">
                                    <SendIcon size={28} className="ml-1" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {view === 'cart' && (
                    <div className="flex-1 flex flex-col bg-slate-900">
                        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3 shrink-0">
                            <button onClick={() => setView('menu')} className="p-2 bg-slate-700 rounded-lg text-slate-300"><ChevronLeft size={24} /></button>
                            <h2 className="text-xl font-black text-white">Riepilogo Ordine</h2>
                        </div>


                        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                            {cart.map((item, idx) => {
                                const notesArray = item.notes ? item.notes.split('|||') : [];
                                const isCurrentlyEditing = currentNoteItemIndex === idx;

                                return (
                                    <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg">{item.menuItem?.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-slate-700">
                                                <button onClick={() => updateCartQuantity(idx, -1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors font-bold">-</button>
                                                <span className="font-bold w-6 text-center">{item.quantity}</span>
                                                <button onClick={() => updateCartQuantity(idx, 1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-green-500/20 hover:text-green-400 rounded-md transition-colors font-bold">+</button>
                                            </div>
                                        </div>

                                        {/* NOTE INPUT WITH VOICE */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Aggiungi Nota</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Scrivi o detta una nota..."
                                                    value={isCurrentlyEditing ? tempNote : ''}
                                                    onChange={(e) => {
                                                        setCurrentNoteItemIndex(idx);
                                                        setTempNote(e.target.value);
                                                    }}
                                                    onFocus={() => setCurrentNoteItemIndex(idx)}
                                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                                />
                                                <button
                                                    onClick={() => toggleRecording(idx)}
                                                    className={`p-2 rounded-lg transition-all ${isRecording && isCurrentlyEditing ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-blue-600 hover:text-white'}`}
                                                    title={isRecording && isCurrentlyEditing ? 'Stop Recording' : 'Start Voice Input'}
                                                >
                                                    {isRecording && isCurrentlyEditing ? <MicOff size={20} /> : <Mic size={20} />}
                                                </button>
                                                <button
                                                    onClick={() => addNoteToItem(idx)}
                                                    disabled={!isCurrentlyEditing || !tempNote.trim()}
                                                    className="p-2 bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                                                    title="Aggiungi Nota"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* NOTES LIST */}
                                        {notesArray.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-orange-400 uppercase flex items-center gap-1">
                                                    <span>Note ({notesArray.length})</span>
                                                </label>
                                                {notesArray.map((note, noteIdx) => (
                                                    <div key={noteIdx} className="flex items-center gap-2 bg-slate-900/50 border border-orange-500/30 rounded-lg p-2">
                                                        <span className="flex-1 text-sm text-orange-300 italic">• {note}</span>
                                                        <button
                                                            onClick={() => setEditingNote({ itemIndex: idx, noteIndex: noteIdx, currentText: note })}
                                                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                            title="Modifica"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => removeNoteFromItem(idx, noteIdx)}
                                                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                            title="Elimina"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex justify-end">
                                            <button onClick={() => removeFromCart(idx)} className="text-xs text-red-400 flex items-center gap-1 hover:underline"><Trash2 size={12} /> Rimuovi</button>
                                        </div>
                                    </div>
                                );
                            })}

                            {cart.length === 0 && <div className="text-center text-slate-500 mt-10">Carrello vuoto</div>}
                        </div>

                        <div className="fixed bottom-6 left-4 right-4 bg-slate-800 border border-slate-700 p-4 rounded-3xl shadow-2xl z-40">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <span className="text-slate-400 font-bold uppercase text-xs">Totale Piatti</span>
                                <span className="text-3xl font-black text-white">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                            </div>
                            <button onClick={requestSendOrder} disabled={cart.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black text-xl shadow-lg shadow-blue-600/20 transition-transform active:scale-95 flex items-center justify-center gap-3">
                                <CheckCircle size={24} /> CONFERMA ORDINE
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default WaiterPad;