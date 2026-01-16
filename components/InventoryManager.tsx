import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Trash2, Edit2, TrendingUp, AlertTriangle, Sparkles, DollarSign, Save, X, Loader, FileText, Upload } from 'lucide-react';
import { InventoryItem } from '../types';
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, getMenuItems, addExpense, syncInventoryDown, getAppSettings, saveAppSettings } from '../services/storageService';
import { askChefAI } from '../services/geminiService';

interface InventoryManagerProps {
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ showToast }) => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [showStockDeliveryModal, setShowStockDeliveryModal] = useState(false);
    const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
    const [deliveryItems, setDeliveryItems] = useState<Array<{ itemId: string; quantity: number; newPrice?: number }>>([]);
    const [deliverySupplier, setDeliverySupplier] = useState('');
    const [deliveryInvoiceNumber, setDeliveryInvoiceNumber] = useState('');
    const [foodCostMarkup, setFoodCostMarkup] = useState(3.5);

    // Form State
    const [formData, setFormData] = useState<Partial<InventoryItem>>({
        name: '',
        category: 'food',
        quantity: 0,
        unit: 'kg',
        costPerUnit: 0,
        supplier: '',
        minQuantity: 0
    });

    useEffect(() => {
        // First sync from cloud, then load local
        const initInventory = async () => {
            await syncInventoryDown();
            loadInventory();
        };
        initInventory();

        const settings = getAppSettings();
        if (settings.foodCostMarkup) {
            setFoodCostMarkup(settings.foodCostMarkup);
        }

        window.addEventListener('local-inventory-update', loadInventory);
        return () => window.removeEventListener('local-inventory-update', loadInventory);
    }, []);

    const loadInventory = () => {
        setItems(getInventory());
    };

    const handleAIImport = async () => {
        setIsImporting(true);
        try {
            const menuItems = getMenuItems();
            if (menuItems.length === 0) {
                showToast('Nessun piatto nel menu da analizzare', 'error');
                setIsImporting(false);
                return;
            }

            // Prepare menu data for AI
            const menuSummary = menuItems.map(item => `${item.name}: ${item.ingredients || 'N/A'}`).join('\n');

            const prompt = `Analizza questo menu di un ristorante e genera una lista di materie prime necessarie in formato JSON.
Per ogni materia prima, specifica:
- name: nome dell'ingrediente (es. "Farina 00", "Olio EVO", "Pomodoro")
- category: "food" o "beverage"
- unit: unità di misura appropriata ("kg", "l", "pz")
- costPerUnit: stima del costo per unità in euro (usa prezzi realistici di mercato)
- supplier: lascia vuoto ""
- quantity: 0
- minQuantity: 0

MENU:
${menuSummary}

Rispondi SOLO con un array JSON valido, senza testo aggiuntivo. Esempio:
[{"name":"Farina 00","category":"food","unit":"kg","costPerUnit":0.80,"supplier":"","quantity":0,"minQuantity":0}]`;

            const response = await askChefAI(prompt, null);

            // Extract JSON from response
            let jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('Formato risposta AI non valido');
            }

            const ingredients = JSON.parse(jsonMatch[0]) as Array<Omit<InventoryItem, 'id' | 'lastRestocked'>>;

            let addedCount = 0;
            for (const ing of ingredients) {
                // Check if ingredient already exists
                const exists = items.some(i => i.name.toLowerCase() === ing.name.toLowerCase());
                if (!exists) {
                    await addInventoryItem({ ...ing, lastRestocked: Date.now() });
                    addedCount++;
                }
            }

            showToast(`✅ Importati ${addedCount} ingredienti dal menu!`, 'success');
            loadInventory();
        } catch (error: any) {
            console.error('AI Import Error:', error);
            showToast(`Errore importazione AI: ${error.message || 'Verifica la tua API Key'}`, 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const handleSave = () => {
        if (!formData.name || !formData.unit) {
            showToast('Compila i campi obbligatori', 'error');
            return;
        }

        if (editingItem) {
            updateInventoryItem(editingItem.id, formData);
            showToast('Articolo aggiornato', 'success');
        } else {
            addInventoryItem(formData as any);
            showToast('Articolo aggiunto', 'success');
        }
        closeModal();
    };

    const handleDelete = (id: string) => {
        if (confirm('Sei sicuro di voler eliminare questo articolo?')) {
            deleteInventoryItem(id);
            showToast('Articolo eliminato', 'success');
        }
    };

    const openEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData(item);
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingItem(null);
        setFormData({
            name: '',
            category: 'food',
            quantity: 0,
            unit: 'kg',
            costPerUnit: 0,
            supplier: '',
            minQuantity: 0
        });
    };

    const handleStockDelivery = () => {
        if (deliveryItems.length === 0) {
            showToast('Aggiungi almeno un prodotto al carico', 'error');
            return;
        }

        // Calculate total cost for expense
        let totalCost = 0;

        // Update inventory quantities and prices
        deliveryItems.forEach(({ itemId, quantity, newPrice }) => {
            const item = items.find(i => i.id === itemId);
            if (item) {
                const price = newPrice || item.costPerUnit || 0;
                totalCost += price * quantity;

                const updates: Partial<InventoryItem> = {
                    quantity: item.quantity + quantity,
                    lastRestocked: Date.now()
                };
                if (newPrice !== undefined && newPrice > 0) {
                    updates.costPerUnit = newPrice;
                }
                if (deliverySupplier) {
                    updates.supplier = deliverySupplier;
                }
                updateInventoryItem(itemId, updates);
            }
        });

        // Register expense if cost > 0
        if (totalCost > 0) {
            addExpense({
                date: Date.now(),
                description: `Carico Merce (${deliveryItems.length} prodotti)`,
                amount: totalCost,
                category: 'inventory',
                supplier: deliverySupplier || undefined,
                invoiceNumber: deliveryInvoiceNumber || undefined,
                notes: deliveryFile ? `File allegato: ${deliveryFile.name}` : undefined
            });
        }

        showToast(`✅ Carico completato! Spesa registrata: € ${totalCost.toFixed(2)}`, 'success');
        setShowStockDeliveryModal(false);
        setDeliveryFile(null);
        setDeliveryItems([]);
        setDeliverySupplier('');
        setDeliveryInvoiceNumber('');
        loadInventory();
    };

    const addDeliveryItem = (itemId: string) => {
        if (deliveryItems.some(d => d.itemId === itemId)) {
            showToast('Prodotto già aggiunto al carico', 'info');
            return;
        }
        setDeliveryItems([...deliveryItems, { itemId, quantity: 1 }]);
    };

    const removeDeliveryItem = (itemId: string) => {
        setDeliveryItems(deliveryItems.filter(d => d.itemId !== itemId));
    };

    const updateDeliveryItemQuantity = (itemId: string, quantity: number) => {
        setDeliveryItems(deliveryItems.map(d =>
            d.itemId === itemId ? { ...d, quantity } : d
        ));
    };

    const updateDeliveryItemPrice = (itemId: string, newPrice: number) => {
        setDeliveryItems(deliveryItems.map(d =>
            d.itemId === itemId ? { ...d, newPrice } : d
        ));
    };

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Package className="text-emerald-500" size={32} />
                        Magazzino & Food Cost
                    </h2>
                    <p className="text-slate-400">Gestisci materie prime, fornitori e costi.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleAIImport}
                        disabled={isImporting}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                    >
                        {isImporting ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isImporting ? 'Analisi in corso...' : 'Importa da Menu (AI)'}
                    </button>
                    <button
                        onClick={() => setShowStockDeliveryModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg font-bold"
                    >
                        <TrendingUp size={18} />
                        Carico Merce
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"
                    >
                        <Plus size={20} />
                        Nuovo Articolo
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <Package size={18} />
                        <span className="text-xs font-bold uppercase">Totale Articoli</span>
                    </div>
                    <p className="text-3xl font-black text-white">{items.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <DollarSign size={18} />
                        <span className="text-xs font-bold uppercase">Valore Magazzino</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-500">
                        € {items.reduce((acc, i) => acc + (i.costPerUnit * i.quantity), 0).toFixed(2)}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <AlertTriangle size={18} />
                        <span className="text-xs font-bold uppercase">Sottoscorta</span>
                    </div>
                    <p className="text-3xl font-black text-orange-500">
                        {items.filter(i => i.quantity <= (i.minQuantity || 0)).length}
                    </p>
                </div>

                {/* Markup Setting Card */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <TrendingUp size={18} className="text-purple-400" />
                        <span className="text-xs font-bold uppercase">Markup Prezzi (x)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            step="0.1"
                            min="1.0"
                            max="10.0"
                            value={foodCostMarkup}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                    setFoodCostMarkup(val);
                                    const settings = getAppSettings();
                                    saveAppSettings({ ...settings, foodCostMarkup: val });
                                }
                            }}
                            className="text-3xl font-black text-purple-400 bg-transparent outline-none w-20 border-b-2 border-slate-800 focus:border-purple-500 transition-colors"
                        />
                        <span className="text-slate-500 text-xs font-medium mt-2">Moltiplicatore<br />Prezzi</span>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Cerca per nome o fornitore..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            {/* Inventory List */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                            <th className="p-4">Articolo</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4">Quantità</th>
                            <th className="p-4">Costo/Unità</th>
                            <th className="p-4">Fornitore</th>
                            <th className="p-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    Nessun articolo trovato. Aggiungine uno nuovo!
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-4">
                                        <p className="font-bold text-white">{item.name}</p>
                                        {(item.quantity <= (item.minQuantity || 0)) && (
                                            <span className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                                                <AlertTriangle size={12} /> Sottoscorta
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${item.category === 'food' ? 'bg-orange-500/20 text-orange-400' :
                                            item.category === 'beverage' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-slate-700 text-slate-300'
                                            }`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-300 font-mono">
                                        {item.quantity} <span className="text-slate-500 text-xs">{item.unit}</span>
                                    </td>
                                    <td className="p-4 text-emerald-400 font-mono font-bold">
                                        € {item.costPerUnit.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {item.supplier || '-'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-2 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 hover:bg-slate-700 rounded-lg text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">
                                    {editingItem ? 'Modifica Articolo' : 'Nuovo Articolo'}
                                </h3>
                                <button onClick={closeModal} className="text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Nome Prodotto</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => {
                                            const capitalized = e.target.value
                                                .split(' ')
                                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                                .join(' ');
                                            setFormData({ ...formData, name: capitalized });
                                        }}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                        placeholder="es. Farina 00"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Categoria</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                        >
                                            <option value="food">Food</option>
                                            <option value="beverage">Beverage</option>
                                            <option value="supplies">Materiali</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Unità di Misura</label>
                                        <select
                                            value={formData.unit}
                                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                        >
                                            <option value="kg">kg (Chilogrammi)</option>
                                            <option value="g">g (Grammi)</option>
                                            <option value="l">l (Litri)</option>
                                            <option value="ml">ml (Millilitri)</option>
                                            <option value="pz">pz (Pezzi)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Costo per Unità (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.costPerUnit}
                                            onChange={e => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Quantità Attuale</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Fornitore</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.supplier || ''}
                                            onChange={e => {
                                                if (e.target.value === '__new__') {
                                                    setShowSupplierModal(true);
                                                } else {
                                                    setFormData({ ...formData, supplier: e.target.value });
                                                }
                                            }}
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                        >
                                            <option value="">Nessun fornitore</option>
                                            {Array.from(new Set(items.map(i => i.supplier).filter(Boolean))).sort().map(supplier => (
                                                <option key={supplier} value={supplier}>{supplier}</option>
                                            ))}
                                            <option value="__new__" className="font-bold text-emerald-400">+ Aggiungi Nuovo Fornitore</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-800 flex gap-4">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Supplier Modal */}
            {showSupplierModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white">Nuovo Fornitore</h3>
                        </div>
                        <div className="p-6">
                            <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Nome Fornitore</label>
                            <input
                                type="text"
                                value={newSupplierName}
                                onChange={e => {
                                    const capitalized = e.target.value
                                        .split(' ')
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                        .join(' ');
                                    setNewSupplierName(capitalized);
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newSupplierName.trim()) {
                                        setFormData({ ...formData, supplier: newSupplierName.trim() });
                                        setNewSupplierName('');
                                        setShowSupplierModal(false);
                                        showToast(`Fornitore "${newSupplierName.trim()}" aggiunto!`, 'success');
                                    }
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                placeholder="es. Metro Italia"
                                autoFocus
                            />
                        </div>
                        <div className="p-6 border-t border-slate-800 flex gap-4">
                            <button
                                onClick={() => {
                                    setNewSupplierName('');
                                    setShowSupplierModal(false);
                                }}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => {
                                    if (newSupplierName.trim()) {
                                        setFormData({ ...formData, supplier: newSupplierName.trim() });
                                        setNewSupplierName('');
                                        setShowSupplierModal(false);
                                        showToast(`Fornitore "${newSupplierName.trim()}" aggiunto!`, 'success');
                                    }
                                }}
                                disabled={!newSupplierName.trim()}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
                            >
                                Aggiungi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Delivery Modal */}
            {showStockDeliveryModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <TrendingUp className="text-blue-500" size={24} />
                                    Carico Merce
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">Registra l'arrivo di nuova merce e aggiorna quantità e prezzi</p>
                            </div>
                            <button onClick={() => setShowStockDeliveryModal(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* File Upload */}
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Documento (Opzionale)</label>
                                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={e => setDeliveryFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="delivery-file-input"
                                    />
                                    <label htmlFor="delivery-file-input" className="cursor-pointer">
                                        {deliveryFile ? (
                                            <div className="flex items-center justify-center gap-2 text-blue-400">
                                                <FileText size={24} />
                                                <span className="font-bold">{deliveryFile.name}</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload size={32} className="text-slate-600 mx-auto mb-2" />
                                                <p className="text-slate-500 text-sm">Carica fattura o DDT (PDF, immagine, Word)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Supplier Selection */}
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Fornitore (Opzionale)</label>
                                <select
                                    value={deliverySupplier}
                                    onChange={e => setDeliverySupplier(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="">Nessun fornitore</option>
                                    {Array.from(new Set(items.map(i => i.supplier).filter(Boolean))).sort().map(supplier => (
                                        <option key={supplier} value={supplier}>{supplier}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Invoice Number */}
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Numero Fattura (Opzionale)</label>
                                <input
                                    type="text"
                                    value={deliveryInvoiceNumber}
                                    onChange={e => setDeliveryInvoiceNumber(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                    placeholder="es. FT-2026/001"
                                />
                            </div>

                            {/* Add Products */}
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Aggiungi Prodotti</label>
                                <select
                                    onChange={e => {
                                        if (e.target.value) {
                                            addDeliveryItem(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="">Seleziona un prodotto...</option>
                                    {items.map(item => (
                                        <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Delivery Items List */}
                            {deliveryItems.length > 0 && (
                                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                                    <div className="p-4 border-b border-slate-800">
                                        <h4 className="font-bold text-white">Prodotti in Carico ({deliveryItems.length})</h4>
                                    </div>
                                    <div className="divide-y divide-slate-800">
                                        {deliveryItems.map(({ itemId, quantity, newPrice }) => {
                                            const item = items.find(i => i.id === itemId);
                                            if (!item) return null;
                                            return (
                                                <div key={itemId} className="p-4 flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <p className="font-bold text-white">{item.name}</p>
                                                        <p className="text-xs text-slate-500">Stock attuale: {item.quantity} {item.unit}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div>
                                                            <label className="text-xs text-slate-500 block mb-1">Quantità</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={quantity}
                                                                onChange={e => updateDeliveryItemQuantity(itemId, parseFloat(e.target.value) || 0)}
                                                                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-slate-500 block mb-1">Nuovo Prezzo (€/{item.unit})</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={newPrice || item.costPerUnit}
                                                                onChange={e => updateDeliveryItemPrice(itemId, parseFloat(e.target.value) || 0)}
                                                                className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                                                placeholder={item.costPerUnit.toFixed(2)}
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => removeDeliveryItem(itemId)}
                                                            className="text-red-500 hover:text-red-400 p-2"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Total Cost Summary */}
                                    <div className="p-4 bg-blue-500/10 border-t border-blue-500/30">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 font-bold uppercase text-xs">Totale Fattura</span>
                                            <span className="text-2xl font-black text-blue-400">
                                                € {deliveryItems.reduce((sum, { itemId, quantity, newPrice }) => {
                                                    const item = items.find(i => i.id === itemId);
                                                    const price = newPrice || item?.costPerUnit || 0;
                                                    return sum + (price * quantity);
                                                }, 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {deliveryItems.length === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    <Package size={48} className="mx-auto mb-2 opacity-50" />
                                    <p>Nessun prodotto aggiunto al carico</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-800 flex gap-4">
                            <button
                                onClick={() => {
                                    setShowStockDeliveryModal(false);
                                    setDeliveryFile(null);
                                    setDeliveryItems([]);
                                }}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleStockDelivery}
                                disabled={deliveryItems.length === 0}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <TrendingUp size={18} />
                                Conferma Carico
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default InventoryManager;
