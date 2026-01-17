import { Order, OrderStatus, OrderItem, MenuItem, AppSettings, Category, Department, NotificationSettings, Reservation, Customer, ReservationStatus, InventoryItem, Expense } from '../types';
import { supabase } from './supabase';
import { printOrderToAllDepartments } from './printerService';

// Generate UUID v4 compatible with PostgreSQL
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const STORAGE_KEY = 'ristosync_orders';
const TABLES_COUNT_KEY = 'ristosync_table_count';
const WAITER_KEY = 'ristosync_waiter_name';
const MENU_KEY = 'ristosync_menu_items';
const SETTINGS_NOTIFICATIONS_KEY = 'ristosync_settings_notifications';
const APP_SETTINGS_KEY = 'ristosync_app_settings';
const GOOGLE_API_KEY_STORAGE = 'ristosync_google_api_key';
const METADATA_CACHE_KEY = 'ristosync_orders_metadata'; // Local cache for delivery info
const INVENTORY_KEY = 'ristosync_inventory';

// --- DEMO DATASET ---
const DEMO_MENU_ITEMS: MenuItem[] = [
    { id: 'demo_a1', name: 'Tagliere del Contadino', price: 18, category: Category.ANTIPASTI, description: 'Selezione di salumi nostrani, formaggi stagionati, miele di castagno e noci.', allergens: ['Latticini', 'Frutta a guscio'], ingredients: 'Prosciutto crudo, Salame felino, Pecorino, Miele, Noci' },
    { id: 'demo_a2', name: 'Bruschette Miste', price: 8, category: Category.ANTIPASTI, description: 'Tris di bruschette: pomodoro fresco, patè di olive, crema di carciofi.', allergens: ['Glutine'], ingredients: 'Pane casereccio, Pomodoro, Aglio, Olio EVO, Olive' },
    { id: 'demo_p1', name: 'Spaghetti alla Carbonara', price: 12, category: Category.PRIMI, description: 'La vera ricetta romana con guanciale croccante, uova bio e pecorino.', allergens: ['Glutine', 'Uova', 'Latticini'], ingredients: 'Spaghetti, Guanciale, Tuorlo d\'uovo, Pecorino Romano, Pepe nero' },
    { id: 'demo_p2', name: 'Tonnarelli Cacio e Pepe', price: 11, category: Category.PRIMI, description: 'Cremosità unica con pecorino romano DOP e pepe nero tostato.', allergens: ['Glutine', 'Latticini'], ingredients: 'Tonnarelli freschi, Pecorino Romano, Pepe nero' },
    { id: 'demo_s1', name: 'Tagliata di Manzo', price: 22, category: Category.SECONDI, description: 'Controfiletto servito con rucola selvatica e scaglie di grana.', allergens: ['Latticini'], ingredients: 'Manzo, Rucola, Grana Padano, Aceto Balsamico' },
    { id: 'demo_pz1', name: 'Margherita DOP', price: 8, category: Category.PIZZE, description: 'Pomodoro San Marzano, Mozzarella di Bufala, Basilico fresco.', allergens: ['Glutine', 'Latticini'], ingredients: 'Impasto, Pomodoro, Mozzarella di Bufala, Basilico, Olio EVO' },
    { id: 'demo_b1', name: 'Acqua Naturale 0.75cl', price: 2.5, category: Category.BEVANDE, description: 'Bottiglia in vetro.' },
    { id: 'demo_b2', name: 'Coca Cola 33cl', price: 3.5, category: Category.BEVANDE, description: 'In vetro.' },
    { id: 'demo_b3', name: 'Caffè Espresso', price: 1.5, category: Category.BEVANDE, description: 'Miscela 100% Arabica.' }
];

// --- SYNC ENGINE STATE ---
let currentUserId: string | null = null;
let pollingInterval: any = null;

// HELPER: SAFE STORAGE SAVE
// Handles "QuotaExceededError" silently by cleaning up old data. 
// We do NOT alert the user because data is safe in Cloud.
const safeLocalStorageSave = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        // Intercept QuotaExceededError
        if (e.name === 'QuotaExceededError' || e.message?.toLowerCase().includes('quota')) {
            console.warn("⚠️ STORAGE FULL: Operating in Cloud-Only mode.");

            // Strategy: Try to clean up Local Cache (Remove Delivered Orders)
            if (key === STORAGE_KEY) {
                try {
                    const orders = JSON.parse(value) as Order[];
                    // Aggressive Clean: Keep only active orders
                    const streamlined = orders.filter(o => o.status !== OrderStatus.DELIVERED);

                    if (streamlined.length < orders.length) {
                        try {
                            localStorage.setItem(key, JSON.stringify(streamlined));
                            console.log(`✅ Cache cleaned: Removed ${orders.length - streamlined.length} delivered orders.`);
                            return;
                        } catch (retryError) {
                            // Even streamlined is too big, ignore local save
                        }
                    }
                } catch (cleanError) {
                    console.error("Cleanup failed:", cleanError);
                }
            }
            // Notify User via Event
            window.dispatchEvent(new Event('storage-quota-exceeded'));
        }
    }
};

export const getConnectionStatus = (): boolean => {
    return navigator.onLine;
};

// Create Anonymous User for RLS compatibility
const createAnonymousUser = async () => {
    if (!supabase) return;

    const anonymousEmail = `anon_${generateUUID()}@ristosync.local`;
    const anonymousPassword = generateUUID() + generateUUID();

    const { data, error } = await supabase.auth.signUp({
        email: anonymousEmail,
        password: anonymousPassword,
    });

    if (data?.user) {
        currentUserId = data.user.id;
        localStorage.setItem('ristosync_anonymous_user', JSON.stringify({
            email: anonymousEmail,
            password: anonymousPassword
        }));
        console.log('✅ Utente anonimo creato');
    } else {
        console.error('❌ Errore creazione utente anonimo:', error);
    }
};

// Initialize Realtime Subscription
export const initSupabaseSync = async () => {
    if (!supabase) return;

    // Get Current User
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
        currentUserId = session.user.id;
    } else {
        // Nessuna sessione - crea o recupera utente anonimo
        const storedAnonymousUser = localStorage.getItem('ristosync_anonymous_user');

        if (storedAnonymousUser) {
            try {
                const { email, password } = JSON.parse(storedAnonymousUser);
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });

                if (data?.user) {
                    currentUserId = data.user.id;
                    console.log('✅ Utente anonimo riconnesso');
                } else {
                    console.error('Errore login anonimo:', error);
                    await createAnonymousUser();
                }
            } catch (e) {
                await createAnonymousUser();
            }
        } else {
            await createAnonymousUser();
        }
    }

    if (!currentUserId) {
        console.error('❌ Impossibile inizializzare utente');
        return;
    }

    // Initial Sync
    await fetchFromCloud();
    await fetchFromCloudMenu();
    await fetchSettingsFromCloud();
    await fetchPromotionsFromCloud();
    await fetchAutomationsFromCloud();
    await fetchSocialFromCloud();
    await syncReservationsDown();
    await syncCustomersDown();

    // 2. Sync Profile Settings (API KEY)
    const { data: profile } = await supabase.from('profiles').select('google_api_key').eq('id', currentUserId).single();
    if (profile?.google_api_key) {
        safeLocalStorageSave(GOOGLE_API_KEY_STORAGE, profile.google_api_key);
    }

    // 3. Realtime Subscription (Robust Mode)
    const channel = supabase.channel(`room:${currentUserId}`);

    channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${currentUserId}` }, () => { fetchFromCloud(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `user_id=eq.${currentUserId}` }, () => { fetchFromCloudMenu(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUserId}` }, (payload) => {
            if (payload.new.settings) {
                safeLocalStorageSave(APP_SETTINGS_KEY, JSON.stringify(payload.new.settings));
                window.dispatchEvent(new Event('local-settings-update'));
            }
        })
        // MARKETING LISTENERS
        .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_promotions', filter: `user_id=eq.${currentUserId}` }, () => { fetchPromotionsFromCloud(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_automations', filter: `user_id=eq.${currentUserId}` }, () => { fetchAutomationsFromCloud(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts', filter: `user_id=eq.${currentUserId}` }, () => { fetchSocialFromCloud(); })
        // RESERVATIONS & CUSTOMERS REALTIME
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `user_id=eq.${currentUserId}` }, () => { syncReservationsDown(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `user_id=eq.${currentUserId}` }, () => { syncCustomersDown(); })
        .subscribe();

    // 4. Fallback Polling (Heartbeat) - Settings polled every 5s for collaboration notifications
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        fetchFromCloud();
        fetchSettingsFromCloud(); // More frequent for collaboration
        fetchPromotionsFromCloud();
    }, 5000);
};

const handleSupabaseError = (error: any) => {
    if (!error) return;
    console.error("Supabase Error:", error);
    return error;
}

const fetchFromCloud = async () => {
    if (!supabase || !currentUserId) return;

    // OPTIMIZATION: Only fetch Active orders OR items created in last 48 hours to save bandwidth/storage
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUserId)
        .or(`status.neq.${OrderStatus.DELIVERED},created_at.gt.${twoDaysAgo.toISOString()}`);

    if (error) {
        handleSupabaseError(error);
        return;
    }

    const appOrders: Order[] = data.map((row: any) => {
        const order: Order = {
            id: row.id,
            tableNumber: row.table_number,
            status: row.status as OrderStatus,
            timestamp: parseInt(row.timestamp) || new Date(row.created_at).getTime(),
            createdAt: new Date(row.created_at).getTime(),
            items: row.items,
            waiterName: row.waiter_name
        };

        // RESTORE DELIVERY METADATA FROM ITEMS (Cloud Persistence Hack)
        if (order.items && order.items.length > 0) {
            const firstItem = order.items[0] as any;
            if (firstItem._meta) {
                const meta = firstItem._meta;
                order.deliveryTime = meta.deliveryTime;
                order.deliveryNotes = meta.deliveryNotes;
                order.customerName = meta.customerName;
                order.customerAddress = meta.customerAddress;
                order.customerPhone = meta.customerPhone;
                order.notes = meta.notes;
                order.numberOfGuests = meta.numberOfGuests; // RESTORE GUEST COUNT
            }
        }
        return order;
    });

    // Apply local cache restoration to prevent flickering
    const finalOrders = restoreMetadata(appOrders);

    safeLocalStorageSave(STORAGE_KEY, JSON.stringify(finalOrders));
    window.dispatchEvent(new Event('local-storage-update'));
};

const fetchFromCloudMenu = async () => {
    if (!supabase || !currentUserId) return;
    const { data, error } = await supabase.from('menu_items').select('*').eq('user_id', currentUserId);

    if (error) handleSupabaseError(error);

    if (!error && data) {
        const appMenuItems: MenuItem[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            price: row.price,
            category: row.category,
            description: row.description,
            ingredients: row.ingredients,
            allergens: row.allergens,
            image: row.image,
            isCombo: row.category === Category.MENU_COMPLETO,
            comboItems: row.combo_items || [],
            specificDepartment: row.specific_department
        }));

        safeLocalStorageSave(MENU_KEY, JSON.stringify(appMenuItems));
        window.dispatchEvent(new Event('local-menu-update'));
    }
};

// Exported for WaiterPad collaboration notifications
export const fetchSettingsFromCloud = async () => {
    if (!supabase) return;

    // LAZY LOAD USER ID IF MISSING (Fixes race condition on WaiterPad mount)
    if (!currentUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            currentUserId = session.user.id;
        } else {
            return; // Still no user, cannot sync
        }
    }

    const { data, error } = await supabase.from('profiles').select('settings').eq('id', currentUserId).single();
    if (!error && data?.settings) {
        safeLocalStorageSave(APP_SETTINGS_KEY, JSON.stringify(data.settings));
        window.dispatchEvent(new Event('local-settings-update'));
    }
};

const fetchPromotionsFromCloud = async () => {
    if (!supabase || !currentUserId) return;
    const { data } = await supabase.from('marketing_promotions').select('*').eq('user_id', currentUserId);
    if (data) {
        const mapped = data.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            discountValue: r.discount_value,
            discountType: r.discount_type,
            startDate: r.start_date,
            endDate: r.end_date,
            isActive: r.is_active,
            targetAudience: r.target_audience
        }));
        savePromotions(mapped, false); // false = don't double sync
    }
};

const fetchAutomationsFromCloud = async () => {
    if (!supabase || !currentUserId) return;
    const { data } = await supabase.from('marketing_automations').select('*').eq('user_id', currentUserId);
    if (data) {
        // Only override if we have something, otherwise keep defaults or merge? 
        // For simplicity, we override local if cloud has data
        if (data.length > 0) {
            const mapped = data.map((r: any) => ({
                id: r.id,
                type: r.type,
                title: r.title,
                isActive: r.is_active,
                config: r.config
            }));
            saveAutomations(mapped, false);
        }
    }
};

const fetchSocialFromCloud = async () => {
    if (!supabase || !currentUserId) return;
    const { data } = await supabase.from('social_posts').select('*').eq('user_id', currentUserId);
    if (data) {
        const mapped = data.map((r: any) => ({
            id: r.id,
            topic: r.topic,
            content: r.content,
            image: r.image,
            overlayText: r.overlay_text,
            date: parseInt(r.date),
            platform: r.platform
        }));
        saveSocialPosts(mapped, false);
    }
};


// --- ORDER MANAGEMENT ---
export const getOrders = (): Order[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

const saveLocallyAndNotify = (orders: Order[]) => {
    updateMetadataCache(orders); // Cache metadata locally before saving
    safeLocalStorageSave(STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event('local-storage-update'));
};

// METADATA CACHE HELPERS (Prevents flickering)
const updateMetadataCache = (orders: Order[]) => {
    try {
        const cacheRaw = localStorage.getItem(METADATA_CACHE_KEY);
        const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
        let changed = false;

        orders.forEach(o => {
            if (o.deliveryTime || o.customerName || o.customerPhone || o.deliveryNotes || o.numberOfGuests) {
                cache[o.id] = {
                    deliveryTime: o.deliveryTime,
                    deliveryNotes: o.deliveryNotes,
                    customerName: o.customerName,
                    customerAddress: o.customerAddress,
                    customerPhone: o.customerPhone,
                    notes: o.notes,
                    numberOfGuests: o.numberOfGuests
                };
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(cache));
        }
    } catch (e) { console.error("Meta cache error", e); }
};

const restoreMetadata = (orders: Order[]) => {
    try {
        const cacheRaw = localStorage.getItem(METADATA_CACHE_KEY);
        if (!cacheRaw) return orders;
        const cache = JSON.parse(cacheRaw);

        return orders.map(o => {
            const cached = cache[o.id];
            if (cached) {
                // Restore if missing in order
                return {
                    ...o,
                    deliveryTime: o.deliveryTime || cached.deliveryTime,
                    deliveryNotes: o.deliveryNotes || cached.deliveryNotes,
                    customerName: o.customerName || cached.customerName,
                    customerAddress: o.customerAddress || cached.customerAddress,
                    notes: o.notes || cached.notes,
                    numberOfGuests: o.numberOfGuests || cached.numberOfGuests
                };
            }
            return o;
        });
    } catch (e) { return orders; }
};

const syncOrderToCloud = async (order: Order, isDelete = false) => {
    if (!supabase || !currentUserId) return;
    try {
        if (isDelete) {
            await supabase.from('orders').delete().eq('id', order.id);
        } else {
            // INJECT METADATA INTO ITEMS FOR CLOUD PERSISTENCE
            // Since Supabase schema might not have delivery columns, we hide them in items JSON
            const itemsWithMeta = order.items.map(i => ({ ...i })); // deep copy items array
            if (itemsWithMeta.length > 0) {
                (itemsWithMeta[0] as any)._meta = {
                    deliveryTime: order.deliveryTime,
                    deliveryNotes: order.deliveryNotes,
                    customerName: order.customerName,
                    numberOfGuests: order.numberOfGuests // SAVE GUEST COUNT
                };
            }

            const payload = {
                id: order.id,
                user_id: currentUserId,
                table_number: order.tableNumber,
                status: order.status,
                items: itemsWithMeta,
                timestamp: order.timestamp,
                waiter_name: order.waiterName
            };
            await supabase.from('orders').upsert(payload);
        }
    } catch (e) {
        console.warn("Cloud sync warning:", e);
    }
};

export const saveOrders = (orders: Order[]) => {
    saveLocallyAndNotify(orders);
};

export const addOrder = async (order: Order) => {
    const orders = getOrders();
    const settings = getAppSettings();
    const now = Date.now();

    const cleanOrder: Order = {
        ...order,
        timestamp: now,
        createdAt: now,
        items: order.items.map(i => {
            const dest = settings.categoryDestinations ? settings.categoryDestinations[i.menuItem.category] : 'Cucina';
            const isSala = dest === 'Sala';

            return {
                ...i,
                completed: isSala,
                served: false,
                isAddedLater: false,
                comboCompletedParts: [],
                comboServedParts: []
            };
        })
    };
    const newOrders = [...orders, cleanOrder];

    saveLocallyAndNotify(newOrders);
    syncOrderToCloud(cleanOrder);

    // AUTO-PRINT TICKETS
    printOrderToAllDepartments(cleanOrder, settings).catch(e => console.error("Print error:", e));
};

export const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedOrder = { ...order, status };
    const newOrders = orders.map(o => o.id === orderId ? updatedOrder : o);

    saveLocallyAndNotify(newOrders);
    syncOrderToCloud(updatedOrder);
};

export const deleteOrder = (orderId: string) => {
    const orders = getOrders();
    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete) return;

    const newOrders = orders.filter(o => o.id !== orderId);
    saveLocallyAndNotify(newOrders);
    syncOrderToCloud(orderToDelete, true);
};

export const updateOrder = (updatedOrder: Order) => {
    const orders = getOrders();
    const newOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);

    saveLocallyAndNotify(newOrders);
    syncOrderToCloud(updatedOrder);
};


export const updateOrderItems = async (orderId: string, newItems: OrderItem[]) => {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    const settings = getAppSettings();
    if (!order) return;

    const mergedItems = [...order.items];

    newItems.forEach(newItem => {
        const existingIndex = mergedItems.findIndex(old =>
            old.menuItem.id === newItem.menuItem.id &&
            (old.notes || '') === (newItem.notes || '')
        );

        if (existingIndex >= 0) {
            const existing = mergedItems[existingIndex];
            mergedItems[existingIndex] = {
                ...existing,
                quantity: existing.quantity + newItem.quantity,
                completed: false,
                served: false,
                isAddedLater: true,
                comboCompletedParts: existing.comboCompletedParts || [],
                comboServedParts: existing.comboServedParts || []
            };
        } else {
            const dest = settings.categoryDestinations ? settings.categoryDestinations[newItem.menuItem.category] : 'Cucina';
            const isSala = dest === 'Sala';

            mergedItems.push({
                ...newItem,
                completed: isSala,
                served: false,
                isAddedLater: true,
                comboCompletedParts: [],
                comboServedParts: []
            });
        }
    });

    let newStatus = order.status;
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.READY) {
        newStatus = OrderStatus.PENDING;
    }

    const updatedOrder = {
        ...order,
        items: mergedItems,
        timestamp: Date.now(),
        status: newStatus
    };
    const newOrders = orders.map(o => o.id === orderId ? updatedOrder : o);

    saveLocallyAndNotify(newOrders);
    syncOrderToCloud(updatedOrder);

    // AUTO-PRINT NEW ITEMS (OR RE-PRINT UPDATED TICKET)
    printOrderToAllDepartments(updatedOrder, settings).catch(e => console.error("Print error:", e));
};

export const toggleOrderItemCompletion = (orderId: string, itemIndex: number, subItemId?: string) => {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newItems = [...order.items];
    const targetItem = newItems[itemIndex];

    if (targetItem) {
        if (subItemId && targetItem.menuItem.category === Category.MENU_COMPLETO && targetItem.menuItem.comboItems) {
            const currentParts = targetItem.comboCompletedParts || [];
            let newParts;
            if (currentParts.includes(subItemId)) {
                newParts = currentParts.filter(id => id !== subItemId);
            } else {
                newParts = [...currentParts, subItemId];
            }
            newItems[itemIndex] = { ...targetItem, comboCompletedParts: newParts };
            const allPartsDone = targetItem.menuItem.comboItems.every(id => newParts.includes(id));
            newItems[itemIndex].completed = allPartsDone;
        } else {
            newItems[itemIndex] = { ...targetItem, completed: !targetItem.completed };
        }
    }

    const realItems = newItems.filter(i => i.menuItem.id !== 'separator');
    const allCooked = realItems.length > 0 && realItems.every(i => i.completed);
    const anyCooked = realItems.some(i => i.completed || (i.comboCompletedParts && i.comboCompletedParts.length > 0));

    let newStatus = order.status;
    if (order.status !== OrderStatus.DELIVERED) {
        if (allCooked) newStatus = OrderStatus.READY;
        else if (anyCooked) newStatus = OrderStatus.COOKING;
        else if (!anyCooked) newStatus = OrderStatus.PENDING;
    }

    const updatedOrder = { ...order, items: newItems, status: newStatus };
    const newOrders = orders.map(o => o.id === orderId ? updatedOrder : o);

    saveLocallyAndNotify(newOrders);
    syncOrderToCloud(updatedOrder);
};

export const serveItem = (orderId: string, itemIndex: number, subItemId?: string) => {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newItems = [...order.items];
    const targetItem = newItems[itemIndex];

    if (targetItem) {
        if (subItemId && targetItem.menuItem.category === Category.MENU_COMPLETO && targetItem.menuItem.comboItems) {
            const currentServed = targetItem.comboServedParts || [];
            let newServed = currentServed;
            if (!currentServed.includes(subItemId)) {
                newServed = [...currentServed, subItemId];
            }
            newItems[itemIndex] = { ...targetItem, comboServedParts: newServed };
            const allPartsServed = targetItem.menuItem.comboItems.every(id => newServed.includes(id));
            if (allPartsServed) newItems[itemIndex].served = true;
        } else {
            newItems[itemIndex] = { ...targetItem, served: true };
        }
    }

    const allServed = newItems.filter(i => i.menuItem.id !== 'separator').every(i => i.served);
    let newStatus = order.status;
    if (allServed && (newStatus === OrderStatus.READY || newStatus === OrderStatus.COOKING)) {
        newStatus = OrderStatus.PENDING;
    }

    const updatedOrder = { ...order, items: newItems, status: newStatus, timestamp: Date.now() };
    const newOrders = orders.map(o => o.id === orderId ? updatedOrder : o);

    saveLocallyAndNotify(newOrders);
    syncOrderToCloud(updatedOrder);
};

export const clearHistory = async () => {
    const orders = getOrders();
    const activeOrders = orders.filter(o => o.status !== OrderStatus.DELIVERED);
    saveLocallyAndNotify(activeOrders);

    if (supabase && currentUserId) {
        await supabase.from('orders').delete().eq('user_id', currentUserId).eq('status', OrderStatus.DELIVERED);
    }
};

export const deleteHistoryByDate = async (targetDate: Date) => {
    const orders = getOrders();
    const ordersToKeep = orders.filter(o => {
        if (o.status !== OrderStatus.DELIVERED) return true;
        const orderDate = new Date(o.createdAt || o.timestamp);
        const isSameDay = orderDate.getDate() === targetDate.getDate() &&
            orderDate.getMonth() === targetDate.getMonth() &&
            orderDate.getFullYear() === targetDate.getFullYear();
        return !isSameDay;
    });

    saveLocallyAndNotify(ordersToKeep);

    if (supabase && currentUserId) {
        const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);
        const { error } = await supabase.from('orders')
            .delete()
            .eq('user_id', currentUserId)
            .eq('status', OrderStatus.DELIVERED)
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());
        if (error) handleSupabaseError(error);
    }
};

export const freeTable = async (tableNumber: string) => {
    // 1. Archive Orders
    const orders = getOrders();
    const tableOrders = orders.filter(o => o.tableNumber === tableNumber && o.status !== OrderStatus.DELIVERED);

    // Only process if there are active orders to archive
    if (tableOrders.length > 0) {
        const otherOrders = orders.filter(o => o.tableNumber !== tableNumber || o.status === OrderStatus.DELIVERED);
        const archivedOrders = tableOrders.map(o => ({
            ...o,
            status: OrderStatus.DELIVERED,
            tableNumber: `${o.tableNumber}_HISTORY`,
            timestamp: Date.now()
        }));

        const newOrders = [...otherOrders, ...archivedOrders];
        saveLocallyAndNotify(newOrders);

        if (supabase && currentUserId) {
            for (const o of archivedOrders) {
                await syncOrderToCloud(o);
            }
        }
    }

    // 2. Complete Reservation (if any)
    const reservation = getTableReservation(tableNumber);
    if (reservation && (reservation.status === ReservationStatus.SEATED || reservation.status === ReservationStatus.PENDING)) {
        await updateReservationStatus(reservation.id, ReservationStatus.COMPLETED, {
            completedAt: Date.now()
        });
    }
};

export const performFactoryReset = async () => {
    safeLocalStorageSave(STORAGE_KEY, '[]');
    safeLocalStorageSave(MENU_KEY, '[]');
    window.dispatchEvent(new Event('local-storage-update'));
    window.dispatchEvent(new Event('local-menu-update'));

    if (supabase && currentUserId) {
        await supabase.from('orders').delete().eq('user_id', currentUserId);
        await supabase.from('menu_items').delete().eq('user_id', currentUserId);
    }
};

export const deleteAllMenuItems = async () => {
    safeLocalStorageSave(MENU_KEY, '[]');
    window.dispatchEvent(new Event('local-menu-update'));

    if (supabase && currentUserId) {
        const { error } = await supabase.from('menu_items').delete().eq('user_id', currentUserId);
        if (error) handleSupabaseError(error);
    }
};

export const importDemoMenu = async () => {
    // Sync to cloud if available
    if (currentUserId && supabase) {
        const demoItemsWithUserId = DEMO_MENU_ITEMS.map(item => ({
            id: item.id,
            user_id: currentUserId,
            name: item.name,
            price: item.price,
            category: item.category,
            description: item.description,
            ingredients: item.ingredients,
            allergens: item.allergens,
            image: item.image,
            combo_items: item.comboItems,
            specific_department: item.specificDepartment
        }));

        const { error } = await supabase.from('menu_items').upsert(demoItemsWithUserId);
        if (error) {
            handleSupabaseError(error);
            console.error("Errore sincronizzazione cloud:", error);
        }
    }

    const currentItems = getMenuItems();
    const newIds = DEMO_MENU_ITEMS.map(d => d.id);
    const existingFiltered = currentItems.filter(i => !newIds.includes(i.id));
    const finalMenu = [...existingFiltered, ...DEMO_MENU_ITEMS];
    safeLocalStorageSave(MENU_KEY, JSON.stringify(finalMenu));
    window.dispatchEvent(new Event('local-menu-update'));
};

export const getTableCount = (): number => {
    const settings = getAppSettings();
    return settings.restaurantProfile?.tableCount || 12;
};

export const saveTableCount = (count: number) => {
    safeLocalStorageSave(TABLES_COUNT_KEY, count.toString());
    window.dispatchEvent(new Event('local-storage-update'));
};

export const getWaiterName = (): string | null => {
    return localStorage.getItem(WAITER_KEY);
};

export const saveWaiterName = (name: string) => {
    safeLocalStorageSave(WAITER_KEY, name);
};

export const logoutWaiter = () => {
    localStorage.removeItem(WAITER_KEY);
};

export const getMenuItems = (): MenuItem[] => {
    const data = localStorage.getItem(MENU_KEY);
    return data ? JSON.parse(data) : [];
};

const syncMenuToCloud = async (item: MenuItem, isDelete = false) => {
    if (!supabase || !currentUserId) return;
    try {
        if (isDelete) {
            await supabase.from('menu_items').delete().eq('id', item.id);
        } else {
            const payload = {
                id: item.id,
                user_id: currentUserId,
                name: item.name,
                price: item.price,
                category: item.category,
                description: item.description,
                ingredients: item.ingredients,
                allergens: item.allergens,
                image: item.image,
                combo_items: item.comboItems,
                specific_department: item.specificDepartment
            };
            await supabase.from('menu_items').upsert(payload);
        }
    } catch (e) { console.warn("Menu sync failed", e); }
};

export const saveMenuItems = (items: MenuItem[]) => {
    safeLocalStorageSave(MENU_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('local-menu-update'));
};

export const addMenuItem = (item: MenuItem) => {
    const items = getMenuItems();
    items.push(item);
    saveMenuItems(items);
    syncMenuToCloud(item);
};

export const updateMenuItem = (updatedItem: MenuItem) => {
    const items = getMenuItems();
    const newItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
    saveMenuItems(newItems);
    syncMenuToCloud(updatedItem);
};

export const deleteMenuItem = (id: string) => {
    const items = getMenuItems();
    const itemToDelete = items.find(i => i.id === id);
    const newItems = items.filter(i => i.id !== id);
    saveMenuItems(newItems);
    if (itemToDelete) syncMenuToCloud(itemToDelete, true);
};

// Force sync all local menu items to cloud
export const syncAllMenuToCloud = async () => {
    if (!supabase || !currentUserId) {
        console.warn('Cannot sync: Supabase not initialized or user not logged in');
        return { success: false, message: 'Supabase non inizializzato o utente non loggato' };
    }

    const items = getMenuItems();
    if (items.length === 0) {
        return { success: true, message: 'Nessun piatto da sincronizzare' };
    }

    try {
        let synced = 0;
        for (const item of items) {
            await syncMenuToCloud(item);
            synced++;
        }
        console.log(`Synced ${synced} menu items to cloud`);
        return { success: true, message: `${synced} piatti sincronizzati con successo` };
    } catch (e) {
        console.error('Sync all menu failed:', e);
        return { success: false, message: 'Errore durante la sincronizzazione' };
    }
};


export const getGoogleApiKey = (): string | null => {
    return localStorage.getItem(GOOGLE_API_KEY_STORAGE);
};

export const saveGoogleApiKey = async (apiKey: string) => {
    safeLocalStorageSave(GOOGLE_API_KEY_STORAGE, apiKey);
    if (supabase && currentUserId) {
        const { error } = await supabase
            .from('profiles')
            .update({ google_api_key: apiKey })
            .eq('id', currentUserId);
        if (error) console.error("Failed to save API Key to cloud", error);
    }
};

export const removeGoogleApiKey = async () => {
    localStorage.removeItem(GOOGLE_API_KEY_STORAGE);
    if (supabase && currentUserId) {
        const { error } = await supabase
            .from('profiles')
            .update({ google_api_key: null })
            .eq('id', currentUserId);
        if (error) console.error("Failed to remove API Key from cloud", error);
    }
};

const DEFAULT_SETTINGS: AppSettings = {
    categoryDestinations: {
        [Category.MENU_COMPLETO]: 'Cucina',
        [Category.ANTIPASTI]: 'Cucina',
        [Category.PANINI]: 'Pub',
        [Category.PIZZE]: 'Pizzeria',
        [Category.PRIMI]: 'Cucina',
        [Category.SECONDI]: 'Cucina',
        [Category.DOLCI]: 'Cucina',
        [Category.BEVANDE]: 'Sala'
    },
    printEnabled: {
        'Cucina': false,
        'Pizzeria': false,
        'Pub': false,
        'Sala': false,
        'Cassa': false
    },
    printers: [],
    printerAssignments: {},
    restaurantProfile: {
        tableCount: 12
    },
    tableReservations: [],
    sharedTables: {},
    activeCollaborations: [],
    foodCostMarkup: 3.5
};

export const getAppSettings = (): AppSettings => {
    const data = localStorage.getItem(APP_SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    try {
        const parsed = JSON.parse(data);
        return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            categoryDestinations: {
                ...DEFAULT_SETTINGS.categoryDestinations,
                ...(parsed.categoryDestinations || {})
            },
            printEnabled: {
                ...DEFAULT_SETTINGS.printEnabled,
                ...(parsed.printEnabled || {})
            },
            printers: parsed.printers || [],
            printerAssignments: parsed.printerAssignments || {},
            restaurantProfile: {
                ...DEFAULT_SETTINGS.restaurantProfile,
                ...(parsed.restaurantProfile || {})
            },
            tableReservations: parsed.tableReservations || [],
            sharedTables: parsed.sharedTables || {},
            activeCollaborations: parsed.activeCollaborations || [],
            foodCostMarkup: parsed.foodCostMarkup || DEFAULT_SETTINGS.foodCostMarkup
        };
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
};

export const saveAppSettings = async (settings: AppSettings) => {
    safeLocalStorageSave(APP_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('local-settings-update'));
    window.dispatchEvent(new Event('local-storage-update'));

    if (supabase && currentUserId) {
        try {
            await supabase.from('profiles').update({ settings: settings }).eq('id', currentUserId);
        } catch (e) { console.warn("Settings sync failed", e); }
    }
};

export const getNotificationSettings = (): NotificationSettings => {
    const data = localStorage.getItem(SETTINGS_NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : { kitchenSound: true, waiterSound: true, pushEnabled: false };
};

export const saveNotificationSettings = (settings: NotificationSettings) => {
    safeLocalStorageSave(SETTINGS_NOTIFICATIONS_KEY, JSON.stringify(settings));
};

// --- MARKETING MANAGEMENT (LOCAL ONLY FOR NOW) ---
const MARKETING_KEY = 'ristosync_marketing_promos';

export const getPromotions = (): any[] => {
    const data = localStorage.getItem(MARKETING_KEY);
    return data ? JSON.parse(data) : [];
};

export const savePromotions = (promos: any[], shouldSync = true) => {
    safeLocalStorageSave(MARKETING_KEY, JSON.stringify(promos));
    window.dispatchEvent(new Event('local-marketing-update'));
    if (shouldSync && supabase && currentUserId) {
        // We sync individual items in add/update/delete usually, 
        // but if this is a bulk save, we might need a bulk sync?
        // actually, easiest is to just let add/update handle single syncs.
        // But if 'savePromotions' is called directly, we might miss sync.
        // For now, we rely on specific add/update functions for sync.
    }
};

const syncPromoToCloud = async (promo: any, isDelete = false) => {
    if (!supabase || !currentUserId) return;
    try {
        if (isDelete) {
            await supabase.from('marketing_promotions').delete().eq('id', promo.id);
        } else {
            await supabase.from('marketing_promotions').upsert({
                id: promo.id,
                user_id: currentUserId,
                title: promo.title,
                description: promo.description,
                discount_value: promo.discountValue,
                discount_type: promo.discountType,
                start_date: promo.startDate,
                end_date: promo.endDate,
                is_active: promo.isActive,
                target_audience: promo.targetAudience
            });
        }
    } catch (e) {
        console.warn("Promo Sync Error", e);
    }
}

export const addPromotion = (promo: any) => {
    const promos = getPromotions();
    promos.push(promo);
    savePromotions(promos);
    syncPromoToCloud(promo);
};

export const updatePromotion = (updatedPromo: any) => {
    const promos = getPromotions();
    const newPromos = promos.map(p => p.id === updatedPromo.id ? updatedPromo : p);
    savePromotions(newPromos);
    syncPromoToCloud(updatedPromo);
};

export const deletePromotion = (id: string) => {
    const promos = getPromotions();
    const newPromos = promos.filter(p => p.id !== id);
    savePromotions(newPromos);
    syncPromoToCloud({ id }, true);
};


// --- AUTOMATION MANAGEMENT ---
const MARKETING_AUTO_KEY = 'ristosync_marketing_automation';

export const getAutomations = (): any[] => {
    const data = localStorage.getItem(MARKETING_AUTO_KEY);
    // Defaults if empty
    if (!data) {
        return [
            { id: 'auto_bday', type: 'birthday_promo', title: 'Buono Compleanno', isActive: false, config: { discountValue: 20, discountType: 'percentage', message: 'Tanti Auguri! Ecco un regalo per te.' } },
            { id: 'auto_review', type: 'review_request', title: 'Richiesta Recensione', isActive: false, config: { reviewPlatform: 'all', message: 'Ti è piaciuta la serata? Lasciaci una recensione!' } },
            { id: 'auto_happy', type: 'happy_hour', title: 'Happy Hour Automatico', isActive: false, config: { startTime: '18:00', endTime: '20:00', daysOfWeek: [1, 2, 3, 4, 5], message: 'Happy Hour! 50% sui drink.' } }
        ];
    }
    return JSON.parse(data);
};

export const saveAutomations = (autos: any[], shouldSync = true) => {
    safeLocalStorageSave(MARKETING_AUTO_KEY, JSON.stringify(autos));
    window.dispatchEvent(new Event('local-automation-update'));
};

const syncAutomationToCloud = async (auto: any) => {
    if (!supabase || !currentUserId) return;
    try {
        await supabase.from('marketing_automations').upsert({
            id: auto.id,
            user_id: currentUserId,
            type: auto.type,
            title: auto.title,
            is_active: auto.isActive,
            config: auto.config
        });
    } catch (e) { console.warn("Auto Sync Error", e) }
}

export const updateAutomation = (updatedAuto: any) => {
    const autos = getAutomations();
    const newAutos = autos.map(a => a.id === updatedAuto.id ? updatedAuto : a);
    saveAutomations(newAutos);
    syncAutomationToCloud(updatedAuto);
};


// --- SOCIAL POSTS MANAGEMENT ---
const SOCIAL_POSTS_KEY = 'ristosync_social_posts';

export const getSocialPosts = (): any[] => {
    const data = localStorage.getItem(SOCIAL_POSTS_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveSocialPosts = (posts: any[], shouldSync = true) => {
    safeLocalStorageSave(SOCIAL_POSTS_KEY, JSON.stringify(posts));
    window.dispatchEvent(new Event('local-social-update'));
};

const syncSocialToCloud = async (post: any, isDelete = false) => {
    if (!supabase || !currentUserId) return;
    try {
        if (isDelete) {
            await supabase.from('social_posts').delete().eq('id', post.id);
        } else {
            await supabase.from('social_posts').upsert({
                id: post.id,
                user_id: currentUserId,
                topic: post.topic,
                content: post.content,
                image: post.image,
                overlay_text: post.overlayText,
                date: post.date,
                platform: post.platform
            });
        }
    } catch (e) { console.warn("Social Sync Error", e) }
}

export const addSocialPost = (post: any) => {
    const posts = getSocialPosts();
    posts.unshift(post); // Add to top
    saveSocialPosts(posts);
    syncSocialToCloud(post);
};

export const updateSocialPost = (updatedPost: any) => {
    const posts = getSocialPosts();
    const newPosts = posts.map(p => p.id === updatedPost.id ? updatedPost : p);
    saveSocialPosts(newPosts);
    syncSocialToCloud(updatedPost);
};

export const deleteSocialPost = (id: string) => {
    const posts = getSocialPosts();
    const newPosts = posts.filter(p => p.id !== id);
    saveSocialPosts(newPosts);
    syncSocialToCloud({ id }, true);
};


// --- RESERVATION & COLLAB SYNC (Via AppSettings) ---

export const toggleTableReservationService = async (tableNum: string) => {
    const settings = getAppSettings();
    const currentReservations = settings.tableReservations || [];
    let newReservations;

    if (currentReservations.includes(tableNum)) {
        newReservations = currentReservations.filter((r: string) => r !== tableNum);
    } else {
        newReservations = [...currentReservations, tableNum];
    }

    const newSettings = { ...settings, tableReservations: newReservations };
    await saveAppSettings(newSettings);
};

export const syncCollaborationRequestService = async (request: any) => {
    const settings = getAppSettings();
    const current = settings.activeCollaborations || [];
    // Prevent duplicates
    if (current.some((r: any) => r.id === request.id)) return;

    const newCollabs = [...current, request];
    await saveAppSettings({ ...settings, activeCollaborations: newCollabs });
};

export const syncSharedTableService = async (tableNum: string, waiters: string[]) => {
    const settings = getAppSettings();
    const currentShared = settings.sharedTables || {};

    const newShared = { ...currentShared, [tableNum]: waiters };
    await saveAppSettings({ ...settings, sharedTables: newShared });
};


export const removeCollaborationRequestService = async (requestId: string) => {
    const settings = getAppSettings();
    const current = settings.activeCollaborations || [];
    const newCollabs = current.filter((c: any) => c.id !== requestId);

    await saveAppSettings({ ...settings, activeCollaborations: newCollabs });
};

export const resetAllTableDataService = async () => {
    const settings = getAppSettings();
    const newSettings = {
        ...settings,
        sharedTables: {},
        activeCollaborations: [],
        tableReservations: []
    };
    await saveAppSettings(newSettings);
    console.log("All table data reset!");
};

// --- RESERVATION MANAGEMENT (CLOUD SYNC) ---

export const getReservationsFromCloud = async (): Promise<Reservation[]> => {
    if (!supabase || !currentUserId) return [];

    // Fetch active reservations (or all history? maybe limit to last 30 days + future)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', currentUserId)
        .gte('reservation_date', thirtyDaysAgo.toISOString().split('T')[0]);

    if (error) {
        console.error("Error fetching reservations:", error);
        return [];
    }

    return data.map((r: any) => ({
        id: r.id,
        tableNumber: r.table_number,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        numberOfGuests: r.number_of_guests,
        numberOfChildren: r.number_of_children,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        status: r.status as ReservationStatus,
        specialRequests: r.special_requests,
        occasion: r.occasion,
        highChair: r.high_chair,
        depositAmount: r.deposit_amount,
        depositPaid: r.deposit_paid,
        depositMethod: r.deposit_method,
        createdAt: new Date(r.created_at).getTime(),
        updatedAt: new Date(r.updated_at).getTime(),
        waiterAssigned: r.waiter_assigned,
        cancelReason: r.cancel_reason,
        cancelledAt: r.cancelled_at ? new Date(r.cancelled_at).getTime() : undefined
    }));
};

export const saveReservationToCloud = async (reservation: Reservation): Promise<{ success: boolean, error?: any }> => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };

    // Ensure User ID is present
    if (!currentUserId) {
        const { data } = await supabase.auth.getSession();
        if (data.session) currentUserId = data.session.user.id;
        else {
            console.error("Cloud Save Failed (Reservation): Not Authenticated");
            return { success: false, error: 'Not authenticated' };
        }
    }

    const payload = {
        id: reservation.id,
        user_id: currentUserId,
        table_number: reservation.tableNumber,
        customer_id: reservation.customerId,
        customer_name: reservation.customerName,
        customer_phone: reservation.customerPhone,
        number_of_guests: reservation.numberOfGuests,
        number_of_children: reservation.numberOfChildren,
        reservation_date: reservation.reservationDate,
        reservation_time: reservation.reservationTime,
        status: reservation.status,
        special_requests: reservation.specialRequests,
        occasion: reservation.occasion,
        high_chair: reservation.highChair,
        deposit_amount: reservation.depositAmount,
        deposit_paid: reservation.depositPaid,
        deposit_method: reservation.depositMethod,
        waiter_assigned: reservation.waiterAssigned,
        cancel_reason: reservation.cancelReason,
        cancelled_at: reservation.cancelledAt ? new Date(reservation.cancelledAt).toISOString() : null,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('reservations').upsert(payload);
    if (error) {
        console.error("Cloud Save Error (Reservation):", error);
        return { success: false, error };
    }
    return { success: true };
};

export const deleteReservationFromCloud = async (id: string) => {
    if (!supabase || !currentUserId) return;
    await supabase.from('reservations').delete().eq('id', id);
};


// --- CUSTOMER MANAGEMENT (CLOUD SYNC) ---

export const getCustomersFromCloud = async (): Promise<Customer[]> => {
    if (!supabase || !currentUserId) return [];

    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', currentUserId);

    if (error) {
        console.error("Error fetching customers:", error);
        return [];
    }

    return data.map((c: any) => ({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone,
        email: c.email,
        city: c.city,
        notes: c.notes,
        totalVisits: c.total_visits,
        createdAt: new Date(c.created_at).getTime(),
        lastVisit: c.last_visit ? new Date(c.last_visit).getTime() : undefined,
        totalSpent: c.total_spent,
        preferredTable: c.preferred_table,
        allergies: c.allergies
    }));
};

export const saveCustomerToCloud = async (customer: Customer): Promise<{ success: boolean, error?: any }> => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };

    if (!currentUserId) {
        const { data } = await supabase.auth.getSession();
        if (data.session) currentUserId = data.session.user.id;
        else {
            console.error("Cloud Save Failed (Customer): Not Authenticated");
            return { success: false, error: 'Not authenticated' };
        }
    }

    const payload = {
        id: customer.id,
        user_id: currentUserId,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        notes: customer.notes,
        total_visits: customer.totalVisits,
        total_spent: customer.totalSpent,
        preferred_table: customer.preferredTable,
        allergies: customer.allergies,
        last_visit: customer.lastVisit ? new Date(customer.lastVisit).toISOString() : null
    };

    const { error } = await supabase.from('customers').upsert(payload);
    if (error) {
        console.error("Cloud Save Error (Customer):", error);
        return { success: false, error };
    }
    return { success: true };
};

// --- SYNC HELPERS (Downstream + Notify) ---

export const syncReservationsDown = async () => {
    const data = await getReservationsFromCloud();
    // Always save, even if empty (to handle clear deletes from other devices?) 
    // Actually, getReservationsFromCloud returns active ones. If list is empty, maybe we have 0 reservations.
    // Safe to overwrite local cache.
    localStorage.setItem('reservations', JSON.stringify(data));
    window.dispatchEvent(new Event('local-reservations-update'));
};

export const syncCustomersDown = async () => {
    const data = await getCustomersFromCloud();
    if (data) {
        localStorage.setItem('customers', JSON.stringify(data));
        window.dispatchEvent(new Event('local-customers-update'));
    }
};

// ============================================
// 🆕 RESERVATION LOCAL STORAGE FUNCTIONS
// ============================================

const RESERVATIONS_KEY = 'reservations';

/**
 * Get all reservations from localStorage
 */
export const getReservations = (): Reservation[] => {
    const data = localStorage.getItem(RESERVATIONS_KEY);
    return data ? JSON.parse(data) : [];
};

/**
 * Get reservations for today
 */
export const getTodayReservations = (): Reservation[] => {
    const all = getReservations();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    return all.filter(r =>
        r.reservationDate === today &&
        r.status !== ReservationStatus.CANCELLED &&
        r.status !== ReservationStatus.NO_SHOW
    );
};

/**
 * Get active reservations (PENDING or SEATED) for a specific table
 */
export const getTableReservation = (tableNumber: string): Reservation | null => {
    const all = getReservations();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Find active reservations for this table
    const active = all.filter(r =>
        r.tableNumber === tableNumber &&
        r.reservationDate === today &&
        (r.status === ReservationStatus.PENDING || r.status === ReservationStatus.SEATED)
    );

    if (active.length === 0) return null;

    // Prioritize SEATED reservations (customer is here)
    const seated = active.find(r => r.status === ReservationStatus.SEATED);
    if (seated) return seated;

    // For PENDING, only show if within 1 hour or past due (and not cancelled/completed)
    // AND prioritize the earliest one
    const pendingWithTime = active
        .filter(r => r.status === ReservationStatus.PENDING)
        .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime));

    const visiblePending = pendingWithTime.find(r => {
        const [hours, minutes] = r.reservationTime.split(':').map(Number);
        const resTime = new Date();
        resTime.setHours(hours, minutes, 0, 0);

        // Window: From (ResTime - 1 Hour) to (ResTime + X hours?? Usually until completed)
        // Actually, we just want to know if we are "close" to the time.
        // "Almeno un ora prima" -> Current Time >= (ResTime - 1h)
        const oneHourBefore = new Date(resTime);
        oneHourBefore.setHours(resTime.getHours() - 1);

        // Also check if we are not TOO late (e.g. 12 hours late? probably expired logic handles that elsewhere, but let's be safe)
        // For now, simple check: is it time to show it?
        return now >= oneHourBefore;
    });

    return visiblePending || null;
};

/**
 * Update reservation status and sync to cloud
 */
export const updateReservationStatus = async (
    reservationId: string,
    newStatus: ReservationStatus,
    additionalData?: Partial<Reservation>
): Promise<void> => {
    const reservations = getReservations();
    const reservation = reservations.find(r => r.id === reservationId);

    if (!reservation) {
        console.error('Reservation not found:', reservationId);
        return;
    }

    const now = Date.now();
    const updated: Reservation = {
        ...reservation,
        status: newStatus,
        updatedAt: now,
        ...additionalData
    };

    // Add timestamps based on status
    if (newStatus === ReservationStatus.SEATED && !updated.seatedAt) {
        updated.seatedAt = now;
        updated.arrivedAt = updated.arrivedAt || now;
    }
    if (newStatus === ReservationStatus.CANCELLED && !updated.cancelledAt) {
        updated.cancelledAt = now;
    }
    if (newStatus === ReservationStatus.COMPLETED && !updated.completedAt) {
        updated.completedAt = now;
    }
    if (newStatus === ReservationStatus.NO_SHOW && !updated.noShowMarkedAt) {
        updated.noShowMarkedAt = now;
    }

    const newReservations = reservations.map(r => r.id === reservationId ? updated : r);

    // Save locally
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(newReservations));
    window.dispatchEvent(new Event('local-reservations-update'));

    // Sync to cloud
    await saveReservationToCloud(updated);
};

/**
 * Check if a table is reserved at a specific time
 */
export const isTableReserved = (tableNumber: string, date?: string, time?: string): boolean => {
    const reservations = getReservations();
    const checkDate = date || new Date().toISOString().split('T')[0];

    return reservations.some(r =>
        r.tableNumber === tableNumber &&
        r.reservationDate === checkDate &&
        (r.status === ReservationStatus.PENDING || r.status === ReservationStatus.SEATED) &&
        (!time || r.reservationTime === time)
    );
};

/**
 * Get upcoming reservations (within next hour)
 */
export const getUpcomingReservations = (): Reservation[] => {
    const all = getTodayReservations();
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    return all.filter(r => {
        if (r.status !== ReservationStatus.PENDING) return false;

        const [hours, minutes] = r.reservationTime.split(':').map(Number);
        const reservationTime = new Date();
        reservationTime.setHours(hours, minutes, 0, 0);

        return reservationTime >= now && reservationTime <= oneHourLater;
    }).sort((a, b) => a.reservationTime.localeCompare(b.reservationTime));
};

/**
 * Mark customer as arrived (PENDING -> SEATED)
 */
export const markCustomerArrived = async (reservationId: string, waiterName?: string): Promise<void> => {
    await updateReservationStatus(reservationId, ReservationStatus.SEATED, {
        arrivedAt: Date.now(),
        seatedAt: Date.now(),
        waiterAssigned: waiterName
    });
};

/**
 * Cancel a reservation
 */
export const cancelReservation = async (reservationId: string, reason?: string): Promise<void> => {
    await updateReservationStatus(reservationId, ReservationStatus.CANCELLED, {
        cancelReason: reason,
        cancelledAt: Date.now()
    });
};

/**
 * Link reservation to order when customer starts ordering
 */
export const linkReservationToOrder = async (reservationId: string, orderId: string): Promise<void> => {
    await updateReservationStatus(reservationId, ReservationStatus.ACTIVE, {
        orderId: orderId
    });
};

// ============================================
// 📦 INVENTORY MANAGEMENT (WITH CLOUD SYNC)
// ============================================

// Sync single inventory item to cloud
const syncInventoryToCloud = async (item: InventoryItem, isDelete = false) => {
    if (!supabase || !currentUserId) return;
    try {
        if (isDelete) {
            await supabase.from('inventory').delete().eq('id', item.id);
        } else {
            await supabase.from('inventory').upsert({
                id: item.id,
                user_id: currentUserId,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                cost_per_unit: item.costPerUnit,
                supplier: item.supplier || null,
                min_quantity: item.minQuantity || 0,
                last_restocked: item.lastRestocked ? new Date(item.lastRestocked).toISOString() : null
            });
        }
    } catch (e) {
        console.warn("Inventory Sync Error", e);
    }
};

// Fetch inventory from cloud
export const getInventoryFromCloud = async (): Promise<InventoryItem[]> => {
    if (!supabase || !currentUserId) return [];

    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('user_id', currentUserId);

        if (error) {
            console.error("Error fetching inventory:", error);
            return [];
        }

        return (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity || 0,
            unit: item.unit,
            costPerUnit: item.cost_per_unit || 0,
            supplier: item.supplier,
            minQuantity: item.min_quantity || 0,
            lastRestocked: item.last_restocked ? new Date(item.last_restocked).getTime() : Date.now()
        }));
    } catch (e) {
        console.error("Error in getInventoryFromCloud:", e);
        return [];
    }
};

// Sync inventory from cloud to local (download)
export const syncInventoryDown = async () => {
    const cloudData = await getInventoryFromCloud();
    if (cloudData.length > 0) {
        // Merge: cloud data takes priority, but keep local items not in cloud
        const localData = getInventory();
        const cloudIds = new Set(cloudData.map(item => item.id));
        const localOnlyItems = localData.filter(item => !cloudIds.has(item.id));

        // Keep all cloud items + local-only items (for offline support)
        const merged = [...cloudData, ...localOnlyItems];
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event('local-inventory-update'));
        console.log(`✅ Inventory synced: ${cloudData.length} from cloud, ${localOnlyItems.length} local-only`);
    }
};

export const getInventory = (): InventoryItem[] => {
    const data = localStorage.getItem(INVENTORY_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveInventory = (items: InventoryItem[]) => {
    safeLocalStorageSave(INVENTORY_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('local-inventory-update'));
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const items = getInventory();
    const newItem: InventoryItem = {
        ...item,
        id: generateUUID(),
        lastRestocked: Date.now()
    };
    saveInventory([...items, newItem]);

    // Sync to cloud
    await syncInventoryToCloud(newItem);

    return newItem;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    const items = getInventory();
    const updated = items.map(i => i.id === id ? { ...i, ...updates } : i);
    saveInventory(updated);

    // Sync to cloud
    const updatedItem = updated.find(i => i.id === id);
    if (updatedItem) {
        await syncInventoryToCloud(updatedItem);
    }
};

export const deleteInventoryItem = async (id: string) => {
    const items = getInventory();
    const itemToDelete = items.find(i => i.id === id);
    const filtered = items.filter(i => i.id !== id);
    saveInventory(filtered);

    // Sync deletion to cloud
    if (itemToDelete) {
        await syncInventoryToCloud(itemToDelete, true);
    }
};


// === EXPENSES MANAGEMENT ===


const EXPENSES_KEY = 'ristosync_expenses';

const saveExpenses = (expenses: Expense[]) => {
    safeLocalStorageSave(EXPENSES_KEY, JSON.stringify(expenses));
    // Trigger local update event for UI sync
    window.dispatchEvent(new Event('local-expenses-update'));
};

export const getExpenses = (): Expense[] => {
    try {
        const data = localStorage.getItem(EXPENSES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const addExpense = (expense: Omit<Expense, 'id'>): Expense => {
    const expenses = getExpenses();
    const newExpense: Expense = {
        ...expense,
        id: generateUUID()
    };
    saveExpenses([...expenses, newExpense]);
    return newExpense;
};

export const updateExpense = (id: string, updates: Partial<Expense>) => {
    const expenses = getExpenses();
    const updated = expenses.map(e => e.id === id ? { ...e, ...updates } : e);
    saveExpenses(updated);
};

export const deleteExpense = (id: string) => {
    const expenses = getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    saveExpenses(filtered);
};


// === SUPPLIER MANAGEMENT ===

export interface Supplier {
    id: string;
    name: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
    paymentTerms?: string; // e.g. "30gg", "Vista fattura"
    category?: string; // e.g. "Food", "Beverage", "Services"
    notes?: string;
}

const SUPPLIERS_KEY = 'ristosync_suppliers';

const saveSuppliers = (suppliers: Supplier[]) => {
    safeLocalStorageSave(SUPPLIERS_KEY, JSON.stringify(suppliers));
    window.dispatchEvent(new Event('local-suppliers-update'));
};

export const getSuppliers = (): Supplier[] => {
    try {
        const data = localStorage.getItem(SUPPLIERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const addSupplier = (supplier: Omit<Supplier, 'id'>): Supplier => {
    const suppliers = getSuppliers();
    const newSupplier: Supplier = {
        ...supplier,
        id: generateUUID()
    };
    saveSuppliers([...suppliers, newSupplier]);
    return newSupplier;
};

export const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    const suppliers = getSuppliers();
    const updated = suppliers.map(s => s.id === id ? { ...s, ...updates } : s);
    saveSuppliers(updated);
};

export const deleteSupplier = (id: string) => {
    const suppliers = getSuppliers();
    const filtered = suppliers.filter(s => s.id !== id);
    saveSuppliers(filtered);
};
