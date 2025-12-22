import React from 'react';
import QRCode from 'react-qr-code';
import { ChefHat, Phone, Globe, Bike, MapPin } from 'lucide-react';
import { RestaurantProfile } from '../types';

interface DeliveryFlyerProps {
    restaurantProfile: RestaurantProfile;
    publicUrl: string;
    onClose: () => void;
}

export default function DeliveryFlyer({ restaurantProfile, publicUrl, onClose }: DeliveryFlyerProps) {

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 overflow-auto flex flex-col items-center">
            {/* TOOLBAR - Non stampabile */}
            <div className="print:hidden fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <Bike className="text-orange-500" size={24} />
                    <h1 className="text-white font-bold text-lg">Locandina Delivery (A5)</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2"
                    >
                        🖨️ Stampa / PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                    >
                        ✕ Chiudi
                    </button>
                </div>
            </div>

            {/* CONTENUTO STAMPABILE - A5 FORMAT (148mm x 210mm) */}
            <div className="pt-24 pb-20 print:pt-0 print:pb-0 w-full max-w-[14.8cm] print:max-w-none mx-auto">
                <div className="bg-white text-slate-900 w-full aspect-[148/210] shadow-2xl print:shadow-none print:w-full print:h-screen flex flex-col relative overflow-hidden">

                    {/* Header Banner: Nero + Arancio (Stile Coerente) */}
                    <div className="w-full h-24 bg-slate-950 relative shrink-0 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-orange-500 z-10"></div>

                        {/* Tagline nel Banner */}
                        <div className="relative z-20 flex items-center gap-2 text-white/90">
                            <Bike size={20} className="text-orange-500" />
                            <span className="font-black tracking-[0.3em] text-sm uppercase">Official Delivery</span>
                        </div>
                    </div>

                    {/* Corpo Centrale */}
                    <div className="flex-1 flex flex-col items-center p-8 text-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-50 to-white">

                        {/* Logo Clean */}
                        <div className="mb-6 mt-4 h-32 flex items-center justify-center">
                            {restaurantProfile.logo ? (
                                <img src={restaurantProfile.logo} alt="Logo" className="max-h-full max-w-[200px] object-contain drop-shadow-xl" />
                            ) : (
                                <ChefHat size={80} className="text-slate-800" strokeWidth={1.5} />
                            )}
                        </div>

                        {/* Nome Ristorante */}
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2 leading-none">
                            {restaurantProfile.name || 'Ristorante Demo'}
                        </h1>

                        <div className="w-16 h-1 bg-orange-500 rounded-full mb-8"></div>

                        {/* CTA Section */}
                        <div className="w-full bg-white rounded-2xl border-2 border-slate-100 shadow-xl p-8 flex flex-col items-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"></div>

                            <h2 className="text-3xl font-black italic text-slate-900 mb-2 tracking-tight">ORDINA ORA!</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-6">Scansiona il QR Code per il Menu</p>

                            {/* QR Code */}
                            <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm relative">
                                <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm uppercase animate-pulse">
                                    Scan Me
                                </div>
                                <QRCode value={publicUrl} size={150} />
                            </div>
                        </div>

                    </div>

                    {/* Footer Contatti */}
                    <div className="bg-slate-50 border-t border-slate-100 p-6">
                        <div className="flex flex-col items-center gap-3">
                            {restaurantProfile.phoneNumber && (
                                <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-900">
                                        <Phone size={14} fill="currentColor" />
                                    </div>
                                    {restaurantProfile.phoneNumber}
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                <Globe size={12} className="text-orange-500" /> {publicUrl.replace(/^https?:\/\//, '')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS STAMPA */}
            <style>{`
                @media print {
                    @page {
                        size: A5;
                        margin: 0;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white;
                    }
                    /* Nascondi scrollbar e UI browser */
                    ::-webkit-scrollbar { display: none; }
                    
                    /* Resetta padding/margini */
                    .print\\:pt-0 { padding-top: 0 !important; }
                    .print\\:pb-0 { padding-bottom: 0 !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:w-full { width: 100% !important; max-width: none !important; }
                    .print\\:h-screen { height: 100vh !important; }
                    
                    /* Nascondi app */
                    #root > *:not([class*="fixed"]) {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
