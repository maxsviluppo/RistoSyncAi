import React, { useState, useEffect, useRef } from 'react';
import {
    ShoppingBag,
    Bike,
    MapPin,
    Clock,
    Phone,
    User,
    Plus,
    CheckCircle,
    X,
    ChevronRight,
    ChefHat,
    Trash2,
    AlertTriangle,
    Save,
    Search,
    Filter,
    LogOut,
    Camera,
    Loader,
    Scan,
    Sparkles,
    LayoutGrid
} from 'lucide-react';
import { Order, OrderItem, MenuItem, Category, OrderSource, OrderStatus } from '../types';
import { supabase } from '../services/supabase';
import { getGoogleApiKey, addOrder, getOrders, updateOrderStatus, deleteOrder, getMenuItems } from '../services/storageService';

// COSTANTI E CONFIGURAZIONI DELLE PIATTAFORME
const PLATFORMS: Record<string, { label: string, color: string, iconStr: string, bg: string, border: string }> = {
    'just-eat': { label: 'Just Eat', color: '#ff8000', iconStr: 'JE', bg: 'bg-orange-500', border: 'border-orange-500' },
    'glovo': { label: 'Glovo', color: '#facd3d', iconStr: 'GL', bg: 'bg-yellow-400', border: 'border-yellow-400' },
    'deliveroo': { label: 'Deliveroo', color: '#00ccbc', iconStr: 'DE', bg: 'bg-teal-500', border: 'border-teal-500' },
    'uber-eats': { label: 'Uber Eats', color: '#06c167', iconStr: 'UE', bg: 'bg-green-500', border: 'border-green-500' },
    'phone': { label: 'Telefono', color: '#3b82f6', iconStr: 'TEL', bg: 'bg-blue-500', border: 'border-blue-500' },
    'takeaway': { label: 'Asporto', color: '#8b5cf6', iconStr: 'ASP', bg: 'bg-purple-500', border: 'border-purple-500' },
};

interface DeliveryManagerProps {
    onExit: () => void;
    menuItems: MenuItem[];
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function DeliveryManager({ onExit, menuItems: propMenuItems, showToast }: DeliveryManagerProps) {
    // Usa lo stato locale per i menu items per garantire caricamento indipendente dal padre
    const [menuItems, setMenuItems] = useState<MenuItem[]>(propMenuItems.length > 0 ? propMenuItems : []);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);

    // STATO DEL NUOVO ORDINE
    const [newOrderSource, setNewOrderSource] = useState<OrderSource>('just-eat');
    const [newOrderPlatformId, setNewOrderPlatformId] = useState('');
    const [newOrderCustomer, setNewOrderCustomer] = useState('');
    const [newOrderAddress, setNewOrderAddress] = useState('');
    const [newOrderPhone, setNewOrderPhone] = useState('');
    const [newOrderTime, setNewOrderTime] = useState('');
    const [newOrderNotes, setNewOrderNotes] = useState('');
    const [newOrderItems, setNewOrderItems] = useState<{ item: MenuItem; quantity: number; notes?: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('TUTTI');

    // FILTRO VISTE COLONNE
    const [viewMode, setViewMode] = useState<'columns' | 'list'>('columns');
    const [filterPlatform, setFilterPlatform] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<'urgency' | 'platform'>('urgency');

    // AI SCAN STATE
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{
        orderId?: string;
        items: { name: string; quantity: number; price?: number }[];
        total?: number;
        deliveryTime?: string;
        customerName?: string;
        customerAddress?: string;
        notes?: string;
    } | null>(null);
    const [scanPlatform, setScanPlatform] = useState<OrderSource>('just-eat');
    const [showScanResult, setShowScanResult] = useState(false);
    const scanInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
        setMenuItems(getMenuItems());

        const handleStorageUpdate = () => loadData();
        const handleMenuUpdate = () => setMenuItems(getMenuItems());

        window.addEventListener('local-storage-update', handleStorageUpdate);
        window.addEventListener('local-menu-update', handleMenuUpdate);

        return () => {
            window.removeEventListener('local-storage-update', handleStorageUpdate);
            window.removeEventListener('local-menu-update', handleMenuUpdate);
        };
    }, []);

    const loadData = () => {
        const allOrders = getOrders();
        // Filtriamo solo ordini attivi e pertinenti al delivery (o che hanno un source definito)
        // Nota: tableNumber 'Standard' sono tavoli. Delivery hanno prefisso o source.
        const deliveryOrders = allOrders.filter(o => {
            if (o.status === OrderStatus.DELIVERED) return false;

            // Logica per identificare ordini delivery
            const isDeliveryTable = o.tableNumber && (o.tableNumber.startsWith('DEL_') || o.tableNumber.startsWith('ASP_'));

            // Se abbiamo source salvato in locale (anche se non su db), usiamolo
            const hasSource = (o as any).source !== undefined;

            // Fallback: se ha items ma un tableNumber strano, vediamo se è un tavolo numerico (sala)
            const isNumericTable = !isNaN(Number(o.tableNumber));

            return isDeliveryTable || hasSource || !isNumericTable;
        }).sort((a, b) => b.timestamp - a.timestamp);

        setOrders(deliveryOrders);
    };

    // Manteniamo fetchOrders per i riferimenti esistenti ma lo facciamo puntare a loadData o lo rimuoviamo se possibile
    const fetchOrders = loadData;

    // --- LOGICA CREAZIONE ORDINE ---

    const addToOrder = (item: MenuItem) => {
        setNewOrderItems(prev => {
            const existing = prev.find(p => p.item.id === item.id);
            if (existing) {
                return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const removeFromOrder = (index: number) => {
        setNewOrderItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, delta: number) => {
        setNewOrderItems(prev => {
            const updated = [...prev];
            updated[index].quantity += delta;
            if (updated[index].quantity <= 0) return prev.filter((_, i) => i !== index);
            return updated;
        });
    };

    const handleCreateOrder = async () => {
        if (newOrderItems.length === 0) {
            showToast('Aggiungi almeno un piatto!', 'error');
            return;
        }

        try {
            const isTakeaway = newOrderSource === 'takeaway' || newOrderSource === 'phone';
            const prefix = isTakeaway ? 'ASP' : 'DEL';
            const displayId = newOrderPlatformId || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }).replace(':', '');

            // Costruiamo un "tableNumber" fittizio per retrocompatibilità coi display cucina
            const tableId = `${prefix}_${newOrderSource.toUpperCase()}_${displayId}`;

            const finalItems: OrderItem[] = newOrderItems.map(i => ({
                menuItem: i.item,
                quantity: i.quantity,
                notes: i.notes || ''
            }));

            // Generate unique ID
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const orderId = `delivery_${Date.now()}_${randomSuffix}`;

            const newOrder: Order = {
                id: orderId,
                tableNumber: tableId,
                items: finalItems,
                status: OrderStatus.PENDING,
                timestamp: Date.now(),
                createdAt: Date.now(),
                waiterName: `${PLATFORMS[newOrderSource]?.label || 'Delivery'}${newOrderCustomer ? ` - ${newOrderCustomer}` : ''}`,
                customerName: newOrderCustomer,
                customerAddress: newOrderAddress,
                customerPhone: newOrderPhone,
                deliveryTime: newOrderTime, // Importante per urgenza!
                deliveryNotes: newOrderNotes,
                notes: `Cliente: ${newOrderCustomer || 'N/A'}, Tel: ${newOrderPhone || 'N/A'}, Indirizzo: ${newOrderAddress || 'N/A'}, Note: ${newOrderNotes || ''}, Orario: ${newOrderTime || 'ASAP'}` // Fallback notes
            };

            console.log('Creating order via addOrder:', newOrder);

            await addOrder(newOrder);

            const platformLabel = PLATFORMS[newOrderSource]?.label || newOrderSource;
            showToast(`✅ Ordine ${platformLabel} #${displayId} creato con successo!`, 'success');

            // Reset e chiudi
            setIsCreatingOrder(false);
            setNewOrderItems([]);
            setNewOrderPlatformId('');
            setNewOrderCustomer('');
            setNewOrderAddress('');
            setNewOrderPhone('');
            setNewOrderTime('');
            setNewOrderNotes('');
            fetchOrders();
        } catch (error: any) {
            console.error('Order creation error:', error);
            showToast(`Errore: ${error.message || 'Errore sconosciuto'}`, 'error');
        }
    };

    const updateStatus = async (orderId: string, status: string) => {
        updateOrderStatus(orderId, status as OrderStatus);
        // fetchOrders() non serve perché siamo in ascolto dell'evento
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (confirm("Sei sicuro di voler eliminare questo ordine?")) {
            deleteOrder(orderId);
        }
    };

    // --- AI SCAN RECEIPT ---
    const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const apiKey = getGoogleApiKey();
        if (!apiKey) {
            showToast('Configura la API Key di Google AI nelle impostazioni!', 'error');
            return;
        }

        setIsScanning(true);
        showToast('Analisi scontrino in corso...', 'info');

        try {
            // Convert to base64
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];

                const prompt = `Analizza questa immagine di uno scontrino/ordine delivery e estrai i dati in formato JSON.
                
Estrai:
- orderId: numero/codice ordine se presente
- items: array di oggetti con { name: nome piatto, quantity: quantità, price: prezzo unitario se visibile }
- total: totale ordine se visibile
- deliveryTime: orario di consegna richiesto se presente
- customerName: nome cliente se presente
- customerAddress: indirizzo se presente
- notes: eventuali note speciali

Rispondi SOLO con il JSON valido, senza markdown o altro testo.
Se un campo non è presente, omettilo.

Esempio output:
{"orderId":"123","items":[{"name":"Pizza Margherita","quantity":2,"price":8.00}],"total":16.00}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inlineData: { mimeType: file.type, data: base64 } }
                            ]
                        }]
                    })
                });

                const data = await response.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

                // Parse JSON from response
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    setScanResult({
                        orderId: parsed.orderId,
                        items: parsed.items || [],
                        total: parsed.total,
                        deliveryTime: parsed.deliveryTime,
                        customerName: parsed.customerName,
                        customerAddress: parsed.customerAddress,
                        notes: parsed.notes
                    });
                    setShowScanResult(true);
                    showToast(`✨ Trovati ${parsed.items?.length || 0} prodotti!`, 'success');
                } else {
                    showToast('Impossibile estrarre dati dallo scontrino', 'error');
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Scan error:', error);
            showToast('Errore durante la scansione', 'error');
        } finally {
            setIsScanning(false);
            if (scanInputRef.current) scanInputRef.current.value = '';
        }
    };

    const handleCreateOrderFromScan = async () => {
        if (!scanResult || scanResult.items.length === 0) return;

        try {
            const isTakeaway = scanPlatform === 'takeaway' || scanPlatform === 'phone';
            const prefix = isTakeaway ? 'ASP' : 'DEL';
            const displayId = scanResult.orderId || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }).replace(':', '');
            const tableId = `${prefix}_${scanPlatform.toUpperCase()}_${displayId}`;

            // Match scanned items with menu items
            const finalItems: OrderItem[] = scanResult.items.map(scannedItem => {
                // Try to find matching menu item
                const matchedMenuItem = menuItems.find(m =>
                    m.name.toLowerCase().includes(scannedItem.name.toLowerCase()) ||
                    scannedItem.name.toLowerCase().includes(m.name.toLowerCase())
                );

                const menuItem: MenuItem = matchedMenuItem || {
                    id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: scannedItem.name,
                    price: scannedItem.price || 0,
                    category: Category.PRIMI // Default category
                };

                return {
                    menuItem,
                    quantity: scannedItem.quantity,
                    notes: ''
                };
            });

            // Generate unique ID
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const orderId = `scan_${Date.now()}_${randomSuffix}`;

            const newOrder: Order = {
                id: orderId,
                tableNumber: tableId,
                items: finalItems,
                status: OrderStatus.PENDING,
                timestamp: Date.now(),
                createdAt: Date.now(),
                waiterName: `AI Scan - ${PLATFORMS[scanPlatform]?.label || scanPlatform}`
            };

            await addOrder(newOrder);

            const platformLabel = PLATFORMS[scanPlatform]?.label || scanPlatform;
            showToast(`✅ Ordine ${platformLabel} creato da scansione AI!`, 'success');
            setShowScanResult(false);
            setScanResult(null);
            fetchOrders();
        } catch (error: any) {
            showToast(`Errore: ${error.message || 'Errore sconosciuto'}`, 'error');
        }
    };

    const getTotal = (orderItems: any[]) => {
        return orderItems.reduce((sum, i) => sum + (i.menuItem.price * i.quantity), 0);
    };

    const getUrgencyStatus = (order: Order) => {
        let deliveryTimeStr = order.deliveryTime;
        // Parse delivery time from notes if not in field
        if (!deliveryTimeStr && order.notes) {
            const timeMatch = order.notes.match(/Orario:\s*(\d{2}:\d{2})/);
            if (timeMatch) deliveryTimeStr = timeMatch[1];
        }

        if (deliveryTimeStr) {
            const [hours, minutes] = deliveryTimeStr.split(':').map(Number);
            const now = new Date();
            const deliveryDate = new Date();
            deliveryDate.setHours(hours, minutes, 0, 0);

            // Handle next day (naive)
            if (now.getHours() > 22 && hours < 3) deliveryDate.setDate(now.getDate() + 1);

            const diffMinutes = (deliveryDate.getTime() - now.getTime()) / 60000;
            const diff = Math.ceil(diffMinutes);

            if (diff <= 15 && diff > -60) return { status: 'urgent', color: 'text-red-500', bg: 'bg-red-900/40 border-red-500 animate-pulse', label: `URGENTE (${diff}m)`, time: deliveryTimeStr };
            if (diff <= 30) return { status: 'warning', color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-500/50', label: `ATTENZIONE (${diff}m)`, time: deliveryTimeStr };
            return { status: 'normal', color: 'text-blue-400', bg: 'bg-slate-800/80 border-slate-700', label: `Tra ${diff}m`, time: deliveryTimeStr };
        }
        return null;
    };

    // RENDER DELLA COLONNA PIATTAFORMA
    const renderPlatformColumn = (platformKey: string) => {
        const platform = PLATFORMS[platformKey];
        // Filter orders by tableNumber pattern (e.g., DEL_JUST-EAT_123 or ASP_PHONE_456)
        const platformOrders = orders.filter(o => {
            const table = o.tableNumber?.toUpperCase() || '';
            return table.includes(platformKey.toUpperCase().replace('-', '_')) ||
                table.includes(platformKey.toUpperCase());
        });

        return (
            <div className="flex flex-col h-full min-w-[300px] max-w-[320px] bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm overflow-hidden">
                {/* Header Colonna */}
                <div className={`p-4 ${platform.bg} text-slate-900 border-b ${platform.border}`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 font-black uppercase tracking-wider">
                            <span className="bg-white/20 p-1.5 rounded-lg text-xs backdrop-blur-md">{platform.iconStr}</span>
                            {platform.label}
                        </div>
                        <span className="bg-slate-900/20 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold">{platformOrders.length}</span>
                    </div>
                </div>

                {/* Lista Ordini */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scroll">
                    {platformOrders.length === 0 && (
                        <div className="text-center py-10 text-slate-600 opacity-50">
                            <ShoppingBag className="mx-auto mb-2" size={32} />
                            <p className="text-xs">Nessun ordine</p>
                        </div>
                    )}
                    {platformOrders.map(order => {
                        const urgency = getUrgencyStatus(order);
                        const cardBg = urgency?.status === 'urgent' ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-800 border-slate-700';

                        return (
                            <div key={order.id} className={`${cardBg} rounded-xl p-4 border shadow-lg group hover:border-slate-500 transition-all relative overflow-hidden`}>

                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-white text-lg flex items-center gap-2">
                                            #{order.tableNumber?.split('_').pop() || order.id.slice(-6)}
                                        </p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            Entrata: {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {urgency && (
                                            <p className={`text-xs font-bold mt-1 ${urgency.color} flex items-center gap-1`}>
                                                {urgency.status === 'urgent' && <AlertTriangle size={12} />}
                                                Consegna: {urgency.time}
                                            </p>
                                        )}
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'Servito' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'}`}>
                                        {order.status}
                                    </div>
                                </div>

                                {/* Dati Cliente */}
                                {(order.customerName || order.customerAddress) && (
                                    <div className="bg-slate-900/50 p-2 rounded-lg mb-3 border border-slate-700/50">
                                        {order.customerName && <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5"><User size={12} className="text-slate-500" /> {order.customerName}</p>}
                                        {order.customerAddress && <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1"><MapPin size={12} className="text-slate-500" /> {order.customerAddress}</p>}
                                        {order.deliveryNotes && <p className="text-[10px] text-yellow-500/80 mt-1 italic pl-4 border-l-2 border-yellow-500/30">"{order.deliveryNotes}"</p>}
                                    </div>
                                )}

                                {/* Items Preview */}
                                <div className="space-y-1 mb-3">
                                    {order.items.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-slate-300">
                                            <span><span className="font-bold text-slate-500">{item.quantity}x</span> {item.menuItem.name}</span>
                                        </div>
                                    ))}
                                    {order.items.length > 4 && <p className="text-[10px] text-slate-500 text-center">+ altri {order.items.length - 4} prodotti</p>}
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                                    <span className="font-black text-white text-lg">€ {order.items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0).toFixed(2)}</span>

                                    <div className="flex items-center gap-2">
                                        {order.status === 'In Attesa' && (
                                            <button onClick={() => updateStatus(order.id, 'In Preparazione')} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors">
                                                INIZIA
                                            </button>
                                        )}
                                        {order.status === 'In Preparazione' && (
                                            <button onClick={() => updateStatus(order.id, 'Pronto')} className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors">
                                                PRONTO
                                            </button>
                                        )}
                                        {order.status === 'Pronto' && (
                                            <button onClick={() => updateStatus(order.id, 'Servito')} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                                                <Bike size={14} /> AFFIDA
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteOrder(order.id)} className="text-slate-500 hover:text-red-500 transition-colors p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- MODALE NUOVO ORDINE DELIVERY ---
    const renderNewOrderModal = () => (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 w-full max-w-6xl h-[90vh] rounded-[2rem] border border-slate-700 flex overflow-hidden shadow-2xl relative">

                {/* SINISTRA: MENU SELECTION */}
                <div className="w-2/3 border-r border-slate-800 flex flex-col p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <ChefHat className="text-blue-500" /> Seleziona Piatti
                        </h2>
                        {/* Categorie */}
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scroll">
                            <button onClick={() => setSelectedCategory('TUTTI')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === 'TUTTI' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>TUTTI</button>
                            {Object.values(Category).map(cat => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>

                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input type="text" placeholder="Cerca piatto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scroll flex-1 content-start">
                        {menuItems
                            .filter(m => selectedCategory === 'TUTTI' || m.category === selectedCategory)
                            .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(item => (
                                <button key={item.id} onClick={() => addToOrder(item)} className="bg-slate-800 border-2 border-transparent hover:border-blue-500 p-4 rounded-2xl text-left transition-all active:scale-95 flex flex-col justify-between min-h-[120px]">
                                    <div>
                                        <h4 className="font-bold text-white leading-tight mb-1">{item.name}</h4>
                                        <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                                    </div>
                                    <div className="flex justify-between items-end mt-3">
                                        <span className="font-mono font-bold text-blue-400">€ {item.price.toFixed(2)}</span>
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white"><Plus size={16} /></div>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>

                {/* DESTRA: RIEPILOGO ORDINE */}
                <div className="w-1/3 flex flex-col bg-slate-950">
                    <div className="p-6 border-b border-slate-800 bg-slate-900">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Nuovo Ordine</h3>
                            <button onClick={() => setIsCreatingOrder(false)} className="bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>

                        {/* Selezione Sorgente */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {Object.entries(PLATFORMS).map(([key, p]) => (
                                <button
                                    key={key}
                                    onClick={() => setNewOrderSource(key as OrderSource)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${newOrderSource === key ? `${p.border} ${p.bg} text-white` : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600'}`}
                                >
                                    <span className="text-[10px] font-black uppercase">{p.iconStr}</span>
                                </button>
                            ))}
                        </div>

                        {/* Dati Ordine Form */}
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input type="text" value={newOrderPlatformId} onChange={e => setNewOrderPlatformId(e.target.value)} placeholder={newOrderSource === 'table' ? 'Tavolo' : "ID Ordine (es. #123)"} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                                <input type="time" value={newOrderTime} onChange={e => setNewOrderTime(e.target.value)} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-blue-500" />
                            </div>
                            <input type="text" value={newOrderCustomer} onChange={e => setNewOrderCustomer(e.target.value)} placeholder="Nome Cliente" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                            {(newOrderSource === 'takeaway' || newOrderSource === 'phone') && (
                                <>
                                    <input type="text" value={newOrderPhone} onChange={e => setNewOrderPhone(e.target.value)} placeholder="Telefono" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                                    <input type="text" value={newOrderAddress} onChange={e => setNewOrderAddress(e.target.value)} placeholder="Indirizzo Consegna" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                                </>
                            )}
                            <input type="text" value={newOrderNotes} onChange={e => setNewOrderNotes(e.target.value)} placeholder="Note (citofono, resto...)" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                        </div>
                    </div>

                    {/* Lista Carrello */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scroll">
                        {newOrderItems.length === 0 ? (
                            <div className="text-center text-slate-600 mt-10">
                                <ShoppingBag className="mx-auto mb-2 opacity-50" size={32} />
                                <p className="text-sm">Carrello vuoto</p>
                            </div>
                        ) : (
                            newOrderItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-1">
                                            <button onClick={() => updateQuantity(idx, -1)} className="p-1 hover:text-white text-slate-500">-</button>
                                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(idx, 1)} className="p-1 hover:text-white text-slate-500">+</button>
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 truncate max-w-[120px]">{item.item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-white">€ {(item.item.price * item.quantity).toFixed(2)}</span>
                                        <button onClick={() => removeFromOrder(idx)} className="text-slate-600 hover:text-red-500"><X size={14} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Totale */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-400 uppercase text-xs font-bold">Totale Stimato</span>
                            <span className="text-3xl font-black text-white">€ {newOrderItems.reduce((s, i) => s + (i.item.price * i.quantity), 0).toFixed(2)}</span>
                        </div>
                        <button onClick={handleCreateOrder} disabled={newOrderItems.length === 0} className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                            <CheckCircle size={20} /> CONFERMA ORDINE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const getOrderPlatform = (order: Order) => {
        const table = order.tableNumber?.toUpperCase() || '';
        // Cerca la chiave della piattaforma nel tableNumber
        const foundKey = Object.keys(PLATFORMS).find(key =>
            table.includes(key.toUpperCase().replace('-', '_')) ||
            table.includes(key.toUpperCase())
        );
        return foundKey || 'phone'; // Default
    };

    const renderListView = () => {
        // LOGICA DI FILTRO E ORDINAMENTO
        let processedOrders = [...orders];

        // 1. Filtro per Piattaforma
        if (filterPlatform !== 'ALL') {
            processedOrders = processedOrders.filter(o => getOrderPlatform(o) === filterPlatform);
        }

        // 2. Ordinamento
        processedOrders.sort((a, b) => {
            if (sortBy === 'urgency') {
                const getMinutesMissing = (order: Order) => {
                    let deliveryTimeStr = order.deliveryTime;
                    if (!deliveryTimeStr && order.notes) {
                        const timeMatch = order.notes.match(/Orario:\s*(\d{2}:\d{2})/);
                        if (timeMatch) deliveryTimeStr = timeMatch[1];
                    }
                    if (!deliveryTimeStr) return 999999; // Non urgenti in fondo
                    const [hours, minutes] = deliveryTimeStr.split(':').map(Number);
                    const now = new Date();
                    let deliveryDate = new Date();
                    deliveryDate.setHours(hours, minutes, 0, 0);
                    // Gestione scollinamento notte (se ora sono le 23 e l'ordine è per l'1, è domani)
                    if (now.getHours() > 20 && hours < 5) deliveryDate.setDate(now.getDate() + 1);
                    return deliveryDate.getTime() - now.getTime();
                };
                return getMinutesMissing(a) - getMinutesMissing(b);
            } else {
                // Raggruppa per piattaforma
                const pA = getOrderPlatform(a);
                const pB = getOrderPlatform(b);
                return pA.localeCompare(pB);
            }
        });

        return (
            <div className="w-full h-full flex flex-col gap-4">
                {/* TOOLBAR FILTRI */}
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
                    {/* Filtro Piattaforme */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar mask-gradient-right">
                        <Filter size={16} className="text-slate-500 mr-2 shrink-0" />
                        <button
                            onClick={() => setFilterPlatform('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${filterPlatform === 'ALL' ? 'bg-white text-slate-900 border-white' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'}`}
                        >
                            TUTTI
                        </button>
                        {Object.entries(PLATFORMS).map(([key, p]) => (
                            <button
                                key={key}
                                onClick={() => setFilterPlatform(key)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${filterPlatform === key ? `${p.bg} text-white ${p.border}` : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}
                            >
                                <span className="font-black">{p.iconStr}</span>
                                <span className="hidden sm:inline">{p.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Ordinamento */}
                    <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                        <button
                            onClick={() => setSortBy('urgency')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${sortBy === 'urgency' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Clock size={12} /> Urgenza
                        </button>
                        <button
                            onClick={() => setSortBy('platform')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${sortBy === 'platform' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LayoutGrid size={12} /> Gruppo
                        </button>
                    </div>
                </div>

                {/* LISTA ORDINI */}
                <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm overflow-hidden flex flex-col relative">
                    {/* Header Tabella */}
                    <div className="grid grid-cols-6 gap-4 p-4 bg-slate-950/50 text-slate-400 text-xs font-bold uppercase border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                        <div className="col-span-1">Piattaforma</div>
                        <div className="col-span-1">ID / Orario</div>
                        <div className="col-span-1">Cliente</div>
                        <div className="col-span-2">Dettagli Ordine</div>
                        <div className="col-span-1 text-right">Stato & Azioni</div>
                    </div>

                    {/* Contenuto Scrollabile */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scroll">
                        {processedOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-500 opacity-60">
                                <Filter size={48} className="mb-2" />
                                <p>Nessun ordine trovato con questi filtri</p>
                            </div>
                        ) : (
                            processedOrders.map(order => {
                                const platformKey = getOrderPlatform(order);
                                const platform = PLATFORMS[platformKey];
                                return (
                                    <div key={order.id} className="grid grid-cols-6 gap-4 p-4 bg-slate-800/50 rounded-xl items-center border border-slate-700/50 hover:border-slate-600 transition-all animate-fade-in">
                                        {/* Piattaforma */}
                                        <div className="col-span-1 flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${platform?.bg || 'bg-slate-700'} text-slate-900 border border-white/10 shadow-lg`}>
                                                {platform?.iconStr || '?'}
                                            </div>
                                            <span className="font-bold text-white text-sm hidden xl:block">{platform?.label}</span>
                                        </div>

                                        {/* ID e Orario */}
                                        <div className="col-span-1">
                                            <p className="font-bold text-white">#{order.tableNumber?.split('_').pop() || order.id.slice(-6)}</p>
                                            {(() => {
                                                const urgency = getUrgencyStatus(order);
                                                return (
                                                    <>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                            <Clock size={12} /> Ent: {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {urgency && (
                                                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded w-max ${urgency.bg} ${urgency.color} border`}>
                                                                {urgency.status === 'urgent' && <AlertTriangle size={10} />}
                                                                {urgency.time} ({urgency.label})
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Cliente */}
                                        <div className="col-span-1">
                                            {order.customerName ? (
                                                <>
                                                    <p className="font-bold text-slate-200 text-sm truncate">{order.customerName}</p>
                                                    <p className="text-xs text-slate-500 truncate">{order.customerAddress}</p>
                                                </>
                                            ) : <span className="text-slate-600 italic">--</span>}
                                        </div>

                                        {/* Dettagli */}
                                        <div className="col-span-2">
                                            <p className="text-sm text-slate-300 truncate">
                                                {order.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 font-bold">
                                                Totale: € {order.items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0).toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Azioni */}
                                        <div className="col-span-1 flex justify-end items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase mr-2 border ${order.status === 'Servito' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                                                {order.status}
                                            </span>

                                            {order.status === 'In Attesa' && (
                                                <button onClick={() => updateStatus(order.id, 'In Preparazione')} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg hover:scale-105 transition-all" title="Inizia Preparazione">
                                                    <ChefHat size={16} />
                                                </button>
                                            )}
                                            {order.status === 'In Preparazione' && (
                                                <button onClick={() => updateStatus(order.id, 'Pronto')} className="p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg shadow-lg hover:scale-105 transition-all" title="Segna come Pronto">
                                                    <ShoppingBag size={16} />
                                                </button>
                                            )}
                                            {order.status === 'Pronto' && (
                                                <button onClick={() => updateStatus(order.id, 'Servito')} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-lg hover:scale-105 transition-all" title="Affida al Rider">
                                                    <Bike size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-950/30 rounded-lg transition-colors" title="Elimina Ordine">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 font-sans flex flex-col relative overflow-hidden">
            {/* HEADER - Same style as KitchenDisplay */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-green-600">
                        <Bike className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Risto<span className="text-green-500">Sync</span><span className="text-blue-500 font-black ml-1">AI</span></h1>
                        <p className="text-slate-400 text-xs uppercase font-semibold">Delivery & Asporto</p>
                    </div>
                    <div className="ml-4 flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => setViewMode('columns')} className={`px-6 py-2 rounded-md font-bold text-sm uppercase transition-all ${viewMode === 'columns' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Colonne</button>
                        <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-md font-bold text-sm uppercase transition-all ${viewMode === 'list' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Lista</button>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {/* SCAN AI BUTTON */}
                    <input
                        ref={scanInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleScanReceipt}
                        className="hidden"
                    />
                    <button
                        onClick={() => scanInputRef.current?.click()}
                        disabled={isScanning}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95"
                    >
                        {isScanning ? <Loader size={18} className="animate-spin" /> : <Camera size={18} />}
                        {isScanning ? 'Analisi...' : 'SCANSIONA'}
                    </button>
                    <button onClick={() => setIsCreatingOrder(true)} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Plus size={18} /> NUOVO ORDINE
                    </button>
                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                        <span className="text-2xl font-mono font-bold text-green-400">{new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <button onClick={onExit} className="bg-slate-800 text-slate-400 hover:text-white p-2.5 rounded-lg"><LogOut size={20} /></button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-hidden p-6 relative">
                {/* Separator Line with Gradient */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-50"></div>

                {viewMode === 'columns' ? (
                    <div className="h-full overflow-x-auto [transform:rotateX(180deg)] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-800/20 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-500/80 transition-colors cursor-w-resize">
                        <div className="h-full flex gap-4 min-w-max [transform:rotateX(180deg)] pt-2 pb-0 px-1">
                            {Object.keys(PLATFORMS).map(key => renderPlatformColumn(key))}
                        </div>
                    </div>
                ) : (
                    renderListView()
                )}
            </div>

            {isCreatingOrder && renderNewOrderModal()}

            {/* SCAN RESULT MODAL */}
            {showScanResult && scanResult && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-purple-900/50 to-slate-900 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                                    <Sparkles size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">Ordine Rilevato</h2>
                                    <p className="text-purple-400 text-xs font-bold">Analisi AI completata</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowScanResult(false); setScanResult(null); }} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Platform Selector */}
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Seleziona Piattaforma</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(PLATFORMS).map(([key, platform]) => (
                                        <button
                                            key={key}
                                            onClick={() => setScanPlatform(key as OrderSource)}
                                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${scanPlatform === key ? `${platform.bg} border-white text-white` : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            <span className="font-black text-lg">{platform.iconStr}</span>
                                            <span className="text-[10px] uppercase font-bold">{platform.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Order Details */}
                            {scanResult.orderId && (
                                <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-xl">
                                    <span className="text-slate-500 text-xs uppercase font-bold">ID Ordine:</span>
                                    <span className="text-white font-bold">{scanResult.orderId}</span>
                                </div>
                            )}

                            {/* Items */}
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Prodotti ({scanResult.items.length})</label>
                                <div className="space-y-2">
                                    {scanResult.items.map((item, idx) => (
                                        <div key={idx} className="bg-slate-800 p-3 rounded-xl flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">{item.quantity}x</span>
                                                <span className="text-white font-medium">{item.name}</span>
                                            </div>
                                            {item.price !== undefined && (
                                                <span className="text-green-400 font-bold">€ {item.price.toFixed(2)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Extra Info */}
                            {(scanResult.customerName || scanResult.customerAddress || scanResult.deliveryTime) && (
                                <div className="space-y-2">
                                    {scanResult.customerName && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <User size={14} className="text-slate-500" />
                                            <span className="text-slate-400">{scanResult.customerName}</span>
                                        </div>
                                    )}
                                    {scanResult.customerAddress && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin size={14} className="text-slate-500" />
                                            <span className="text-slate-400">{scanResult.customerAddress}</span>
                                        </div>
                                    )}
                                    {scanResult.deliveryTime && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock size={14} className="text-slate-500" />
                                            <span className="text-slate-400">{scanResult.deliveryTime}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Total */}
                            {scanResult.total !== undefined && (
                                <div className="bg-green-900/30 border border-green-500/30 p-4 rounded-xl flex justify-between items-center">
                                    <span className="text-green-400 uppercase text-xs font-bold">Totale Ordine</span>
                                    <span className="text-3xl font-black text-green-400">€ {scanResult.total.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-950 border-t border-slate-800">
                            <button
                                onClick={handleCreateOrderFromScan}
                                disabled={scanResult.items.length === 0}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} /> CREA ORDINE DA SCANSIONE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
