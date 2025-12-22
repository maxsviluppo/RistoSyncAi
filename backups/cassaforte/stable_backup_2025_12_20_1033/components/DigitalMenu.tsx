import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Category, MenuItem, SocialLinks, MarketingAutomation } from '../types';
import { ChefHat, Utensils, Pizza, CakeSlice, Wine, Wheat, Milk, Egg, Nut, Fish, Bean, Flame, Leaf, Info, Search, Star, MapPin, Instagram, Facebook, ArrowUp, AlertTriangle, LogOut, Loader, Smartphone, UtensilsCrossed, Sandwich, Youtube, Linkedin, Music, Compass, Store, Globe, Clock, Gift, PartyPopper } from 'lucide-react';
import { getAutomations } from '../services/storageService';

interface DigitalMenuProps {
    restaurantId: string;
    isPreview?: boolean;
    activeMenuData?: MenuItem[]; // Data injected directly (for Preview)
    activeRestaurantName?: string; // Name injected directly (for Preview)
}

const CATEGORY_ORDER = [Category.MENU_COMPLETO, Category.ANTIPASTI, Category.PANINI, Category.PIZZE, Category.PRIMI, Category.SECONDI, Category.DOLCI, Category.BEVANDE];

const ALLERGENS_CONFIG = [
    { id: 'Glutine', icon: Wheat, label: 'Glutine' },
    { id: 'Latticini', icon: Milk, label: 'Latticini' },
    { id: 'Uova', icon: Egg, label: 'Uova' },
    { id: 'Frutta a guscio', icon: Nut, label: 'Noci' },
    { id: 'Pesce', icon: Fish, label: 'Pesce' },
    { id: 'Soia', icon: Bean, label: 'Soia' },
    { id: 'Piccante', icon: Flame, label: 'Piccante' },
    { id: 'Vegano', icon: Leaf, label: 'Vegano' },
];

const ALLERGENS_ICONS: Record<string, any> = {
    'Glutine': Wheat, 'Latticini': Milk, 'Uova': Egg, 'Frutta a guscio': Nut,
    'Pesce': Fish, 'Soia': Bean, 'Piccante': Flame, 'Vegano': Leaf
};

const DigitalMenu: React.FC<DigitalMenuProps> = ({ restaurantId, isPreview = false, activeMenuData, activeRestaurantName }) => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>(activeMenuData || []);
    const [restaurantName, setRestaurantName] = useState(activeRestaurantName || 'Menu Digitale');
    const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
    const [socials, setSocials] = useState<SocialLinks>({});
    // If data is provided via props, we are not loading.
    const [loading, setLoading] = useState(!activeMenuData);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<Category>(Category.ANTIPASTI);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [rlsError, setRlsError] = useState(false);

    // MARKETING AUTOMATIONS STATE
    const [activeHappyHour, setActiveHappyHour] = useState<MarketingAutomation | null>(null);
    const [birthdayPromo, setBirthdayPromo] = useState<MarketingAutomation | null>(null);
    const [showBirthdayModal, setShowBirthdayModal] = useState(false);

    // Sync state if props change (for real-time preview updates)
    useEffect(() => {
        if (activeMenuData) {
            setMenuItems(activeMenuData);
            setLoading(false);
        }
        if (activeRestaurantName) {
            setRestaurantName(activeRestaurantName);
        }
    }, [activeMenuData, activeRestaurantName]);

    useEffect(() => {
        const fetchData = async () => {
            if (!supabase) {
                if (!activeMenuData) setError("Database non connesso.");
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Restaurant Profile (Name & Socials)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('restaurant_name, settings')
                    .eq('id', restaurantId)
                    .single();

                if (profile) {
                    setRestaurantName(profile.restaurant_name);
                    if (profile.settings?.restaurantProfile?.socials) {
                        setSocials(profile.settings.restaurantProfile.socials);
                    }
                    if (profile.settings?.restaurantProfile?.logo) {
                        setRestaurantLogo(profile.settings.restaurantProfile.logo);
                    }
                } else if (profileError) {
                    console.error("Profile Fetch Error:", profileError);
                    if (profileError.code === 'PGRST116' || profileError.message.includes('security')) {
                        setRlsError(true);
                    }
                }

                // 2. Fetch Menu Items (Public Read)
                // If activeMenuData provided (Preview), we skip fetching menu items
                if (!activeMenuData) {
                    const { data: rawItems, error: menuError } = await supabase
                        .from('menu_items')
                        .select('*')
                        .eq('user_id', restaurantId);

                    if (menuError) {
                        console.error("Menu fetch error:", menuError);
                    }

                    if (rawItems && rawItems.length > 0) {
                        // MAP DATABASE (Snake_Case) TO APP (CamelCase)
                        // Critical for Combo Items array which is 'combo_items' in DB but 'comboItems' in App
                        const mappedItems: MenuItem[] = rawItems.map((row: any) => ({
                            id: row.id,
                            name: row.name,
                            price: row.price,
                            category: row.category,
                            description: row.description,
                            ingredients: row.ingredients,
                            allergens: row.allergens,
                            image: row.image,
                            isCombo: row.category === Category.MENU_COMPLETO,
                            comboItems: row.combo_items || [], // Correctly map snake_case
                            specificDepartment: row.specific_department
                        }));

                        setMenuItems(mappedItems);
                        setRlsError(false);
                    }
                }

            } catch (error: any) {
                console.error("Critical Error fetching public menu:", error);
                if (!activeMenuData) setError("Errore di caricamento.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Scroll listener logic
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        if (!isPreview) {
            window.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (!isPreview) window.removeEventListener('scroll', handleScroll);
        };
    }, [restaurantId, isPreview, activeMenuData]);

    // CHECK AUTOMATIONS (Happy Hour & Birthday)
    useEffect(() => {
        const checkAutomations = () => {
            const automations = getAutomations();

            // 1. HAPPY HOUR
            const hh = automations.find(a => a.type === 'happy_hour' && a.isActive);
            if (hh && hh.config?.startTime && hh.config?.endTime) {
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const [startH, startM] = hh.config.startTime.split(':').map(Number);
                const [endH, endM] = hh.config.endTime.split(':').map(Number);
                const startTime = startH * 60 + startM;
                const endTime = endH * 60 + endM;

                if (currentTime >= startTime && currentTime <= endTime) {
                    setActiveHappyHour(hh);
                } else {
                    setActiveHappyHour(null);
                }
            } else {
                setActiveHappyHour(null);
            }

            // 2. BIRTHDAY
            const bday = automations.find(a => a.type === 'birthday_promo' && a.isActive);
            setBirthdayPromo(bday || null);
        };

        checkAutomations();
        // Check every minute
        const interval = setInterval(checkAutomations, 60000);
        return () => clearInterval(interval);
    }, []);

    // FILTER: Determine visible categories (hide empty ones)
    const visibleCategories = useMemo(() => {
        return CATEGORY_ORDER.filter(cat => menuItems.some(item => item.category === cat));
    }, [menuItems]);

    // SET INITIAL ACTIVE CATEGORY ONCE DATA LOADS
    useEffect(() => {
        if (visibleCategories.length > 0 && !visibleCategories.includes(activeCategory)) {
            setActiveCategory(visibleCategories[0]);
        }
    }, [visibleCategories]);

    const scrollToCategory = (cat: Category) => {
        setActiveCategory(cat);
        const element = document.getElementById(`cat-${cat}`);
        if (element) {
            const container = isPreview ? document.getElementById('digital-menu-container') : window;

            if (isPreview && container instanceof HTMLElement) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                const offset = 140;
                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = element.getBoundingClientRect().top;
                const elementPosition = elementRect - bodyRect;
                const offsetPosition = elementPosition - offset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        }
    };

    const getCategoryIcon = (cat: Category, size: number = 18) => {
        switch (cat) { case Category.MENU_COMPLETO: return <Star size={size} />; case Category.ANTIPASTI: return <UtensilsCrossed size={size} />; case Category.PANINI: return <Sandwich size={size} />; case Category.PIZZE: return <Pizza size={size} />; case Category.PRIMI: return <ChefHat size={size} />; case Category.SECONDI: return <Utensils size={size} />; case Category.DOLCI: return <CakeSlice size={size} />; case Category.BEVANDE: return <Wine size={size} />; default: return <Utensils size={size} />; }
    };

    const exitMenuMode = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('menu');
        window.location.href = url.toString();
    };

    // Social Button Helper
    const SocialButton = ({ link, icon: Icon, colorClass, label }: { link?: string, icon: any, colorClass: string, label: string }) => {
        if (!link) return null;
        const href = link.startsWith('http') ? link : `https://${link}`;
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md border border-gray-300 bg-white hover:bg-gray-50 hover:scale-110 transition-all ${colorClass}`} title={label}>
                <Icon size={20} />
            </a>
        );
    };

    if (loading) return (
        <div className={`${isPreview ? 'h-full bg-slate-900 rounded-[2.5rem]' : 'min-h-screen bg-slate-900'} flex flex-col items-center justify-center text-white p-4`}>
            <Loader className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="animate-pulse font-medium text-lg">Caricamento...</p>
        </div>
    );

    // SCREEN ERRORI
    if ((rlsError || (menuItems.length === 0 && !loading)) && !activeMenuData) {
        return (
            <div className={`${isPreview ? 'h-full bg-slate-950 rounded-[2.5rem]' : 'min-h-screen bg-slate-950'} flex flex-col items-center justify-center text-white p-8 text-center`}>
                <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <AlertTriangle size={40} className="text-orange-500" />
                </div>
                <h2 className="text-2xl font-black mb-3">Menu Non Disponibile</h2>

                {rlsError ? (
                    <div className="bg-slate-900 p-4 rounded-2xl border border-red-500/30 max-w-xs text-sm">
                        <p className="text-slate-300 mb-2 font-medium">
                            {isPreview ? "Permessi pubblici non attivi." : "Il ristorante non è accessibile."}
                        </p>
                        {isPreview && <p className="text-xs text-orange-400">Esegui lo script SQL nella dashboard Super Admin.</p>}
                    </div>
                ) : (
                    <div className="max-w-md">
                        <p className="text-slate-400 mb-6 text-sm">
                            Nessun piatto inserito. Vai su "Menu" per aggiungerne uno.
                        </p>
                    </div>
                )}

                {!isPreview && (
                    <button onClick={exitMenuMode} className="mt-8 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold border border-slate-700 transition-all flex items-center gap-2">
                        <LogOut size={20} /> Torna alla Home
                    </button>
                )}
            </div>
        );
    }

    if (error && !activeMenuData) return (
        <div className={`${isPreview ? 'h-full' : 'min-h-screen'} bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center`}>
            <AlertTriangle size={48} className="text-red-500 mb-4" />
            <p className="text-slate-400 mb-6">{error}</p>
        </div>
    );

    // MAIN RENDER (LIGHT MODE)
    return (
        <div
            id="digital-menu-container"
            className={`${isPreview ? 'h-full overflow-y-auto relative rounded-[2.5rem] bg-slate-900 scrollbar-hide' : 'min-h-screen bg-slate-900 pb-24'}`}
        >
            {/* THIN HEADER */}
            <div className={`bg-slate-900 text-white relative shadow-lg z-20 border-b border-slate-800 ${isPreview ? 'rounded-b-2xl pt-8 pb-3' : 'pt-4 pb-4 sticky top-0'}`}>
                <div className="px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo or Default Icon */}
                        {restaurantLogo ? (
                            <div className={`${isPreview ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl overflow-hidden shadow-lg border-2 border-orange-500/30`}>
                                <img src={restaurantLogo} alt="Logo" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-600/20">
                                <ChefHat size={isPreview ? 18 : 22} className="text-white" />
                            </div>
                        )}
                        <h1 className={`${isPreview ? 'text-lg' : 'text-xl'} font-bold tracking-tight leading-none truncate max-w-[200px] text-white`}>{restaurantName}</h1>
                    </div>
                    {/* Optional Status Indicator or Mini Icon */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase">Open</span>
                        </div>
                        {birthdayPromo && (
                            <button
                                onClick={() => setShowBirthdayModal(true)}
                                className="bg-gradient-to-r from-orange-500 to-pink-500 p-1.5 rounded-full shadow-lg shadow-pink-500/20 hover:scale-110 transition-transform animate-pulse"
                            >
                                <Gift size={16} className="text-white" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* MARKETING BANNERS */}
            {
                activeHappyHour && (
                    <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white p-3 shadow-lg animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={64} /></div>
                        <div className="flex items-center justify-between max-w-2xl mx-auto px-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm animate-pulse">
                                    <Clock size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-black text-sm uppercase tracking-wide">Happy Hour Attivo!</p>
                                    <p className="text-xs text-white/90 font-medium">Fino alle {activeHappyHour.config?.endTime}</p>
                                </div>
                            </div>
                            <div className="bg-white text-pink-600 px-3 py-1 rounded-full font-black text-xs shadow-md">
                                PROMO
                            </div>
                        </div>
                    </div>
                )
            }

            {/* BIRTHDAY MODAL */}
            {
                showBirthdayModal && birthdayPromo && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-slide-up text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500"></div>
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl"></div>

                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <PartyPopper size={40} className="text-pink-500 animate-bounce" />
                            </div>

                            <h3 className="text-3xl font-black text-white mb-2">Buon Compleanno!</h3>
                            <p className="text-slate-400 mb-6 text-sm">
                                {birthdayPromo.config?.message || "Tanti auguri! Ecco un regalo per te."}
                            </p>

                            <div className="bg-slate-800 p-4 rounded-2xl border-2 border-dashed border-slate-700 mb-6">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Il tuo regalo</p>
                                <p className="text-3xl font-black text-white">
                                    {birthdayPromo.config?.discountType === 'percentage' ? `-${birthdayPromo.config.discountValue}%` : `€${birthdayPromo.config.discountValue}`}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Mostra questa schermata in cassa</p>
                            </div>

                            <button onClick={() => setShowBirthdayModal(false)} className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-pink-600/20 active:scale-95 transition-all">
                                GRAZIE!
                            </button>
                        </div>
                    </div>
                )
            }

            {/* CATEGORY NAV - ELEGANT DARK STYLE */}
            <div className={`sticky z-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 ${isPreview ? 'top-0 py-2' : 'top-[60px] py-3'}`}>
                <div className="flex overflow-x-auto gap-2 px-4 no-scrollbar snap-x">
                    {visibleCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => scrollToCategory(cat)}
                            className={`flex items-center gap-1.5 rounded-full whitespace-nowrap font-bold transition-all snap-center ${isPreview ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2 text-xs'} ${activeCategory === cat ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'}`}
                        >
                            {getCategoryIcon(cat, isPreview ? 12 : 14)} {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* MENU CONTENT */}
            <div className={`px-4 max-w-2xl mx-auto ${isPreview ? 'py-4 space-y-6' : 'py-6 space-y-10'}`}>
                {visibleCategories.map(cat => {
                    const items = menuItems.filter(i => i.category === cat);
                    return (
                        <div key={cat} id={`cat-${cat}`} className="scroll-mt-32">
                            {/* CATEGORY SEPARATOR - ORANGE STYLE */}
                            <div className={`flex items-center gap-3 ${isPreview ? 'mb-3 mt-4' : 'mb-4 mt-6'}`}>
                                <div className="h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent flex-1"></div>
                                <div className={`flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full shadow-lg shadow-orange-500/30 ${isPreview ? 'text-xs' : 'text-sm'}`}>
                                    {getCategoryIcon(cat, isPreview ? 14 : 16)}
                                    <span className="font-black uppercase tracking-wider">{cat}</span>
                                </div>
                                <div className="h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent flex-1"></div>
                            </div>

                            <div className={`grid ${isPreview ? 'gap-3' : 'gap-4'}`}>
                                {items.map(item => {
                                    // COMBO ITEMS DISPLAY LOGIC
                                    const isCombo = item.category === Category.MENU_COMPLETO;
                                    let comboChildren: MenuItem[] = [];
                                    if (isCombo && item.comboItems) {
                                        // Need full menu reference for mapping IDs
                                        const fullMenu = activeMenuData || menuItems;
                                        comboChildren = fullMenu.filter(i => item.comboItems?.includes(i.id));
                                    }

                                    // ALLERGEN AGGREGATION LOGIC
                                    let displayAllergens = item.allergens || [];
                                    if (isCombo && comboChildren.length > 0) {
                                        const childAllergens = comboChildren.flatMap(c => c.allergens || []);
                                        // Merge main item allergens + children allergens, remove duplicates
                                        displayAllergens = [...new Set([...displayAllergens, ...childAllergens])];
                                    }

                                    return (
                                        <div key={item.id} className={`bg-white rounded-2xl shadow-md border border-gray-200 flex flex-col relative overflow-hidden group hover:shadow-lg transition-shadow ${isPreview ? 'p-3 gap-1.5' : 'p-5 gap-3'}`}>
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`${isPreview ? 'text-sm' : 'text-base'} font-bold text-slate-900 leading-tight`}>{item.name}</h3>

                                                    {/* 1. INGREDIENTS (New Order) */}
                                                    {item.ingredients && (
                                                        <p className={`text-slate-600 font-medium italic mt-1 leading-snug ${isPreview ? 'text-[10px]' : 'text-xs'}`}>
                                                            {item.ingredients}
                                                        </p>
                                                    )}

                                                    {/* COMBO CHILDREN LISTING */}
                                                    {isCombo && comboChildren.length > 0 && (
                                                        <div className="mt-2 mb-1">
                                                            <p className={`text-[9px] font-bold text-slate-500 uppercase mb-1`}>Include:</p>
                                                            <ul className={`list-disc list-inside text-slate-700 ${isPreview ? 'text-[10px]' : 'text-xs'}`}>
                                                                {comboChildren.map(child => (
                                                                    <li key={child.id}>{child.name}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* 2. DESCRIPTION */}
                                                    <p className={`text-slate-500 leading-relaxed mt-2 border-t border-dashed border-gray-300 pt-2 ${isPreview ? 'text-[10px]' : 'text-xs'}`}>
                                                        {item.description || <span className="italic opacity-50">.</span>}
                                                    </p>

                                                    {/* 3. ALLERGENS (Aggregated) */}
                                                    {displayAllergens.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-2 mt-1">
                                                            {displayAllergens.map(alg => {
                                                                const Icon = ALLERGENS_ICONS[alg] || Info;
                                                                return (
                                                                    <span key={alg} className={`inline-flex items-center gap-1 font-bold uppercase text-slate-600 bg-gray-100 border border-gray-300 rounded-md ${isPreview ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-1'}`}>
                                                                        <Icon size={isPreview ? 8 : 10} className="text-orange-500" /> {alg}
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* DISH IMAGE WITH PRICE BELOW */}
                                                {item.image && (
                                                    <div className="shrink-0 flex flex-col items-center gap-2">
                                                        <div className={`rounded-xl overflow-hidden aspect-square bg-gray-100 border border-gray-200 ${isPreview ? 'w-16' : 'w-24'}`}>
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className={`font-black text-orange-600 ${isPreview ? 'text-sm' : 'text-lg'} whitespace-nowrap`}>
                                                            € {item.price.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* PRICE ONLY (if no image) */}
                                                {!item.image && (
                                                    <div className={`font-black text-orange-600 ${isPreview ? 'text-sm' : 'text-lg'} whitespace-nowrap self-start`}>
                                                        € {item.price.toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {visibleCategories.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        <Search size={40} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-sm">Menu vuoto</p>
                    </div>
                )}
            </div>

            {/* FOOTER - SOCIAL & LINKS */}
            <div className={`text-center bg-slate-900 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-slate-800 ${isPreview ? 'py-6 mt-4' : 'py-8 mt-8'}`}>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">Seguici & Contattaci</p>

                <div className="flex flex-wrap justify-center gap-3 mb-6 px-6">
                    <SocialButton link={socials.instagram} icon={Instagram} colorClass="text-pink-500" label="Instagram" />
                    <SocialButton link={socials.facebook} icon={Facebook} colorClass="text-blue-500" label="Facebook" />
                    <SocialButton link={socials.tiktok} icon={Music} colorClass="text-white" label="TikTok" />
                    <SocialButton link={socials.google} icon={Store} colorClass="text-blue-400" label="Google Business" />
                    <SocialButton link={socials.tripadvisor} icon={Compass} colorClass="text-green-500" label="TripAdvisor" />
                    <SocialButton link={socials.thefork} icon={UtensilsCrossed} colorClass="text-emerald-500" label="TheFork" />
                    <SocialButton link={socials.youtube} icon={Youtube} colorClass="text-red-500" label="YouTube" />
                    <SocialButton link={socials.linkedin} icon={Linkedin} colorClass="text-blue-600" label="LinkedIn" />
                </div>

                {/* Website Fallback */}
                {!Object.values(socials).some(v => !!v) && (
                    <p className="text-xs text-slate-500 italic mb-4">Nessun social collegato</p>
                )}

                <div className="flex items-center justify-center gap-1.5 text-slate-500 font-bold text-[10px]">
                    <ChefHat size={12} /> Powered by RistoSync<span className="text-blue-500 font-black ml-1">AI</span>
                </div>
            </div>

            {/* PREVIEW MODE DOES NOT HAVE EXIT BUTTONS */}
            {
                !isPreview && (
                    <>
                        <button
                            onClick={exitMenuMode}
                            className="fixed bottom-6 left-6 p-3 bg-slate-800 border border-slate-700 text-white rounded-full z-50 shadow-2xl hover:scale-110 transition-all opacity-50 hover:opacity-100"
                            title="Esci dal Menu Digitale"
                        >
                            <LogOut size={20} />
                        </button>
                        {showScrollTop && (
                            <button
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="fixed bottom-6 right-6 p-3 bg-orange-600 text-white rounded-full shadow-2xl shadow-orange-500/30 z-50 animate-bounce hover:bg-orange-500 transition-colors"
                            >
                                <ArrowUp size={20} />
                            </button>
                        )}
                    </>
                )
            }
        </div >
    );
};

export default DigitalMenu;