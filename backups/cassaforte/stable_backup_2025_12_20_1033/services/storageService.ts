
import { Order, OrderStatus, OrderItem, MenuItem, AppSettings, Category, Department, NotificationSettings } from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'ristosync_orders';
const TABLES_COUNT_KEY = 'ristosync_table_count';
const WAITER_KEY = 'ristosync_waiter_name';
const MENU_KEY = 'ristosync_menu_items';
const SETTINGS_NOTIFICATIONS_KEY = 'ristosync_settings_notifications';
const APP_SETTINGS_KEY = 'ristosync_app_settings';
const GOOGLE_API_KEY_STORAGE = 'ristosync_google_api_key';
const METADATA_CACHE_KEY = 'ristosync_orders_metadata'; // Local cache for delivery info

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

// Initialize Realtime Subscription
export const initSupabaseSync = async () => {
    if (!supabase) return;

    // Get Current User
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        currentUserId = session.user.id;

        // 1. Initial Sync
        await fetchFromCloud();
        await fetchFromCloudMenu();
        await fetchSettingsFromCloud();

        // MARKETING SYNC
        await fetchPromotionsFromCloud();
        await fetchAutomationsFromCloud();
        await fetchSocialFromCloud();

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
            .subscribe();

        // 4. Fallback Polling (Heartbeat) - Settings polled every 5s for collaboration notifications
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => {
            fetchFromCloud();
            fetchSettingsFromCloud(); // More frequent for collaboration
            fetchPromotionsFromCloud();
        }, 5000); // Reduced from 15s to 5s for faster collaboration sync
    }
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
            if (o.deliveryTime || o.customerName || o.customerPhone || o.deliveryNotes) {
                cache[o.id] = {
                    deliveryTime: o.deliveryTime,
                    deliveryNotes: o.deliveryNotes,
                    customerName: o.customerName,
                    customerAddress: o.customerAddress,
                    customerPhone: o.customerPhone,
                    notes: o.notes
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
                    customerPhone: o.customerPhone || cached.customerPhone,
                    notes: o.notes || cached.notes
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
                    customerAddress: order.customerAddress,
                    customerPhone: order.customerPhone,
                    notes: order.notes
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

    const allCooked = newItems.every(i => i.completed);
    const anyCooked = newItems.some(i => i.completed || (i.comboCompletedParts && i.comboCompletedParts.length > 0));

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

    const allServed = newItems.every(i => i.served);
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
    const orders = getOrders();
    const tableOrders = orders.filter(o => o.tableNumber === tableNumber);
    const otherOrders = orders.filter(o => o.tableNumber !== tableNumber);

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
    restaurantProfile: {
        tableCount: 12
    },
    tableReservations: [],
    sharedTables: {},
    activeCollaborations: []
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
            restaurantProfile: {
                ...DEFAULT_SETTINGS.restaurantProfile,
                ...(parsed.restaurantProfile || {})
            },
            tableReservations: parsed.tableReservations || [],
            sharedTables: parsed.sharedTables || {},
            activeCollaborations: parsed.activeCollaborations || []
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
