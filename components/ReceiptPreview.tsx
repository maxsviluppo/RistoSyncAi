import React from 'react';
import { X, Printer } from 'lucide-react';
import { OrderItem, MenuItem, Category } from '../types';

interface ReceiptPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    items: OrderItem[];
    restaurantName: string;
    table: string;
    waiter: string;
    dept: string;
    allMenuItems: MenuItem[];
    numberOfGuests?: number;
    coverCharge?: number;
    discount?: number;
}

export default function ReceiptPreview({
    isOpen,
    onClose,
    items,
    restaurantName,
    table,
    waiter,
    dept,
    allMenuItems,
    numberOfGuests = 0,
    coverCharge = 0,
    discount = 0
}: ReceiptPreviewProps) {
    if (!isOpen) return null;

    const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString('it-IT');

    // Filter out separators ("A seguire")
    const actualItems = items.filter(item => !item.isSeparator);

    // Calculate subtotal
    const subtotal = actualItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

    // Calculate cover charge
    const coverTotal = numberOfGuests > 0 && coverCharge > 0 ? numberOfGuests * coverCharge : 0;

    // Calculate total before discount
    const totalBeforeDiscount = subtotal + coverTotal;

    // Apply discount
    const finalTotal = totalBeforeDiscount - discount;

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up {
                    animation: slideUp 0.3s ease-out;
                }
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #receipt-content, #receipt-content * {
                        visibility: visible;
                    }
                    #receipt-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 300px;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl w-full max-w-md animate-slide-up overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors no-print"
                        >
                            <X size={24} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Printer className="text-white" size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white">Anteprima Scontrino</h3>
                                <p className="text-blue-100 text-sm font-medium">Tavolo {table.replace(/_?history_?/gi, '').trim()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Content */}
                    <div id="receipt-content" className="p-6 bg-white text-black max-h-[60vh] overflow-y-auto custom-scroll">
                        {/* Receipt Header */}
                        <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
                            <div className="text-xl font-bold uppercase mb-1">{restaurantName}</div>
                            <div className="inline-block bg-black text-white px-4 py-1 text-lg font-bold my-2">{dept}</div>
                            <div className="font-bold text-sm mt-2">TAVOLO: {table.replace(/_?history_?/gi, '').trim()}</div>
                            <div className="font-bold text-sm">Staff: {waiter}</div>
                            <div className="text-xs mt-1">{date} - {time}</div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2 mb-4">
                            {actualItems.map((item, idx) => {
                                let subItemsHtml = [];
                                if (item.menuItem.category === Category.MENU_COMPLETO && item.menuItem.comboItems) {
                                    const subNames = item.menuItem.comboItems
                                        .map(id => allMenuItems.find(m => m.id === id)?.name)
                                        .filter(Boolean);
                                    subItemsHtml = subNames;
                                }
                                const itemTotal = item.menuItem.price * item.quantity;

                                return (
                                    <div key={idx}>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold w-6 text-base">{item.quantity}</span>
                                            <span className="flex-1 font-bold text-base">{item.menuItem.name}</span>
                                            <span className="font-bold text-base whitespace-nowrap">€ {itemTotal.toFixed(2)}</span>
                                        </div>
                                        {subItemsHtml.length > 0 && (
                                            <div className="ml-8 text-xs text-gray-600 space-y-0.5">
                                                {subItemsHtml.map((name, i) => (
                                                    <div key={i}>- {name}</div>
                                                ))}
                                            </div>
                                        )}
                                        {item.notes && (
                                            <div className="ml-8 text-xs italic text-gray-600 mt-1">Note: {item.notes}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Totals */}
                        <div className="border-t-2 border-dashed border-black pt-3 space-y-2">
                            <div className="flex justify-between text-base">
                                <span>Subtotale:</span>
                                <span>€ {subtotal.toFixed(2)}</span>
                            </div>
                            {coverTotal > 0 && (
                                <div className="flex justify-between text-base">
                                    <span>Coperto ({numberOfGuests} {numberOfGuests === 1 ? 'persona' : 'persone'}):</span>
                                    <span>€ {coverTotal.toFixed(2)}</span>
                                </div>
                            )}
                            {discount > 0 && (
                                <div className="flex justify-between text-base font-bold text-red-600">
                                    <span>Sconto:</span>
                                    <span>- € {discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-black border-t-2 border-black pt-2 mt-2">
                                <span>TOTALE:</span>
                                <span>€ {finalTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center text-xs mt-4 pt-3 border-t-2 border-dashed border-black">
                            RistoSync AI - Copia di Cortesia
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-3 no-print">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                        >
                            Chiudi
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            <Printer size={18} />
                            Stampa
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
