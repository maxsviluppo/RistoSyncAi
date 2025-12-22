import { MenuItem, Category, RestaurantProfile } from '../types';
import { ChefHat, Wheat, Milk, Egg, Fish, Leaf, Flame, Nut, Bean, Globe } from 'lucide-react';
import QRCode from 'react-qr-code';

interface PrintableMenuProps {
    menuItems: MenuItem[];
    restaurantProfile: RestaurantProfile;
    publicUrl: string;
    onClose: () => void;
}

const ALLERGEN_ICONS: Record<string, any> = {
    'Glutine': Wheat,
    'Latticini': Milk,
    'Uova': Egg,
    'Frutta a guscio': Nut,
    'Pesce': Fish,
    'Soia': Bean,
    'Piccante': Flame,
    'Vegano': Leaf,
};

const CATEGORY_ORDER = [
    Category.ANTIPASTI,
    Category.PRIMI,
    Category.SECONDI,
    Category.PIZZE,
    Category.PANINI,
    Category.DOLCI,
    Category.BEVANDE,
    Category.MENU_COMPLETO
];

export default function PrintableMenu({ menuItems, restaurantProfile, publicUrl, onClose }: PrintableMenuProps) {

    const handlePrint = () => {
        window.print();
    };

    const groupedItems = CATEGORY_ORDER.reduce((acc, category) => {
        const items = menuItems.filter(item => item.category === category);
        if (items.length > 0) {
            acc[category] = items;
        }
        return acc;
    }, {} as Record<Category, MenuItem[]>);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 overflow-auto flex flex-col items-center">
            {/* TOOLBAR - Non stampabile */}
            <div className="print:hidden fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <ChefHat className="text-orange-500" size={24} />
                    <h1 className="text-white font-bold text-lg">Anteprima Menu Stampabile (A5)</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2"
                    >
                        🖨️ Stampa
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

                {/* --- PAGINA 1: COPERTINA A5 (LIGHT MODE - INK SAVER) --- */}
                <div className="bg-white text-slate-900 w-full aspect-[148/210] shadow-2xl mb-8 print:mb-0 print:shadow-none print:w-full print:h-screen print:break-after-page flex flex-col relative overflow-hidden">

                    {/* Header Banner: Nero + Arancio */}
                    <div className="w-full h-32 bg-slate-950 relative shrink-0">
                        {/* Pattern sottile nel nero */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-3 bg-orange-500 shadow-lg z-10"></div>
                    </div>

                    {/* Contenuto Centrale: Logo e Nome (Clean & Light) */}
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center -mt-8 relative z-20">

                        {/* Logo "Nudo" (Senza cornice come richiesto) */}
                        <div className="mb-8 drop-shadow-xl">
                            {restaurantProfile.logo ? (
                                <img
                                    src={restaurantProfile.logo}
                                    alt="Logo"
                                    className="max-w-[200px] max-h-[200px] object-contain"
                                />
                            ) : (
                                <div className="text-orange-500">
                                    <ChefHat size={120} strokeWidth={1.5} />
                                </div>
                            )}
                        </div>

                        {/* Nome Ristorante */}
                        <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-[0.9]">
                            {restaurantProfile.name || 'Ristorante Demo'}
                        </h1>

                        {/* Linea decorativa mini */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-6"></div>

                        {/* Slogan / Descrizione */}
                        {restaurantProfile.description && (
                            <div className="max-w-[80%]">
                                <p className="text-xl text-slate-500 font-serif italic leading-relaxed">
                                    "{restaurantProfile.description.substring(0, 80)}{restaurantProfile.description.length > 80 ? '...' : ''}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer: QR Code Area */}
                    <div className="shrink-0 bg-slate-50 border-t border-slate-100 p-8 flex items-center justify-between">
                        <div className="text-left">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-1">Menu Digitale</h3>
                            <p className="text-xs text-slate-500">Scansiona per ordinare</p>
                            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-orange-600 uppercase">
                                <Globe size={12} /> {publicUrl.replace(/^https?:\/\//, '')}
                            </div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <QRCode value={publicUrl} size={90} />
                        </div>
                    </div>
                </div>

                {/* --- PAGINE INTERNE (Aggiungiamo padding per rilegatura se necessario) --- */}
                <div className="bg-white text-slate-900 w-full min-h-[21cm] shadow-2xl print:shadow-none print:w-full p-8 print:p-8">

                    {/* --- BIO/INTRO HEADER --- */}
                    {restaurantProfile.description && (
                        <div className="mb-12 pb-8 border-b border-slate-100 text-center print:break-inside-avoid">
                            <h3 className="text-xl font-black text-slate-800 mb-4 font-serif italic">La Nostra Storia</h3>
                            <p className="text-sm text-slate-600 leading-relaxed font-serif italic px-4">
                                {restaurantProfile.description}
                            </p>
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 mx-auto mt-6">
                                <span className="font-serif text-lg">❦</span>
                            </div>
                        </div>
                    )}

                    {/* Categorie e Piatti */}
                    <div className="space-y-12">
                        {Object.entries(groupedItems).map(([category, items]) => (
                            <section key={category} className="print:break-inside-avoid-page">

                                {/* 🟧 SEPARATORE CATEGORIA ARANCIO 🟧 */}
                                <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white z-10 py-2">
                                    <div className="h-8 w-1.5 bg-orange-500 rounded-r"></div>
                                    <h2 className="text-2xl font-black text-orange-600 uppercase tracking-tight flex-1">
                                        {category}
                                    </h2>
                                    <div className="text-xs text-orange-300 font-bold uppercase tracking-widest hidden print:block">
                                        ◆
                                    </div>
                                    <div className="h-[2px] w-12 bg-orange-200"></div>
                                </div>

                                {/* Grid Piatti Compatta per A5 */}
                                <div className="space-y-6">
                                    {items.map(item => (
                                        <div key={item.id} className="print:break-inside-avoid relative flex gap-5">

                                            {/* Immagine Piatto (Sinistra) */}
                                            {item.image && (
                                                <div className="w-[85px] h-[85px] shrink-0 print:w-[25mm] print:h-[25mm]">
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover rounded-md bg-slate-50"
                                                    />
                                                </div>
                                            )}

                                            {/* Contenuto Testuale (Destra) */}
                                            <div className="flex-1 flex flex-col justify-center">
                                                {/* Header Piatto: Nome e Prezzo */}
                                                <div className="flex justify-between items-baseline mb-1 border-b border-dashed border-slate-200 pb-1">
                                                    <h3 className="text-base font-bold text-slate-900 leading-tight w-[80%] uppercase tracking-tight">
                                                        {item.name}
                                                    </h3>
                                                    <span className="text-base font-bold text-orange-600 font-mono whitespace-nowrap">
                                                        € {item.price.toFixed(2)}
                                                    </span>
                                                </div>

                                                {/* Descrizione e Ingredienti */}
                                                <div className="text-xs text-slate-600 leading-snug">
                                                    {(item.description || item.ingredients) && (
                                                        <p className="mb-1 text-slate-500 font-medium">
                                                            {item.description}
                                                            {item.description && item.ingredients && ' - '}
                                                            {item.ingredients && <span className="italic text-slate-400">{item.ingredients}</span>}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Allergeni - Icone minimali */}
                                                {item.allergens && item.allergens.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {item.allergens.map(allergen => {
                                                            const Icon = ALLERGEN_ICONS[allergen];
                                                            return Icon ? (
                                                                <div key={allergen} className="flex items-center gap-0.5 text-[9px] text-slate-400 uppercase tracking-wider font-bold" title={allergen}>
                                                                    <Icon size={10} className="text-orange-400" />
                                                                    <span className="print:hidden">{allergen}</span>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Spaziatore fine categoria */}
                                <div className="h-4"></div>
                            </section>
                        ))}
                    </div>

                    {/* Footer Pagina */}
                    <div className="mt-12 pt-6 border-t border-slate-100 text-center opacity-60">
                        <div className="flex flex-col items-center gap-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                            {restaurantProfile.website && <span>{restaurantProfile.website}</span>}
                            {restaurantProfile.phoneNumber && <span>Tel: {restaurantProfile.phoneNumber}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Configurato per A5 */}
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
                    
                    /* Forza interruzioni */
                    .print\\:break-after-page {
                        break-after: page;
                        page-break-after: always;
                    }
                    .print\\:break-inside-avoid {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    .print\\:break-inside-avoid-page {
                        break-inside: avoid-page;
                        page-break-inside: avoid;
                    }
                    
                    /* Resetta padding/margini contenitori */
                    .print\\:pt-0 { padding-top: 0 !important; }
                    .print\\:pb-0 { padding-bottom: 0 !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:w-full { width: 100% !important; max-width: none !important; }
                    .print\\:h-screen { height: 100vh !important; }
                    .print\\:block { display: block !important; }
                    .print\\:p-8 { padding: 20mm !important; } /* Margini sicuri A5 */
                    
                    /* Nascondi tutto il resto dell'app */
                    #root > *:not([class*="fixed"]) {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
