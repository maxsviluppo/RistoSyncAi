import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Order, OrderStatus, Category, AppSettings, Department, OrderItem, MenuItem } from '../types';
import { getOrders, updateOrderStatus, toggleOrderItemCompletion, getAppSettings, getMenuItems, updateOrder } from '../services/storageService';
import { Clock, CheckCircle, ChefHat, Bell, User, LogOut, Square, CheckSquare, AlertOctagon, Timer, PlusCircle, History, Calendar, ChevronLeft, ChevronRight, DollarSign, UtensilsCrossed, Receipt, Pizza, ArrowRightLeft, Utensils, CakeSlice, Wine, Sandwich, ListPlus, Bike, Mic, MicOff, Flame } from 'lucide-react';

const CATEGORY_PRIORITY: Record<Category, number> = {
    [Category.MENU_COMPLETO]: 0,
    [Category.ANTIPASTI]: 1,
    [Category.PANINI]: 2,
    [Category.PIZZE]: 3,
    [Category.PRIMI]: 4,
    [Category.SECONDI]: 5,
    [Category.DOLCI]: 6,
    [Category.BEVANDE]: 7
};

// Configurazione Soglie Ritardo (minuti)
const THRESHOLD_WARNING = 15;
const THRESHOLD_CRITICAL = 25;

const playNotificationSound = (type: 'new' | 'ready' | 'alert') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'new') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start();
            osc.stop(now + 0.3);
        } else if (type === 'ready') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
            osc.start();
            osc.stop(now + 1);
        } else if (type === 'alert') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(220, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sawtooth';
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.setValueAtTime(220, now + 0.5);
            gain2.gain.setValueAtTime(0.1, now + 0.5);
            gain2.gain.linearRampToValueAtTime(0, now + 0.9);
            osc.start();
            osc.stop(now + 0.4);
            osc2.start(now + 0.5);
            osc2.stop(now + 0.9);
        }
    } catch (e) { console.error("Audio error", e); }
};

// --- RECEIPT GENERATOR ---
const generateReceiptHtml = (
    items: OrderItem[],
    dept: string,
    table: string,
    waiter: string,
    restaurantName: string,
    allMenuItems: MenuItem[],
    numberOfGuests: number = 0,
    coverCharge: number = 0,
    discount: number = 0
) => {
    const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString('it-IT');

    // Filter out separators ("A seguire")
    const actualItems = items.filter(item => !item.isSeparator);

    // Calculate subtotal
    const subtotal = actualItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

    // Calculate cover charge (only for adults)
    const coverTotal = numberOfGuests > 0 && coverCharge > 0 ? numberOfGuests * coverCharge : 0;

    // Calculate total before discount
    const totalBeforeDiscount = subtotal + coverTotal;

    // Apply discount
    const finalTotal = totalBeforeDiscount - discount;

    return `
    <html>
        <head>
            <title>Stampa ${dept} - Tavolo ${table}</title>
            <style>
                body { font-family: 'Courier New', monospace; width: 300px; margin: 0; padding: 10px; font-size: 14px; color: black; background: white; }
                .header { text-align: center; border-bottom: 2px dashed black; padding-bottom: 10px; margin-bottom: 10px; }
                .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .dept { font-size: 24px; font-weight: bold; background: black; color: white; display: inline-block; padding: 2px 10px; margin: 5px 0; }
                .meta { font-size: 14px; margin: 2px 0; font-weight: bold; }
                .item { display: flex; margin-bottom: 4px; align-items: baseline; }
                .qty { font-weight: bold; width: 30px; font-size: 16px; }
                .name { flex: 1; font-weight: bold; font-size: 16px; }
                .price { font-weight: bold; font-size: 16px; white-space: nowrap; }
                .notes { display: block; font-size: 12px; margin-left: 30px; font-style: italic; margin-bottom: 4px; }
                .sub-items { margin-left: 30px; font-size: 12px; margin-bottom: 8px; color: #333; }
                .totals { border-top: 2px dashed black; margin-top: 15px; padding-top: 10px; font-size: 16px; }
                .total-line { display: flex; justify-content: space-between; margin: 5px 0; }
                .total-line.discount { color: #d00; font-weight: bold; }
                .total-line.final { font-size: 20px; font-weight: bold; border-top: 2px solid black; padding-top: 8px; margin-top: 8px; }
                .footer { border-top: 2px dashed black; margin-top: 15px; padding-top: 10px; text-align: center; font-size: 10px; }
                .close-btn { display: block; width: 100%; background-color: #ef4444; color: white; text-align: center; padding: 15px 0; font-weight: bold; font-size: 16px; border: none; cursor: pointer; position: fixed; bottom: 0; left: 0; right: 0; text-transform: uppercase; }
                @media print { .no-print { display: none !important; } }
            </style>
        </head>
        <body>
            <div class="header"><div class="title">${restaurantName}</div><div class="dept">${dept}</div><div class="meta">TAVOLO: ${table.replace(/_?history_?/gi, '').trim()}</div><div class="meta">Staff: ${waiter}</div><div style="font-size: 12px; margin-top:5px;">${date} - ${time}</div></div>
            ${actualItems.map(item => {
        let subItemsHtml = '';
        // Resolve sub-items for Menu Combo
        if (item.menuItem.category === Category.MENU_COMPLETO && item.menuItem.comboItems) {
            const subNames = item.menuItem.comboItems.map(id => allMenuItems.find(m => m.id === id)?.name).filter(Boolean);
            if (subNames.length > 0) {
                subItemsHtml = `<div class="sub-items">${subNames.map(n => `<div>- ${n}</div>`).join('')}</div>`;
            }
        }
        const itemTotal = item.menuItem.price * item.quantity;
        return `
                <div class="item"><span class="qty">${item.quantity}</span><span class="name">${item.menuItem.name}</span><span class="price">€ ${itemTotal.toFixed(2)}</span></div>
                ${subItemsHtml}
                ${item.notes ? `<span class="notes">Note: ${item.notes}</span>` : ''}
                `;
    }).join('')}
            <div class="totals">
                <div class="total-line">
                    <span>Subtotale:</span>
                    <span>€ ${subtotal.toFixed(2)}</span>
                </div>
                ${coverTotal > 0 ? `
                <div class="total-line">
                    <span>Coperto (${numberOfGuests} ${numberOfGuests === 1 ? 'persona' : 'persone'}):</span>
                    <span>€ ${coverTotal.toFixed(2)}</span>
                </div>
                ` : ''}
                ${discount > 0 ? `
                <div class="total-line discount">
                    <span>Sconto:</span>
                    <span>- € ${discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-line final">
                    <span>TOTALE:</span>
                    <span>€ ${finalTotal.toFixed(2)}</span>
                </div>
            </div>
            <div class="footer">RistoSync AI - Copia di Cortesia</div>
            <button class="no-print close-btn" onclick="window.close()">✖ CHIUDI FINESTRA</button>
            <script>window.onload = function() { setTimeout(function(){ window.focus(); window.print(); }, 500); }</script>
        </body>
    </html>`;
};

// --- SUB-COMPONENT: ORDER TIMER ---
const OrderTimer: React.FC<{ timestamp: number; status: OrderStatus; onCritical: () => void }> = ({ timestamp, status, onCritical }) => {
    const [elapsed, setElapsed] = useState(Math.floor((Date.now() - timestamp) / 60000));

    useEffect(() => {
        const interval = setInterval(() => {
            const newElapsed = Math.floor((Date.now() - timestamp) / 60000);
            setElapsed(newElapsed);
            if (newElapsed === THRESHOLD_CRITICAL && status !== OrderStatus.READY && status !== OrderStatus.DELIVERED) {
                onCritical();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [timestamp, status, onCritical]);

    if (status === OrderStatus.READY || status === OrderStatus.DELIVERED) return <div className="text-green-800 bg-green-100 px-2 py-1 rounded font-bold text-xs flex items-center gap-1 border border-green-300"><CheckCircle size={14} /> COMPLETA</div>;

    let colorClass = "text-slate-400";
    let bgClass = "bg-slate-700";
    let icon = <Timer size={14} />;
    let label = "In corso";
    let animate = "";

    if (elapsed >= THRESHOLD_CRITICAL) { colorClass = "text-white"; bgClass = "bg-red-600 border border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]"; icon = <Bell size={16} className="animate-wiggle" />; label = "RITARDO CRITICO"; animate = "animate-pulse"; }
    else if (elapsed >= THRESHOLD_WARNING) { colorClass = "text-slate-900"; bgClass = "bg-orange-400 border border-orange-500"; icon = <AlertOctagon size={14} />; label = "RITARDO"; }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-500 ${bgClass} ${animate}`}>
            <span className={`${colorClass} ${elapsed >= THRESHOLD_CRITICAL ? 'animate-wiggle' : ''}`}>{icon}</span>
            <div className="flex flex-col leading-none"><span className={`text-[9px] font-black uppercase ${colorClass} opacity-80`}>{label}</span><span className={`text-sm font-black font-mono ${colorClass}`}>{elapsed} min</span></div>
        </div>
    );
};

interface KitchenDisplayProps {
    onExit: () => void;
    department?: Department;
}

const KitchenDisplay: React.FC<KitchenDisplayProps> = ({ onExit, department = 'Cucina' }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
    const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings());
    const [notification, setNotification] = useState<{ msg: string, type: 'info' | 'success' | 'alert' } | null>(null);
    const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]); // New: Full menu reference for combo lookup

    const [lingerOrders, setLingerOrders] = useState<string[]>([]);

    // Analytics State
    const [selectedDate, setSelectedDate] = useState(new Date());

    const previousOrdersRef = useRef<Order[]>([]);
    const isFirstLoad = useRef(true);
    // STREAK TRACKING
    const streakCountRef = useRef(0);
    const [showStreakOverlay, setShowStreakOverlay] = useState(false);

    // --- VOICE COMMAND SETUP ---
    // Refs to prevent mic restart loop
    const ordersRef = useRef(orders);
    const appSettingsRef = useRef(appSettings);
    const departmentRef = useRef(department);
    const allMenuItemsRef = useRef(allMenuItems);
    // Fix Stale Closures for functions
    const handlersRef = useRef({ updateOrderStatus, toggleOrderItemCompletion });

    useEffect(() => { ordersRef.current = orders; }, [orders]);
    useEffect(() => { appSettingsRef.current = appSettings; }, [appSettings]);
    useEffect(() => { departmentRef.current = department; }, [department]);
    useEffect(() => { allMenuItemsRef.current = allMenuItems; }, [allMenuItems]);
    useEffect(() => { handlersRef.current = { updateOrderStatus, toggleOrderItemCompletion }; }); // Sync on every render
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // NEMO-STYLE: Use both SpeechRecognition types for broader support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'it-IT';

        const wordToNum: Record<string, string> = {
            'uno': '1', 'due': '2', 'tre': '3', 'quattro': '4', 'cinque': '5',
            'sei': '6', 'sette': '7', 'otto': '8', 'nove': '9', 'dieci': '10'
        };

        recognition.onresult = (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            if (!lastResult.isFinal) return;

            let command = lastResult[0].transcript.trim().toLowerCase();
            console.log("🎤 Raw Voice:", command);

            // 1. Normalize numbers
            Object.keys(wordToNum).forEach(k => {
                command = command.replace(new RegExp(`\\b${k}\\b`, 'g'), wordToNum[k]);
            });

            console.log("🎤 Processed:", command);

            // 2. Logic: "3 pronto", "tavolo 3 pronto"
            const matchNumber = command.match(/(\d+)/);
            const hasKeyword = command.includes('pronto') || command.includes('fatto') || command.includes('via') || command.includes('completa');

            if (matchNumber && hasKeyword) {
                const tableNum = matchNumber[1];
                console.log(`🎤 Searching for table: ${tableNum} in`, ordersRef.current.length, "orders");

                const targetOrder = ordersRef.current.find(o =>
                    o.status !== OrderStatus.DELIVERED &&
                    (
                        o.tableNumber === tableNum ||
                        o.tableNumber.toLowerCase() === tableNum ||
                        o.tableNumber.endsWith(` ${tableNum}`) ||
                        o.tableNumber.endsWith(`_${tableNum}`) ||
                        o.tableNumber === `Tavolo ${tableNum}` ||
                        o.tableNumber.endsWith(tableNum)
                    )
                );

                if (targetOrder) {
                    // IMPROVED LOGIC: Complete only ONE dish at a time
                    // Find the first uncompleted item relevant to this department
                    let completedOne = false;

                    for (let idx = 0; idx < targetOrder.items.length && !completedOne; idx++) {
                        const item = targetOrder.items[idx];

                        // Check if item is relevant for this department
                        const currentSettings = appSettingsRef.current;
                        const currentDept = departmentRef.current;
                        const currentMenu = allMenuItemsRef.current;

                        let relevant = false;
                        if (item.menuItem.category !== Category.MENU_COMPLETO) {
                            const dest = item.menuItem.specificDepartment || currentSettings.categoryDestinations[item.menuItem.category];
                            relevant = (dest === currentDept);
                        } else if (item.menuItem.comboItems) {
                            const subItems = currentMenu.filter(m => item.menuItem.comboItems?.includes(m.id));
                            relevant = subItems.some(sub => {
                                const dest = sub.specificDepartment || currentSettings.categoryDestinations[sub.category];
                                return dest === currentDept;
                            });
                        }

                        // If relevant and not completed, complete it and stop
                        if (relevant && !item.completed && item.menuItem.category !== Category.MENU_COMPLETO) {
                            handlersRef.current.toggleOrderItemCompletion(targetOrder.id, idx);
                            showNotification(`✅ VOCALE: ${item.menuItem.name} - Tavolo ${tableNum} PRONTO!`, 'success');
                            playNotificationSound('ready');
                            completedOne = true;
                        }
                    }

                    if (!completedOne) {
                        // All items already completed - mark order as READY
                        handlersRef.current.updateOrderStatus(targetOrder.id, OrderStatus.READY);
                        showNotification(`✅ VOCALE: Tavolo ${tableNum} COMPLETAMENTE PRONTO!`, 'success');
                        playNotificationSound('ready');
                    }
                } else {
                    showNotification(`❌ VOCALE: Tavolo ${tableNum} non trovato`, 'alert');
                }
            }
            else if (command.includes('scorri giù') || command.includes('sotto')) {
                window.scrollBy({ top: 400, behavior: 'smooth' });
            }
            else if (command.includes('scorri su') || command.includes('sopra')) {
                window.scrollBy({ top: -400, behavior: 'smooth' });
            }
            else {
                showNotification(`👂 Sentito: "${command}" (Ripeti?)`, 'info');
            }
        };

        recognition.onerror = (event: any) => {
            console.error("🎤 Speech Error:", event.error);
            if (event.error === 'not-allowed') {
                setIsListening(false);
                showNotification("🚫 Accesso Microfono Negato", 'alert');
            }
            // Other errors (network, aborted, no-speech) will trigger onend and retry
        };

        recognition.onend = () => {
            // NEMO-STYLE: Always try to restart if enabled
            if (isListening) {
                setTimeout(() => {
                    try { recognition.start(); } catch { /* ignore if already started */ }
                }, 300); // NEMO uses 300ms delay
            }
        };

        // Start if listening is enabled
        if (isListening) {
            try { recognition.start(); } catch { }
        }

        recognitionRef.current = recognition;

        return () => {
            // NEMO-STYLE: Prevent restart loop on cleanup
            recognition.onend = null;
            try { recognition.stop(); } catch { }
        };
    }, [isListening]);

    const toggleVoice = () => {
        if (isListening) {
            setIsListening(false);
            recognitionRef.current?.stop();
            showNotification("Comandi Vocali Disattivati", 'info');
        } else {
            setIsListening(true);
            recognitionRef.current?.start();
            showNotification("🎤 In ascolto... (Es: 'Tavolo 4 Pronto')", 'success');
        }
    };

    // --- DEPARTMENT THEME LOGIC ---
    const isPizzeria = department === 'Pizzeria';
    const isPub = department === 'Pub';
    let themeColor = 'orange'; let ThemeIcon = ChefHat;
    if (isPizzeria) { themeColor = 'red'; ThemeIcon = Pizza; } else if (isPub) { themeColor = 'amber'; ThemeIcon = Sandwich; }

    // --- HELPER: CHECK ITEM RELEVANCE (UPDATED FOR COMBO SPLIT) ---
    const getSubItemsForCombo = (item: OrderItem): MenuItem[] => {
        if (item.menuItem.category !== Category.MENU_COMPLETO || !item.menuItem.comboItems) return [];
        // Resolve IDs to full items using allMenuItems reference
        return allMenuItems.filter(m => item.menuItem.comboItems?.includes(m.id));
    };

    const isItemRelevantForDept = (item: OrderItem): boolean => {
        // 0. Separators are always relevant (visible logic handles filtering empty receipts)
        if (item.isSeparator) return true;

        if (!appSettings || !item.menuItem) return false;

        const destinations = appSettings.categoryDestinations || {};

        // 1. If Normal Item -> Check destination directly
        if (item.menuItem.category !== Category.MENU_COMPLETO) {
            const dest = item.menuItem.specificDepartment || destinations[item.menuItem.category] || 'Cucina';
            return dest === department;
        }

        // 2. If Combo Item -> Check if ANY sub-item belongs to this department
        const subItems = getSubItemsForCombo(item);
        return subItems.some(sub => {
            const dest = sub.specificDepartment || destinations[sub.category] || 'Cucina';
            // Special Case for Sala Visibility: Drinks in combos usually go to Sala. 
            // If department is 'Sala' and item is Drink, return true.
            return dest === department;
        });
    };



    const showNotification = (msg: string, type: 'info' | 'success' | 'alert') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 5000); };
    const handleCriticalDelay = (tableNum: string) => {
        playNotificationSound('alert');
        showNotification(`⚠️ RITARDO CRITICO: Tavolo ${tableNum}!`, 'alert');
    };

    // DRAG AND DROP STATE
    const [draggedOrder, setDraggedOrder] = useState<string | null>(null);

    const loadOrders = () => {
        const allOrders = getOrders();
        // 1. Base Sort: Timestamp
        let sorted = allOrders.sort((a, b) => a.timestamp - b.timestamp);

        // 2. Custom Sort Override (Persistent)
        try {
            const savedSort = localStorage.getItem(`ristosync_kitchen_sort_${department}`);
            if (savedSort) {
                const sortIds: string[] = JSON.parse(savedSort);
                const idMap = new Map(sorted.map(o => [o.id, o]));

                const customSorted: Order[] = [];
                const remaining: Order[] = [];

                // Valid sorted items
                sortIds.forEach(id => {
                    if (idMap.has(id)) {
                        customSorted.push(idMap.get(id)!);
                        idMap.delete(id);
                    }
                });

                // Remaining (new) items - maintain timestamp order
                sorted.forEach(o => {
                    if (idMap.has(o.id)) {
                        remaining.push(o);
                    }
                });

                sorted = [...customSorted, ...remaining];
            }
        } catch (e) { console.error("Sort Error", e); }

        // Sync menu items for resolution
        const currentMenuItems = getMenuItems();
        setAllMenuItems(currentMenuItems);

        if (!isFirstLoad.current) {
            const prevOrders = previousOrdersRef.current;
            const prevOrderIds = prevOrders.map(o => o.id);
            const addedOrders = sorted.filter(o => !prevOrderIds.includes(o.id));

            // Use updated relevance logic for notifications
            const relevantNewOrders = addedOrders.filter(order => order.items.some(item => isItemRelevantForDept(item)));

            if (relevantNewOrders.length > 0) {
                const newOrder = relevantNewOrders[0];
                playNotificationSound('new');
                showNotification(`Nuovo Ordine ${department}: Tavolo ${newOrder.tableNumber}`, 'info');

                // --- AUTO PRINT LOGIC ---
                if (appSettings.printEnabled && appSettings.printEnabled[department]) {
                    const itemsForDept = newOrder.items.filter(i => isItemRelevantForDept(i));
                    if (itemsForDept.length > 0) {
                        const printContent = generateReceiptHtml(
                            itemsForDept,
                            department,
                            newOrder.tableNumber,
                            newOrder.waiterName || 'Staff',
                            appSettings.restaurantProfile?.name || 'Ristorante',
                            currentMenuItems // Pass full menu
                        );
                        setTimeout(() => {
                            showNotification(`🖨️ Stampa Comanda ${department}...`, 'info');
                            const printWindow = window.open('', `AUTO_PRINT_${department}_${Date.now()}`, 'height=600,width=400');
                            if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.focus(); }
                        }, 800);
                    }
                }
            }
            sorted.forEach(newOrder => {
                const oldOrder = prevOrders.find(o => o.id === newOrder.id);

                // DETECT SINGLE ITEM COMPLETION (TOAST)
                if (oldOrder) {
                    newOrder.items.forEach((newItem, idx) => {
                        const oldItem = oldOrder.items[idx];
                        if (oldItem && !oldItem.completed && newItem.completed) {
                            if (isItemRelevantForDept(newItem)) {
                                showNotification(`✅ ${newItem.menuItem.name} PRONTO DA RITIRARE!`, 'success');
                            }
                        }
                    });
                }

                if (oldOrder && oldOrder.status !== OrderStatus.READY && newOrder.status === OrderStatus.READY) {
                    playNotificationSound('ready');

                    // STREAK LOGIC
                    streakCountRef.current += 1;
                    if (streakCountRef.current > 0 && streakCountRef.current % 3 === 0) {
                        playNotificationSound('ready'); // Fixed sound
                        setShowStreakOverlay(true);
                        setTimeout(() => setShowStreakOverlay(false), 4000);
                    } else {
                        showNotification(`Tavolo ${newOrder.tableNumber} è PRONTO!`, 'success');
                    }
                }

                // NEW: Detect completion logic (DELIVERED)
                if (oldOrder && oldOrder.status !== OrderStatus.DELIVERED && newOrder.status === OrderStatus.DELIVERED) {
                    setLingerOrders(prev => [...prev, newOrder.id]);
                    setTimeout(() => {
                        setLingerOrders(prev => prev.filter(id => id !== newOrder.id));
                    }, 300000); // 5 minuti = 300000ms
                }

                // NEW: Detect when ALL department items become completed (even if order not DELIVERED)
                if (oldOrder && newOrder.status !== OrderStatus.DELIVERED) {
                    const relevantItems = newOrder.items.filter(item => isItemRelevantForDept(item));

                    if (relevantItems.length > 0) {
                        const allCompleted = relevantItems.every(item => {
                            if (item.menuItem.category === Category.MENU_COMPLETO && item.menuItem.comboItems) {
                                const relevantSubItems = getSubItemsForCombo(item).filter(sub => {
                                    const dest = sub.specificDepartment || appSettings.categoryDestinations[sub.category];
                                    return dest === department;
                                });
                                if (relevantSubItems.length === 0) return true;
                                return relevantSubItems.every(sub => item.comboCompletedParts?.includes(sub.id));
                            }
                            return item.completed;
                        });

                        // Check if it JUST became all completed (wasn't before)
                        const oldRelevantItems = oldOrder.items.filter(item => isItemRelevantForDept(item));
                        const wasAllCompleted = oldRelevantItems.every(item => {
                            if (item.menuItem.category === Category.MENU_COMPLETO && item.menuItem.comboItems) {
                                const relevantSubItems = getSubItemsForCombo(item).filter(sub => {
                                    const dest = sub.specificDepartment || appSettings.categoryDestinations[sub.category];
                                    return dest === department;
                                });
                                if (relevantSubItems.length === 0) return true;
                                return relevantSubItems.every(sub => item.comboCompletedParts?.includes(sub.id));
                            }
                            return item.completed;
                        });

                        // If just completed, add to linger
                        if (allCompleted && !wasAllCompleted && !lingerOrders.includes(newOrder.id)) {
                            setLingerOrders(prev => [...prev, newOrder.id]);
                            setTimeout(() => {
                                setLingerOrders(prev => prev.filter(id => id !== newOrder.id));
                            }, 300000); // 5 minuti = 300000ms
                        }
                    }
                }
            });
        }
        if (isFirstLoad.current) isFirstLoad.current = false;
        previousOrdersRef.current = sorted;
        setOrders(sorted);
    };

    const handleDragStart = (e: React.DragEvent, orderId: string) => {
        setDraggedOrder(orderId);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Custom drag image
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnd = () => {
        setDraggedOrder(null);
    };

    const handleDrop = (e: React.DragEvent, targetOrderId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedOrder || draggedOrder === targetOrderId) {
            setDraggedOrder(null);
            return;
        }

        // Work with current orders state
        const currentOrders = [...orders];
        const oldIndex = currentOrders.findIndex(o => o.id === draggedOrder);
        const newIndex = currentOrders.findIndex(o => o.id === targetOrderId);

        if (oldIndex === -1 || newIndex === -1) {
            setDraggedOrder(null);
            return;
        }

        // Reorder the array
        const [movedOrder] = currentOrders.splice(oldIndex, 1);
        currentOrders.splice(newIndex, 0, movedOrder);

        // Update state immediately for visual feedback
        setOrders(currentOrders);

        // Save the new order to localStorage
        const newIds = currentOrders.map(o => o.id);
        localStorage.setItem(`ristosync_kitchen_sort_${department}`, JSON.stringify(newIds));

        setDraggedOrder(null);
    };

    useEffect(() => {
        loadOrders();
        const handleStorageChange = (e: StorageEvent) => { if (e.key === 'ristosync_orders') loadOrders(); };
        const handleLocalUpdate = () => loadOrders();
        const handleSettingsUpdate = () => { setAppSettings(getAppSettings()); loadOrders(); };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-storage-update', handleLocalUpdate);
        window.addEventListener('local-settings-update', handleSettingsUpdate);
        window.addEventListener('local-menu-update', handleLocalUpdate);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage-update', handleLocalUpdate);
            window.removeEventListener('local-settings-update', handleSettingsUpdate);
            window.removeEventListener('local-menu-update', handleLocalUpdate);
        };
    }, [appSettings, department]);

    // ADVANCE STATUS (Manual Override with Smart Logic)
    const advanceStatus = (orderId: string, currentStatus: OrderStatus) => {
        if (currentStatus === OrderStatus.PENDING) {
            updateOrderStatus(orderId, OrderStatus.COOKING);
        }
        else if (currentStatus === OrderStatus.COOKING) {
            // FORCE COMPLETE ALL ITEMS logic
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const updatedItems = order.items.map(i => ({ ...i, completed: true }));
                const updatedOrder = { ...order, items: updatedItems, status: OrderStatus.READY, timestamp: Date.now() };
                updateOrder(updatedOrder); // Uses imported updateOrder
            }
        }
        else if (currentStatus === OrderStatus.READY) {
            updateOrderStatus(orderId, OrderStatus.DELIVERED);
        }
    };

    // UPDATED: Handle Item Toggle (Partial or Full)
    const handleToggleItem = (orderId: string, originalIndex: number, subItemId?: string) => {
        toggleOrderItemCompletion(orderId, originalIndex, subItemId);
    };

    const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (date: Date) => date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING: return 'bg-yellow-100 border-yellow-400 text-yellow-800';
            case OrderStatus.COOKING: return `bg-${themeColor}-100 border-${themeColor}-400 text-${themeColor}-800`;
            case OrderStatus.READY: return 'bg-green-200 border-green-500 text-green-900 shadow-green-500/20'; // VISIBLE GREEN
            case OrderStatus.DELIVERED: return 'bg-slate-700 border-slate-500 text-slate-300 opacity-80';
            default: return 'bg-gray-100 border-gray-400';
        }
    };

    const filteredHistoryOrders = useMemo(() => {
        return orders.filter(o => {
            if (o.status !== OrderStatus.DELIVERED) return false;
            const orderDate = new Date(o.createdAt || o.timestamp);
            return orderDate.getDate() === selectedDate.getDate() && orderDate.getMonth() === selectedDate.getMonth() && orderDate.getFullYear() === selectedDate.getFullYear();
        }).sort((a, b) => (b.createdAt || b.timestamp) - (a.createdAt || a.timestamp));
    }, [orders, selectedDate]);

    const stats = useMemo(() => {
        let totalRevenue = 0; let totalItems = 0;
        filteredHistoryOrders.forEach(order => {
            const relevantItems = order.items.filter(i => isItemRelevantForDept(i));
            const orderTotal = relevantItems.reduce((acc, i) => acc + (i.menuItem.price * i.quantity), 0);
            totalRevenue += orderTotal; relevantItems.forEach(i => totalItems += i.quantity);
        });
        return { totalRevenue, totalItems };
    }, [filteredHistoryOrders, department, appSettings, allMenuItems]);

    const changeDate = (days: number) => { const newDate = new Date(selectedDate); newDate.setDate(newDate.getDate() + days); setSelectedDate(newDate); };

    // LOGICA DI VISUALIZZAZIONE "ATTIVA"
    // Le comande READY restano visibili (verdi) finché non diventano DELIVERED (dal cameriere o dal tasto "Servi")
    // Le comande DELIVERED restano visibili per 5 minuti se sono in "lingerOrders"
    // NUOVO: Nascondi ordini dove TUTTI gli item del reparto sono completati
    // IMPORTANTE: Mantiene l'ordine custom da drag-and-drop
    const displayedOrders = orders.filter(o => {
        // Always show lingering orders (being archived)
        if (lingerOrders.includes(o.id)) return true;

        // Only show active orders in active view
        if (viewMode !== 'active' || o.status === OrderStatus.DELIVERED) return false;

        // Check if ALL items relevant to this department are completed
        const relevantItems = o.items.filter(item => isItemRelevantForDept(item));

        // If no relevant items, don't show this order
        if (relevantItems.length === 0) return false;

        // Check if all relevant items are completed
        const allCompleted = relevantItems.every(item => {
            if (item.menuItem.category === Category.MENU_COMPLETO && item.menuItem.comboItems) {
                const relevantSubItems = getSubItemsForCombo(item).filter(sub => {
                    const dest = sub.specificDepartment || appSettings.categoryDestinations[sub.category];
                    return dest === department;
                });
                if (relevantSubItems.length === 0) return true;
                return relevantSubItems.every(sub => item.comboCompletedParts?.includes(sub.id));
            }
            return item.completed;
        });

        // Hide if all items are completed (department work is done)
        return !allCompleted;
    });
    // NO SORTING HERE - preserve the order from 'orders' array which has custom sort applied

    const isAutoPrintActive = appSettings.printEnabled && appSettings.printEnabled[department];

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 font-sans flex flex-col relative">
            <style>{`@keyframes wiggle { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } } .animate-wiggle { animation: wiggle 0.3s ease-in-out infinite; } .receipt-edge { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 95% 95%, 90% 100%, 85% 95%, 80% 100%, 75% 95%, 70% 100%, 65% 95%, 60% 100%, 55% 95%, 50% 100%, 45% 95%, 40% 100%, 35% 95%, 30% 100%, 25% 95%, 20% 100%, 15% 95%, 10% 100%, 5% 95%, 0% 100%); }`}</style>

            {notification && (
                <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-down border-2 ${notification.type === 'success' ? 'bg-green-600 border-green-400' : notification.type === 'alert' ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-blue-600 border-blue-400'}`}>
                    {notification.type === 'success' ? <CheckCircle size={32} className="animate-bounce" /> : notification.type === 'alert' ? <Bell size={32} className="animate-wiggle" /> : <Bell size={32} className="animate-swing" />}
                    <div><h3 className="font-black text-2xl uppercase">{notification.type === 'success' ? 'ORDINE PRONTO' : notification.type === 'alert' ? 'ATTENZIONE RITARDO' : 'NUOVO ORDINE'}</h3><p className="font-medium text-lg">{notification.msg}</p></div>
                </div>
            )}

            {/* STREAK OVERLAY (OGNI 3 TAVOLI) */}
            {showStreakOverlay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-gradient-to-br from-orange-600 to-red-600 p-1 rounded-3xl shadow-[0_0_50px_rgba(234,88,12,0.6)] animate-scale-in">
                        <div className="bg-slate-900 rounded-[22px] px-12 py-10 flex flex-col items-center justify-center gap-6 border border-white/10 relative overflow-hidden">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-orange-500 rounded-full blur-[80px] opacity-40"></div>
                            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-red-500 rounded-full blur-[80px] opacity-40"></div>

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="text-6xl mb-4 animate-bounce">🔥</div>
                                <h2 className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 tracking-tighter uppercase drop-shadow-sm">
                                    Cucina in Fiamme!
                                </h2>
                                <h3 className="text-3xl font-bold text-white mt-2">
                                    3 Tavoli Completati di fila!
                                </h3>
                                <p className="text-slate-400 mt-4 text-lg font-mono uppercase tracking-widest border border-slate-700 px-4 py-1 rounded-full">
                                    Ottimo Lavoro Chef
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isPizzeria ? 'bg-red-600' : isPub ? 'bg-amber-500' : 'bg-orange-500'}`}><ThemeIcon className="w-8 h-8 text-white" /></div>
                    <div><h1 className="text-3xl font-bold">Risto<span className={`${isPizzeria ? 'text-red-500' : isPub ? 'text-amber-500' : 'text-orange-500'}`}>Sync</span><span className="text-blue-500 font-black ml-1">AI</span></h1><p className="text-slate-400 text-xs uppercase font-semibold">{isPizzeria ? 'Pizzeria' : isPub ? 'Pub' : 'Kitchen'} Dashboard</p></div>
                    <div className="ml-4 flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => setViewMode('active')} className={`px-6 py-2 rounded-md font-bold text-sm uppercase transition-all ${viewMode === 'active' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Attivi</button>
                        <button onClick={() => setViewMode('history')} className={`px-6 py-2 rounded-md font-bold text-sm uppercase transition-all ${viewMode === 'history' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Archivio</button>
                    </div>


                </div>
                <div className="flex gap-4 items-center">
                    {isAutoPrintActive && (<div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-xs font-bold uppercase animate-pulse"><Receipt size={14} /> Auto-Print ON</div>)}

                    <button
                        onClick={toggleVoice}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-bold text-xs uppercase transition-all ${isListening ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                        {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                        {isListening ? 'Ascolto...' : 'Vocale Off'}
                    </button>

                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"><span className={`text-2xl font-mono font-bold ${isPizzeria ? 'text-red-400' : isPub ? 'text-amber-400' : 'text-orange-400'}`}>{new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span></div>
                    <button onClick={onExit} className="bg-slate-800 text-slate-400 hover:text-white p-2.5 rounded-lg"><LogOut size={20} /></button>
                </div>
            </div>

            {viewMode === 'active' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-10">
                    {displayedOrders.map((order) => {
                        // PREPARE DATA
                        const cleanTable = order.tableNumber.replace('_HISTORY', '').replace('DEL_', 'DEL ').replace('ASP_', 'ASP ');

                        // FILTER ITEMS (SAFE)
                        let visibleItems: { item: OrderItem, originalIndex: number }[] = [];
                        try {
                            visibleItems = order.items
                                .map((item, originalIndex) => ({ item, originalIndex }))
                                .filter(({ item }) => {
                                    if (!item || !item.menuItem) return false;
                                    // SEPARATORS ALWAYS VISIBLE
                                    if (item.isSeparator) return true;

                                    // RELEVANCE CHECK
                                    if (item.menuItem.category === Category.MENU_COMPLETO) {
                                        const sub = getSubItemsForCombo(item);
                                        return sub.some(s => {
                                            const d = s.specificDepartment || (appSettings.categoryDestinations ? appSettings.categoryDestinations[s.category] : 'Cucina');
                                            return d === department;
                                        });
                                    }

                                    const dest = item.menuItem.specificDepartment || (appSettings.categoryDestinations ? appSettings.categoryDestinations[item.menuItem.category] : 'Cucina');
                                    return dest === department;
                                });
                        } catch (e) { console.error(e); }

                        // GHOST TICKET FIX:
                        // 1. If no visible items at all -> FORCE NULL (Do not render)
                        if (visibleItems.length === 0) return null;

                        // 2. If ONLY separators -> FORCE NULL (Do not render "A SEGUIRE" on empty ticket)
                        const hasRealItems = visibleItems.some(i => !i.item.isSeparator);
                        if (!hasRealItems) return null;

                        // STATUS COLORS
                        const isLingering = lingerOrders.includes(order.id);
                        let bgColor = 'bg-slate-200'; // Default Receipt Color (from photo)
                        if (isLingering) bgColor = 'bg-green-100';
                        else if (order.status === OrderStatus.READY) bgColor = 'bg-green-200';

                        // SYNC DEPARTMENTS CALCULATION
                        const otherDepts = new Set<string>();
                        order.items.forEach(i => {
                            if (i.isSeparator) return;
                            if (i.menuItem.category === Category.MENU_COMPLETO && i.menuItem.comboItems) {
                                getSubItemsForCombo(i).forEach(s => {
                                    const d = s.specificDepartment || (appSettings.categoryDestinations ? appSettings.categoryDestinations[s.category] : 'Cucina');
                                    if (d && d !== department) otherDepts.add(d);
                                });
                            } else {
                                const d = i.menuItem.specificDepartment || (appSettings.categoryDestinations ? appSettings.categoryDestinations[i.menuItem.category] : 'Cucina');
                                if (d && d !== department) otherDepts.add(d);
                            }
                        });
                        const syncLabels = Array.from(otherDepts);

                        const isDragging = draggedOrder === order.id;

                        // RENDER CARD
                        return (
                            <div
                                key={order.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, order.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, order.id)}
                                onDragEnd={handleDragEnd}
                                className={`${bgColor} text-slate-900 shadow-xl font-mono text-sm leading-tight receipt-edge pb-6 relative transition-transform hover:-translate-y-1 flex flex-col ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''} cursor-grab active:cursor-grabbing`}
                            >

                                {/* HEADER - SPLIT LAYOUT (LEFT: TABLE | RIGHT: INFO) */}
                                <div className="px-3 py-3 border-b border-dashed border-slate-300 bg-white/50 flex items-center justify-between gap-2">

                                    {/* LEFT: TABLE NUMBER */}
                                    <div className="flex-shrink-0">
                                        <p className="text-6xl font-black text-slate-900 leading-none tracking-tighter">
                                            {/^\d+$/.test(cleanTable) ? (
                                                <>
                                                    <span className="text-xs font-bold text-slate-500 block -mb-1 ml-1 tracking-widest">TAVOLO</span>
                                                    {cleanTable}
                                                </>
                                            ) : cleanTable}
                                        </p>
                                    </div>

                                    {/* RIGHT: INFO COLUMN */}
                                    <div className="flex flex-col items-end gap-1 flex-1 min-w-0">

                                        {/* Row 1: Time & Dept */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-black uppercase text-slate-600 tracking-wider bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200">{department}</span>
                                            <span className="text-3xl font-bold text-slate-800 font-mono leading-none">{formatTime(order.timestamp)}</span>
                                        </div>

                                        {/* Row 2: Staff, Sync & Guests Pill */}
                                        <div className="flex items-center gap-3 bg-slate-100 rounded-md px-2 py-1 border border-slate-200 shadow-sm mt-0.5">

                                            {/* Staff Name & Sync Badges */}
                                            <div className="flex items-center gap-2">
                                                {syncLabels.length > 0 && (
                                                    <div className="flex gap-0.5">
                                                        {syncLabels.map(d => (
                                                            <span key={d} title={`Sync: ${d}`} className="text-[8px] font-black bg-orange-100 text-orange-700 border border-orange-200 px-1 rounded-[3px] uppercase tracking-tight">
                                                                {d.substring(0, 3)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <span className="text-xs font-bold uppercase text-slate-700 truncate max-w-[80px]">{order.waiterName || 'Staff'}</span>
                                            </div>

                                            {(order.numberOfGuests !== undefined || order.items.length > 0) && (
                                                <>
                                                    <div className="w-px h-3.5 bg-slate-300"></div>
                                                    <div className="flex items-center gap-1.5">
                                                        <User size={14} className="text-slate-600" />
                                                        <span className="text-sm font-black text-slate-900">{order.numberOfGuests || '?'}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ITEMS LIST */}
                                <div className="p-4 space-y-2 flex-1">
                                    {visibleItems.map(({ item, originalIndex }) => {
                                        // SEPARATOR HANDLING
                                        if (item.isSeparator) {
                                            return (
                                                <div key={`sep-${originalIndex}`} className="flex items-center gap-2 py-2 opacity-60 w-full overflow-hidden">
                                                    <span className="text-[10px] mx-auto font-black uppercase whitespace-nowrap text-slate-500 tracking-widest border-b border-dashed border-slate-400 pb-1 w-full text-center">--- A SEGUIRE ---</span>
                                                </div>
                                            );
                                        }

                                        // NORMAL ITEM
                                        const isCompleted = item.completed;
                                        return (
                                            <div
                                                key={`${order.id}-${originalIndex}`}
                                                onClick={() => order.status !== OrderStatus.DELIVERED && handleToggleItem(order.id, originalIndex)}
                                                className={`cursor-pointer transition-all ${isCompleted ? 'opacity-40 line-through decoration-2 decoration-slate-500' : 'hover:bg-black/5'}`}
                                            >
                                                <div className="flex gap-2 items-start text-sm leading-snug">
                                                    <span className="font-bold">{item.quantity}x</span>
                                                    <div className="flex flex-col flex-1">
                                                        <span className="uppercase">{item.menuItem.name}</span>
                                                        {item.notes && item.notes.split('|||').map((note, n) => (
                                                            <span key={n} className="text-[10px] bg-white border border-slate-400 px-1 font-bold w-max mt-0.5 rounded-sm">{note}</span>
                                                        ))}
                                                        {item.isAddedLater && <span className="text-[9px] bg-slate-800 text-white px-1 font-bold w-max mt-0.5 rounded-sm">AGGIUNTA</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* BOTTOM ACTIONS */}
                                <div className="px-4 pb-4 mt-auto">
                                    {/* BOTTOM ACTIONS - DYNAMIC STATUS BUTTON */}
                                    {/* BOTTOM ACTIONS - DYNAMIC STATUS BUTTON */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); advanceStatus(order.id, order.status); }}
                                        className={`w-full py-3 mb-2 font-black uppercase tracking-widest text-sm border-b-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 active:border-b-0 active:translate-y-1 ${order.status === OrderStatus.READY
                                            ? 'bg-green-500 border-green-700 text-white hover:bg-green-600' // Step 3: Serve/Archive
                                            : order.status === OrderStatus.COOKING
                                                ? 'bg-orange-500 border-orange-700 text-white hover:bg-orange-600 animate-pulse' // Step 2: Cooking (Maintained)
                                                : 'bg-amber-400 border-amber-600 text-white hover:bg-amber-500' // Step 1: Start
                                            }`}
                                    >
                                        {order.status === OrderStatus.READY ? (
                                            <><CheckCircle size={18} /> PRONTO DA SERVIRE</>
                                        ) : order.status === OrderStatus.COOKING ? (
                                            <><Flame size={18} /> IN PREPARAZIONE</>
                                        ) : (
                                            <><Bell size={18} /> INIZIA PREPARAZIONE</>
                                        )}
                                    </button>

                                    {order.status === OrderStatus.COOKING && order.items.some(i => i.isSeparator) && (
                                        <div className="text-center text-[10px] font-bold text-blue-400 mb-1">
                                            CLICCA L'ORDINE PER GESTIRE LE PORTATE
                                        </div>
                                    )}

                                    <div className="text-center text-[10px] text-slate-400 font-medium">*** COPIA NON FISCALE ***</div>
                                </div>
                            </div>
                        );
                    })}
                    {displayedOrders.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                            <UtensilsCrossed size={64} className="opacity-20 mb-4" />
                            <p className="font-bold text-lg">Nessun ordine in cucina</p>
                            <p className="text-sm">Le comande appariranno qui quando inviate dai camerieri.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col h-full overflow-hidden animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700"><button onClick={() => changeDate(-1)} className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><ChevronLeft /></button><div className="px-6 font-bold text-white flex items-center gap-2 uppercase tracking-wide"><Calendar size={18} className={`${isPizzeria ? 'text-red-500' : isPub ? 'text-amber-500' : 'text-orange-500'}`} /> {formatDate(selectedDate)}</div><button onClick={() => changeDate(1)} className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><ChevronRight /></button></div>
                        <div className="flex gap-4">
                            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center gap-3"><div className="p-3 bg-blue-900/20 rounded-xl text-blue-500"><UtensilsCrossed /></div><div><p className="text-slate-400 text-xs font-bold uppercase">Piatti {department}</p><p className="text-2xl font-black text-white">{stats.totalItems}</p></div></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10">
                        {filteredHistoryOrders.map(order => {
                            const items = order.items.filter(i => isItemRelevantForDept(i));
                            if (items.length === 0) return null;
                            const total = items.reduce((acc, i) => acc + (i.menuItem.price * i.quantity), 0);
                            const cleanTable = order.tableNumber.replace('_HISTORY', '');
                            return (
                                <div key={order.id} className="bg-slate-200 text-slate-900 p-0 relative shadow-xl font-mono text-sm leading-tight receipt-edge pb-6">
                                    <div className="p-4 pb-2 text-center border-b border-dashed border-slate-400 mx-2"><h3 className="font-bold text-lg uppercase mb-1">{appSettings.restaurantProfile?.name || 'RistoSync'}</h3><p className="text-xs font-bold uppercase">{department}</p><p className="text-xs">Tavolo: {cleanTable}</p><p className="text-xs">{formatDate(new Date(order.createdAt || order.timestamp))} - {formatTime(order.timestamp)}</p><p className="text-[10px] mt-1 uppercase">Staff: {order.waiterName || '?'}</p></div>
                                    <div className="p-4 space-y-2">{items.map((item, idx) => (<div key={idx} className="flex justify-between items-start"><div className="flex gap-2"><span className="font-bold">{item.quantity}x</span><span className="uppercase">{item.menuItem.name}</span></div></div>))}</div>
                                    <div className="text-center text-[10px] text-slate-500 mt-4">*** COPIA NON FISCALE ***</div>
                                </div>
                            );
                        })}
                        {filteredHistoryOrders.every(o => o.items.filter(i => isItemRelevantForDept(i)).length === 0) && (<div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600"><Receipt size={64} className="opacity-20 mb-4" /><p className="font-bold text-lg">Nessuno scontrino presente</p><p className="text-sm">Non ci sono comande chiuse per {department} in questa data.</p></div>)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default KitchenDisplay;