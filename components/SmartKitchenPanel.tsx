import React from 'react';
import { Order, OrderItem, MenuItem, Department, OrderStatus } from '../types';
import { Clock, Flame, Users, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

interface SmartKitchenPanelProps {
    isOpen: boolean;
    onClose: () => void;
    orders: Order[];
    department: Department;
    allMenuItems: MenuItem[];
}

interface AggregatedDish {
    dishName: string;
    totalQuantity: number;
    orders: { orderId: string, tableNumber: string, quantity: number }[];
    estimatedCookTime: number; // minutes
    urgency: 'low' | 'medium' | 'high' | 'critical';
    syncDepartments: string[];
}

interface CookingSuggestion {
    priority: number;
    action: string;
    reason: string;
    dishes: string[];
    color: string;
}

export const SmartKitchenPanel: React.FC<SmartKitchenPanelProps> = ({
    isOpen,
    onClose,
    orders,
    department,
    allMenuItems
}) => {

    // COOKING TIME DATABASE (minutes)
    const COOK_TIMES: Record<string, number> = {
        // Pizze
        'PIZZA': 8,
        'MARGHERITA': 8,
        'DIAVOLA': 8,
        'QUATTRO STAGIONI': 10,

        // Primi
        'PASTA': 12,
        'SPAGHETTI': 12,
        'CARBONARA': 12,
        'AMATRICIANA': 12,
        'RISOTTO': 18,

        // Secondi
        'BISTECCA': 15,
        'TAGLIATA': 15,
        'GRIGLIATA': 20,
        'PESCE': 12,

        // Antipasti
        'BRUSCHETTA': 5,
        'TAGLIERE': 3,
        'FRITTO': 8,

        // Default
        'DEFAULT': 10
    };

    const getCookTime = (dishName: string): number => {
        const upper = dishName.toUpperCase();
        for (const [key, time] of Object.entries(COOK_TIMES)) {
            if (upper.includes(key)) return time;
        }
        return COOK_TIMES.DEFAULT;
    };

    // AGGREGATE DISHES
    const aggregateDishes = (): AggregatedDish[] => {
        const dishMap = new Map<string, AggregatedDish>();

        orders.forEach(order => {
            if (order.status === OrderStatus.DELIVERED) return;

            order.items.forEach(item => {
                if (item.isSeparator || item.completed) return;

                const dishName = item.menuItem.name;
                const cookTime = getCookTime(dishName);

                // Calculate urgency based on order age
                const orderAge = (Date.now() - order.timestamp) / 60000; // minutes
                let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
                if (orderAge > 25) urgency = 'critical';
                else if (orderAge > 15) urgency = 'high';
                else if (orderAge > 8) urgency = 'medium';

                if (dishMap.has(dishName)) {
                    const existing = dishMap.get(dishName)!;
                    existing.totalQuantity += item.quantity;
                    existing.orders.push({
                        orderId: order.id,
                        tableNumber: order.tableNumber,
                        quantity: item.quantity
                    });
                    // Upgrade urgency if needed
                    if (urgency === 'critical' || (urgency === 'high' && existing.urgency !== 'critical')) {
                        existing.urgency = urgency;
                    }
                } else {
                    dishMap.set(dishName, {
                        dishName,
                        totalQuantity: item.quantity,
                        orders: [{
                            orderId: order.id,
                            tableNumber: order.tableNumber,
                            quantity: item.quantity
                        }],
                        estimatedCookTime: cookTime,
                        urgency,
                        syncDepartments: [] // TODO: detect sync needs
                    });
                }
            });
        });

        return Array.from(dishMap.values()).sort((a, b) => {
            // Sort by urgency first, then by cook time
            const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            }
            return b.estimatedCookTime - a.estimatedCookTime;
        });
    };

    // GENERATE AI SUGGESTIONS
    const generateSuggestions = (dishes: AggregatedDish[]): CookingSuggestion[] => {
        const suggestions: CookingSuggestion[] = [];

        // Suggestion 1: Start long-cooking items first
        const longCookDishes = dishes.filter(d => d.estimatedCookTime >= 15);
        if (longCookDishes.length > 0) {
            suggestions.push({
                priority: 1,
                action: 'Inizia subito i piatti a lunga cottura',
                reason: `Tempo stimato: ${longCookDishes[0].estimatedCookTime} min`,
                dishes: longCookDishes.slice(0, 3).map(d => `${d.totalQuantity}x ${d.dishName}`),
                color: 'bg-orange-500'
            });
        }

        // Suggestion 2: Critical urgency items
        const criticalDishes = dishes.filter(d => d.urgency === 'critical');
        if (criticalDishes.length > 0) {
            suggestions.push({
                priority: 0,
                action: '⚠️ URGENTE: Ordini in ritardo',
                reason: 'Attesa > 25 minuti',
                dishes: criticalDishes.map(d => `${d.totalQuantity}x ${d.dishName}`),
                color: 'bg-red-600'
            });
        }

        // Suggestion 3: Batch cooking
        const batchable = dishes.filter(d => d.totalQuantity >= 3);
        if (batchable.length > 0) {
            suggestions.push({
                priority: 2,
                action: 'Prepara in batch per efficienza',
                reason: `${batchable[0].totalQuantity} porzioni dello stesso piatto`,
                dishes: batchable.slice(0, 2).map(d => `${d.totalQuantity}x ${d.dishName}`),
                color: 'bg-blue-500'
            });
        }

        return suggestions.sort((a, b) => a.priority - b.priority);
    };

    const aggregated = aggregateDishes();
    const suggestions = generateSuggestions(aggregated);

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'critical': return 'bg-red-500 border-red-600';
            case 'high': return 'bg-orange-500 border-orange-600';
            case 'medium': return 'bg-yellow-500 border-yellow-600';
            default: return 'bg-green-500 border-green-600';
        }
    };

    return (
        <>
            {/* OVERLAY - REMOVED TO KEEP ORDERS VISIBLE */}

            {/* PANEL */}
            <div className={`fixed top-0 right-0 h-full w-[500px] bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 border-b border-blue-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">🧠</span>
                            <div>
                                <h2 className="text-2xl font-black text-white">AI Kitchen Assistant</h2>
                                <p className="text-blue-100 text-sm font-medium">Ottimizzazione Intelligente</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="overflow-y-auto h-[calc(100%-120px)] p-6 space-y-6">

                    {/* AI SUGGESTIONS */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-400" />
                            Suggerimenti AI
                        </h3>
                        <div className="space-y-3">
                            {suggestions.map((sug, idx) => (
                                <div key={idx} className={`${sug.color} p-4 rounded-lg border-2 border-white/20 shadow-lg`}>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center font-black text-white">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-white text-sm mb-1">{sug.action}</h4>
                                            <p className="text-white/80 text-xs mb-2">{sug.reason}</p>
                                            <div className="space-y-1">
                                                {sug.dishes.map((dish, i) => (
                                                    <div key={i} className="text-xs bg-white/10 px-2 py-1 rounded font-mono text-white">
                                                        {dish}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AGGREGATED DISHES */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                            <Users size={20} className="text-purple-400" />
                            Piatti Aggregati ({aggregated.length})
                        </h3>
                        <div className="space-y-2">
                            {aggregated.map((dish, idx) => (
                                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${getUrgencyColor(dish.urgency)}`} />
                                            <span className="text-white font-bold text-sm">{dish.dishName}</span>
                                        </div>
                                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-black">
                                            {dish.totalQuantity}x
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            <span>{dish.estimatedCookTime} min</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Flame size={12} />
                                            <span className="capitalize">{dish.urgency}</span>
                                        </div>
                                    </div>

                                    {/* Tables */}
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {dish.orders.map((ord, i) => (
                                            <span key={i} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                                                {ord.tableNumber} ({ord.quantity}x)
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* FOOTER STATS */}
                <div className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <div className="text-2xl font-black text-blue-400">{aggregated.length}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Piatti Unici</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-purple-400">{aggregated.reduce((sum, d) => sum + d.totalQuantity, 0)}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Porzioni Totali</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-orange-400">{aggregated.filter(d => d.urgency === 'critical' || d.urgency === 'high').length}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Urgenti</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
