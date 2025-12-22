import { useRef, useState, useEffect } from 'react';
import { Promotion, MarketingAutomation, SocialPost } from '../types';
import { getPromotions, addPromotion, updatePromotion, deletePromotion, getAutomations, updateAutomation, saveAutomations, getAppSettings, saveAppSettings, getSocialPosts, addSocialPost, updateSocialPost, deleteSocialPost } from '../services/storageService';
import { generateSocialPost } from '../services/geminiService';
import { useToast } from '../components/ToastProvider';
import { useDialog } from '../hooks/useDialog';
import { CheckCircle, AlertTriangle, Facebook, Instagram, Megaphone, Gift, Percent, Calendar, Share2, Target, Plus, Trash2, Edit2, Zap, Save, X, LayoutGrid, MessageCircle, BarChart3, TrendingUp, Send, Clock, Image as ImageIcon, Loader, Bot, Copy, ExternalLink, Globe, ChevronDown, ChevronUp } from 'lucide-react';

const SavedPostCard = ({ post, logoUrl, onPublish, onEdit, onDelete }: { post: SocialPost, logoUrl: string | null, onPublish: (p: SocialPost) => void, onEdit: (p: SocialPost) => void, onDelete: (id: string) => void }) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-indigo-500/30 transition-all group flex flex-col lg:flex-row h-auto lg:h-[500px] w-full">

            {/* LEFT: Image Section (40% width on desktop) */}
            <div className="lg:w-2/5 relative bg-slate-950 overflow-hidden">
                {post.image ? (
                    <>
                        <img src={post.image} alt="Post" className="w-full h-64 lg:h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-slate-900/50" />

                        {/* Overlay Text Preview (Miniature if exists) */}
                        {post.overlayText && (
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <span className="text-white font-black uppercase text-center text-xl lg:text-2xl drop-shadow-md border-2 border-white/80 p-2 transform -rotate-2">
                                    {post.overlayText}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950/50">
                        <ImageIcon size={48} className="mb-2 opacity-50" />
                        <span className="text-xs font-bold tracking-widest uppercase">No Image</span>
                    </div>
                )}

                {/* Topic Badge over Image (Mobile only or Top Left) */}
                <div className="absolute top-4 left-4">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/10 uppercase tracking-wider shadow-lg">
                        {post.topic || 'Post Social'}
                    </span>
                </div>
            </div>

            {/* RIGHT: Content Section (60% width) */}
            <div className="lg:w-3/5 p-6 lg:p-8 flex flex-col relative bg-gradient-to-br from-slate-900 to-slate-900/50">
                {/* Header Info */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">RS</div>
                        <div>
                            <p className="text-white text-sm font-bold leading-none">Anteprima Post</p>
                            <p className="text-slate-500 text-[11px] font-mono mt-1">{new Date(post.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <Globe size={14} className="text-slate-600" />
                </div>

                {/* Main Description */}
                <div className="flex-1 overflow-hidden relative mb-4">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 lg:line-clamp-5">
                        {post.content}
                    </p>
                    {/* Hashtags Highlight */}
                    <div className="mt-2 flex flex-wrap gap-1">
                        {post.content?.match(/#[a-zA-Z0-9_]+/g)?.slice(0, 5).map((tag, i) => (
                            <span key={i} className="text-indigo-400 text-xs font-medium">{tag}</span>
                        ))}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-800/50 flex gap-3 mt-auto">
                    <button
                        onClick={() => onPublish(post)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Send size={16} /> <span className="hidden sm:inline">Pubblica</span>
                    </button>

                    <button
                        onClick={() => onEdit(post)}
                        className="px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl font-medium text-sm transition-all border border-slate-700 flex items-center justify-center"
                        title="Modifica"
                    >
                        <Edit2 size={16} />
                    </button>

                    <button
                        onClick={() => onDelete(post.id)}
                        className="px-4 py-2.5 bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white rounded-xl font-bold text-sm transition-all border border-red-900/50 hover:border-red-600 flex items-center justify-center shadow-md"
                        title="Elimina"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};




export default function MarketingPanel() {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'automations' | 'social'>('campaigns');
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [automations, setAutomations] = useState<MarketingAutomation[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Partial<Promotion>>({});
    const [editingAuto, setEditingAuto] = useState<Partial<MarketingAutomation>>({});

    // SOCIAL POST STATE
    const [postTopic, setPostTopic] = useState('');
    const [generatedPost, setGeneratedPost] = useState('');
    const [isGeneratingPost, setIsGeneratingPost] = useState(false);
    const [postImage, setPostImage] = useState<string | null>(null);
    const [overlayText, setOverlayText] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [savedPosts, setSavedPosts] = useState<SocialPost[]>([]);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);

    // SOCIAL LOGIN MODAL STATE
    const [showConnectModal, setShowConnectModal] = useState<'facebook' | 'instagram' | null>(null);
    // TYPES
    type ConnectStep = 'login' | 'select_page' | 'success' | 'api_config';
    const [connectStep, setConnectStep] = useState<ConnectStep>('login');
    const [availablePages, setAvailablePages] = useState<string[]>([]);
    const [selectedPage, setSelectedPage] = useState<string | null>(null);

    // MOCK CONNECTED STATE
    const [facebookConnected, setFacebookConnected] = useState(false);
    const [instagramConnected, setInstagramConnected] = useState(false);
    const [connectedPageName, setConnectedPageName] = useState<string | null>(null);

    const { showToast } = useToast();
    const { showConfirm } = useDialog();


    useEffect(() => {
        setPromotions(getPromotions());
        setAutomations(getAutomations());
        setSavedPosts(getSocialPosts());

        // Load Logo
        const settings = getAppSettings();
        if (settings.restaurantProfile?.logo) {
            setLogoUrl(settings.restaurantProfile.logo);
        }

        const handleUpdate = () => {
            setPromotions(getPromotions());
        };
        const handleAutoUpdate = () => {
            setAutomations(getAutomations());
        }
        const handleSocialUpdate = () => {
            setSavedPosts(getSocialPosts());
        }

        window.addEventListener('local-marketing-update', handleUpdate);
        window.addEventListener('local-automation-update', handleAutoUpdate);
        window.addEventListener('local-social-update', handleSocialUpdate);
        return () => {
            window.removeEventListener('local-marketing-update', handleUpdate);
            window.removeEventListener('local-automation-update', handleAutoUpdate);
            window.removeEventListener('local-social-update', handleSocialUpdate);
        }
    }, []);



    const toggleAutomation = (auto: MarketingAutomation) => {
        updateAutomation({ ...auto, isActive: !auto.isActive });
        showToast(auto.isActive ? 'Automazione disattivata' : 'Automazione attivata', 'info');
    };


    const handleSaveAuto = () => {
        if (editingAuto.id) {
            updateAutomation(editingAuto);
            setIsEditing(false);
            setEditingAuto({});
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPostImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGeneratePost = async () => {
        if (!postTopic) return;
        setIsGeneratingPost(true);
        const text = await generateSocialPost(postTopic, overlayText ? `Grafica con scritta: "${overlayText}"` : undefined);
        setGeneratedPost(text);
        setIsGeneratingPost(false);
    };

    const handleSavePost = () => {
        if (!generatedPost && !postImage) return;

        const newPost: SocialPost = {
            id: editingPostId || Date.now().toString(),
            topic: postTopic,
            content: generatedPost,
            image: postImage,
            overlayText: overlayText,
            date: Date.now(),
            platform: 'all'
        };

        if (editingPostId) {
            updateSocialPost(newPost);
            setEditingPostId(null);
        } else {
            addSocialPost(newPost);
        }

        // Reset form
        setPostTopic('');
        setGeneratedPost('');
        setPostImage(null);
        setOverlayText('');
        showToast("Post salvato nella bacheca!", "success");
    };


    const handleEditPost = (post: SocialPost) => {
        setPostTopic(post.topic || '');
        setGeneratedPost(post.content);
        setPostImage(post.image || null);
        setOverlayText(post.overlayText || '');
        setEditingPostId(post.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeletePost = async (id: string) => {
        if (await showConfirm("Elimina Post", "Vuoi davvero eliminare questo post salvato?")) {
            deleteSocialPost(id);
            showToast("Post eliminato", "info");
        }
    };

    const handleConnectClick = async (platform: 'facebook' | 'instagram') => {
        const isConnected = platform === 'facebook' ? facebookConnected : instagramConnected;
        if (isConnected) {
            if (await showConfirm("Disconnetti", `Vuoi disconnettere ${platform}?`)) {
                if (platform === 'facebook') {
                    setFacebookConnected(false);
                    setConnectedPageName(null);
                } else {
                    setInstagramConnected(false);
                }
                showToast(`${platform} disconnesso`, 'info');
            }
        } else {
            // OPEN CUSTOM MODAL FLOW
            setShowConnectModal(platform);
            setConnectStep('login');
            setAvailablePages([]);
            setSelectedPage(null);
        }
    };

    const proceedToPageSelection = () => {
        // Simulate fetching pages
        setConnectStep('select_page');
        setTimeout(() => {
            setAvailablePages([
                "Pizzeria Da Mario - Official",
                "Mario's Lounge Bar",
                "Ristorante Il Gusto"
            ]);
        }, 800);
    };

    const confirmConnection = () => {
        if (!selectedPage) {
            showToast("Seleziona una pagina per continuare", "error");
            return;
        }

        // Simulate save
        setConnectStep('success');
        setTimeout(() => {
            if (showConnectModal === 'facebook') {
                setFacebookConnected(true);
                setConnectedPageName(selectedPage);
            } else {
                setInstagramConnected(true);
            }
            setShowConnectModal(null);
            showToast(`${showConnectModal} collegato a "${selectedPage}"!`, 'success');
        }, 1000);
    };


    const handlePublish = async (post: SocialPost) => {
        if (!facebookConnected && !instagramConnected) {
            showToast("Nessun account social collegato! Collega Facebook o Instagram prima di pubblicare.", "error");
            return;
        }

        const platforms: string[] = [];
        if (facebookConnected) platforms.push("Facebook");
        if (instagramConnected) platforms.push("Instagram");

        if (await showConfirm("Pubblica Post", `Pubblicare questo post su ${platforms.join(' e ')}?`)) {
            // Simulate API call
            showToast("Pubblicazione in corso...", "info");
            setTimeout(() => {
                showToast(`✅ Post pubblicato con successo su ${platforms.join(' e ')}!`, "success");
            }, 2000);
        }
    };


    const handleSavePromo = () => {
        if (!editingPromo.title || !editingPromo.discountValue) return;

        const newPromo: Promotion = {
            id: editingPromo.id || Date.now().toString(),
            title: editingPromo.title,
            description: editingPromo.description || '',
            discountType: editingPromo.discountType || 'percentage',
            discountValue: parseFloat(editingPromo.discountValue.toString()),
            active: editingPromo.active ?? true,
            target: editingPromo.target || 'all',
            targetValue: editingPromo.targetValue,
            startDate: editingPromo.startDate,
            endDate: editingPromo.endDate
        };

        if (editingPromo.id) {
            updatePromotion(newPromo);
        } else {
            addPromotion(newPromo);
        }
        setIsEditing(false);
        setEditingPromo({});
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                        <div className="bg-pink-600/20 p-2 rounded-xl text-pink-500">
                            <Megaphone size={32} />
                        </div>
                        Marketing Suite
                    </h2>
                    <p className="text-slate-400">
                        Coinvolgi i clienti ai tavoli con promozioni mirate e social engagement.
                    </p>
                </div>
                <div className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button onClick={() => setActiveTab('campaigns')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'campaigns' ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' : 'text-slate-400 hover:text-white'}`}>
                        <Gift size={16} /> Campagne
                    </button>
                    <button onClick={() => setActiveTab('automations')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'automations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:text-white'}`}>
                        <Zap size={16} /> Automazioni
                    </button>
                    <button onClick={() => setActiveTab('social')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'social' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white'}`}>
                        <Share2 size={16} /> Social Media
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            {activeTab === 'campaigns' && (
                <div className="animate-slide-up">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Target className="text-pink-400" /> Campagne Attive
                        </h3>
                        <button
                            onClick={() => { setEditingPromo({}); setIsEditing(true); }}
                            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-pink-900/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} /> Nuova Promo
                        </button>
                    </div>

                    {isEditing && (
                        <div className="mb-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                            <h4 className="font-bold text-white mb-6 text-lg border-b border-slate-800 pb-2">
                                {editingPromo.id ? 'Modifica Promozione' : 'Crea Nuova Promozione'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Titolo Promo</label>
                                    <input
                                        type="text"
                                        value={editingPromo.title || ''}
                                        onChange={e => setEditingPromo({ ...editingPromo, title: e.target.value })}
                                        placeholder="Es. Sconto Pranzo, Happy Hour..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tipo Sconto</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={editingPromo.discountType || 'percentage'}
                                            onChange={e => setEditingPromo({ ...editingPromo, discountType: e.target.value as any })}
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none font-bold flex-1"
                                        >
                                            <option value="percentage">Percentuale (%)</option>
                                            <option value="fixed_amount">Importo Fisso (€)</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={editingPromo.discountValue || ''}
                                            onChange={e => setEditingPromo({ ...editingPromo, discountValue: parseFloat(e.target.value) })}
                                            placeholder="0"
                                            className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none font-black text-center"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Messaggio per il cliente</label>
                                    <textarea
                                        value={editingPromo.description || ''}
                                        onChange={e => setEditingPromo({ ...editingPromo, description: e.target.value })}
                                        placeholder="Testo che apparirà nel banner..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none h-20 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Target (A chi mostrarlo?)</label>
                                    <select
                                        value={editingPromo.target || 'all'}
                                        onChange={e => setEditingPromo({ ...editingPromo, target: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none font-bold"
                                    >
                                        <option value="all">Tutti i Tavoli</option>
                                        <option value="table_spend_above">Chi spende più di...</option>
                                        <option value="specific_items">Se ordinano...</option>
                                    </select>
                                </div>
                                {editingPromo.target === 'table_spend_above' && (
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Soglia Spesa (€)</label>
                                        <input
                                            type="number"
                                            value={editingPromo.targetValue || ''}
                                            onChange={e => setEditingPromo({ ...editingPromo, targetValue: parseFloat(e.target.value) })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none font-bold"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700">Annulla</button>
                                <button onClick={handleSavePromo} className="px-6 py-2 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-500 shadow-lg shadow-pink-900/20 flex items-center gap-2">
                                    <Save size={18} /> Salva
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {promotions.length === 0 && !isEditing && (
                            <div className="col-span-full text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                                <Gift size={48} className="mx-auto text-slate-600 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">Nessuna Promozione Attiva</h3>
                                <p className="text-slate-500 text-sm mb-6">Crea la tua prima campagna per aumentare le vendite.</p>
                                <button onClick={() => { setEditingPromo({}); setIsEditing(true); }} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold">Inizia Ora</button>
                            </div>
                        )}
                        {promotions.map(promo => (
                            <div key={promo.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-pink-500/50 transition-all group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase rounded-bl-xl ${promo.active ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {promo.active ? 'Attiva' : 'Pausa'}
                                </div>
                                <div className="mb-4">
                                    <h4 className="font-bold text-white text-lg">{promo.title}</h4>
                                    <p className="text-slate-400 text-sm line-clamp-2">{promo.description}</p>
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Sconto</p>
                                        <p className="text-2xl font-black text-pink-500">
                                            {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `€${promo.discountValue}`}
                                        </p>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex-1">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Target</p>
                                        <p className="text-sm font-medium text-white">
                                            {promo.target === 'all' ? 'Tutti i Tavoli' : promo.target === 'table_spend_above' ? `Spesa > €${promo.targetValue}` : 'Prodotti Specifici'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingPromo(promo); setIsEditing(true); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2">
                                        <Edit2 size={14} /> Modifica
                                    </button>
                                    <button onClick={() => updatePromotion({ ...promo, active: !promo.active })} className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 ${promo.active ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}>
                                        {promo.active ? 'Pausa' : 'Attiva'}
                                    </button>
                                    <button onClick={() => deletePromotion(promo.id)} className="w-10 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg flex items-center justify-center transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'automations' && (
                <div className="animate-slide-up">
                    <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 p-8 rounded-3xl border border-indigo-500/30 mb-8 flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-2">Automazioni Smart</h3>
                            <p className="text-indigo-200">Definisci regole per aumentare ticket medio e fidelizzazione.</p>
                        </div>
                        <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-600/20">
                            <Zap size={32} className="text-white" />
                        </div>
                    </div>

                    {isEditing && editingAuto.id && (
                        <div className="mb-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <h4 className="font-bold text-white mb-4 text-lg">Configura {editingAuto.title}</h4>

                            <div className="space-y-4 mb-6">
                                {/* BIRTHDAY CONFIG */}
                                {editingAuto.type === 'birthday_promo' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Sconto Regalo</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={editingAuto.config?.discountType || 'percentage'}
                                                        onChange={e => setEditingAuto({ ...editingAuto, config: { ...editingAuto.config, discountType: e.target.value as any } })}
                                                        className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none font-bold"
                                                    >
                                                        <option value="percentage">%</option>
                                                        <option value="fixed_amount">€</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        value={editingAuto.config?.discountValue || ''}
                                                        onChange={e => setEditingAuto({ ...editingAuto, config: { ...editingAuto.config, discountValue: parseFloat(e.target.value) } })}
                                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Messaggio di Auguri</label>
                                            <textarea
                                                value={editingAuto.config?.message || ''}
                                                onChange={e => setEditingAuto({ ...editingAuto, config: { ...editingAuto.config, message: e.target.value } })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none h-20 resize-none"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* REVIEW CONFIG */}
                                {editingAuto.type === 'review_request' && (
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Piattaforme Target</label>
                                        <select
                                            value={editingAuto.config?.reviewPlatform || 'all'}
                                            onChange={e => setEditingAuto({ ...editingAuto, config: { ...editingAuto.config, reviewPlatform: e.target.value as any } })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none font-bold mb-4"
                                        >
                                            <option value="all">Google & TripAdvisor</option>
                                            <option value="google">Solo Google</option>
                                            <option value="tripadvisor">Solo TripAdvisor</option>
                                        </select>
                                    </div>
                                )}

                                {/* HAPPY HOUR CONFIG */}
                                {editingAuto.type === 'happy_hour' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Inizio</label>
                                            <input
                                                type="time"
                                                value={editingAuto.config?.startTime || '18:00'}
                                                onChange={e => setEditingAuto({ ...editingAuto, config: { ...editingAuto.config, startTime: e.target.value } })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Fine</label>
                                            <input
                                                type="time"
                                                value={editingAuto.config?.endTime || '20:00'}
                                                onChange={e => setEditingAuto({ ...editingAuto, config: { ...editingAuto.config, endTime: e.target.value } })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none font-bold"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => { setIsEditing(false); setEditingAuto({}); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700">Chiudi</button>
                                <button onClick={handleSaveAuto} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-900/20">Salva Configurazione</button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {automations.map(auto => (
                            <div key={auto.id} className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl transition-all ${auto.isActive ? 'border-indigo-500/50 shadow-lg shadow-indigo-900/20' : 'opacity-75'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg ${auto.type === 'birthday_promo' ? 'bg-orange-600/20 text-orange-400' : auto.type === 'review_request' ? 'bg-purple-600/20 text-purple-400' : auto.type === 'happy_hour' ? 'bg-pink-600/20 text-pink-400' : 'bg-green-600/20 text-green-400'}`}>
                                        {auto.type === 'birthday_promo' ? <Gift size={20} /> : auto.type === 'review_request' ? <MessageCircle size={20} /> : auto.type === 'happy_hour' ? <Clock size={20} /> : <TrendingUp size={20} />}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingAuto(auto); setIsEditing(true); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <div onClick={() => toggleAutomation(auto)} className={`cursor-pointer px-2 py-1 text-[10px] font-bold uppercase rounded flex items-center gap-1 transition-colors ${auto.isActive ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                                            {auto.isActive ? 'ATTIVO' : 'PAUSA'}
                                        </div>
                                    </div>
                                </div>
                                <h4 className="font-bold text-white text-lg mb-2">{auto.title}</h4>
                                <p className="text-sm text-slate-400 mb-4 h-10">
                                    {auto.type === 'birthday_promo' && `Regala ${auto.config?.discountType === 'percentage' ? auto.config.discountValue + '%' : '€' + auto.config?.discountValue} di sconto ai festeggiati.`}
                                    {auto.type === 'review_request' && `Richiedi recensioni su ${auto.config?.reviewPlatform === 'all' ? 'Google & TripAdvisor' : auto.config?.reviewPlatform} dopo il pagamento.`}
                                    {auto.type === 'happy_hour' && `Attiva promozioni speciali dalle ${auto.config?.startTime} alle ${auto.config?.endTime}.`}
                                    {auto.type === 'smart_upsell' && "Suggerisci prodotti aggiuntivi in base all'ordine."}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'social' && (
                <div className="animate-slide-up">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* SOCIAL POST GENERATOR */}
                        {/* SOCIAL POST GENERATOR */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl">
                                <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2">
                                    <Share2 className="text-blue-500" /> Generatore Post AI
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* LEFT: INPUTS */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Argomento del Post</label>
                                            <textarea
                                                value={postTopic}
                                                onChange={(e) => setPostTopic(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-500 resize-none h-24"
                                                placeholder="Es. Nuova pizza speciale con tartufo..."
                                            />
                                        </div>

                                        <div className="p-4 border-2 border-dashed border-slate-700 rounded-xl relative hover:border-blue-500 transition-colors group">
                                            <input type="file" onChange={handleImageUpload} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="text-center text-slate-500 group-hover:text-blue-400">
                                                <ImageIcon className="mx-auto mb-2" />
                                                <p className="text-xs font-bold">Carica una foto del piatto</p>
                                            </div>
                                        </div>

                                        {postImage && (
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Scritta in sovraimpressione (Grafica)</label>
                                                <input
                                                    type="text"
                                                    value={overlayText}
                                                    onChange={(e) => setOverlayText(e.target.value)}
                                                    placeholder="Es. SCONTO 50% OGGI"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none font-black"
                                                />
                                            </div>
                                        )}

                                        <button
                                            onClick={handleGeneratePost}
                                            disabled={isGeneratingPost || !postTopic}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isGeneratingPost ? <Loader className="animate-spin" /> : <Zap size={18} />}
                                            {isGeneratingPost ? 'L\'AI sta scrivendo...' : 'Genera Post e Caption'}
                                        </button>
                                    </div>

                                    {/* RIGHT: PREVIEW */}
                                    <div className="space-y-4">
                                        {/* GRAPHIC PREVIEW */}
                                        <div className="aspect-square bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center group/preview">
                                            {postImage ? (
                                                <>
                                                    <img src={postImage} alt="Post Preview" className="w-full h-full object-cover" />

                                                    {/* OVERLAY LOGO (TOP LEFT) */}
                                                    {logoUrl && (
                                                        <div className="absolute top-4 left-4 w-12 h-12 bg-white rounded-full p-1 shadow-lg z-20">
                                                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                                        </div>
                                                    )}

                                                    {/* DELETE BUTTON (TOP RIGHT) */}
                                                    <button
                                                        onClick={() => setPostImage(null)}
                                                        className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity z-30 hover:bg-red-500"
                                                        title="Rimuovi immagine"
                                                    >
                                                        <X size={16} />
                                                    </button>

                                                    {/* OVERLAY TEXT */}
                                                    {overlayText && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                                            <h2 className="text-3xl md:text-4xl font-black text-white uppercase text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] px-4 leading-tight transform -rotate-2 border-4 border-white p-4">
                                                                {overlayText}
                                                            </h2>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-slate-600 text-center p-4">
                                                    <LayoutGrid size={40} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">Anteprima visuale</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* GENERATED CAPTION RESULT */}
                                {generatedPost && (
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 animate-fade-in relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1"><Bot size={12} /> Suggerimento AI</p>
                                            <button onClick={() => navigator.clipboard.writeText(generatedPost)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Copia"><Copy size={14} /></button>
                                        </div>
                                        <textarea
                                            readOnly
                                            value={generatedPost}
                                            className="w-full bg-transparent text-slate-300 text-sm outline-none resize-none h-48 scrollbar-thin scrollbar-thumb-slate-700"
                                        />
                                    </div>
                                )}


                                {/* ACTION BUTTONS */}
                                {(generatedPost || postImage) && (
                                    <button
                                        onClick={handleSavePost}
                                        className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl border border-slate-600 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Save size={18} /> {editingPostId ? 'Salva Modifiche' : 'Salva in Bacheca'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* CONNECT ACCOUNTS */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-white text-lg">Account Collegati</h3>
                            <button onClick={() => handleConnectClick('facebook')} className={`w-full p-4 bg-slate-900 border ${facebookConnected ? 'border-blue-500 bg-blue-900/10' : 'border-slate-800'} rounded-2xl flex items-center justify-between hover:border-blue-600 group transition-all`}>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg text-white"><Facebook size={20} /></div>
                                    <div className="text-left">
                                        <p className="font-bold text-white">Facebook Page</p>
                                        <p className="text-xs text-slate-500">{facebookConnected ? `Collegato a: ${connectedPageName || 'Pagina Ristorante'}` : 'Non collegato'}</p>
                                    </div>

                                </div>
                                <div className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${facebookConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                    {facebookConnected ? 'CONNESSO' : 'CONNETTI'}
                                </div>
                            </button>

                            <button onClick={() => handleConnectClick('instagram')} className={`w-full p-4 bg-slate-900 border ${instagramConnected ? 'border-pink-500 bg-pink-900/10' : 'border-slate-800'} rounded-2xl flex items-center justify-between hover:border-pink-600 group transition-all`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-600 rounded-lg text-white"><Instagram size={20} /></div>
                                    <div className="text-left">
                                        <p className="font-bold text-white">Instagram Business</p>
                                        <p className="text-xs text-slate-500">{instagramConnected ? 'Collegato' : 'Non collegato'}</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${instagramConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400 group-hover:bg-pink-600 group-hover:text-white'}`}>
                                    {instagramConnected ? 'CONNESSO' : 'CONNETTI'}
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* SAVED POSTS BOARD - NOW FULL WIDTH OUTSIDE GRID */}
                    <div className="mt-12">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <LayoutGrid className="text-purple-400" /> Bacheca Post Salvati
                        </h3>

                        {savedPosts.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-slate-700 rounded-2xl bg-slate-900/50">
                                <p className="text-slate-500">Nessun post salvato. Generane uno nuovo sopra!</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 w-full">
                                {savedPosts.map(post => (
                                    <SavedPostCard
                                        key={post.id}
                                        post={post}
                                        logoUrl={logoUrl}
                                        onPublish={handlePublish}
                                        onEdit={handleEditPost}
                                        onDelete={handleDeletePost}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* SOCIAL CONNECT MODAL */}
            {showConnectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden shadow-2xl scale-100 animate-scale-in">
                        {/* HEADER */}
                        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                {showConnectModal === 'facebook' ? <Facebook className="text-blue-600" /> : <Instagram className="text-pink-600" />}
                                Connetti {showConnectModal === 'facebook' ? 'Facebook' : 'Instagram'}
                            </h3>
                            <button onClick={() => setShowConnectModal(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>

                        {/* CONTENT */}
                        <div className="p-6">
                            {connectStep === 'login' && (
                                <div className="text-center space-y-6">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-4">
                                        {showConnectModal === 'facebook' ? <Facebook size={32} className="text-blue-500" /> : <Instagram size={32} className="text-pink-500" />}
                                    </div>
                                    <p className="text-slate-300">
                                        Per pubblicare automaticamente i post, devi autorizzare RistoSync a gestire la tua Pagina.
                                    </p>
                                    <button
                                        onClick={proceedToPageSelection}
                                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                                        ${showConnectModal === 'facebook' ? 'bg-[#1877F2] hover:bg-[#166fe5]' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'}`}
                                    >
                                        Continua con {showConnectModal === 'facebook' ? 'Facebook' : 'Instagram'}
                                    </button>

                                    <div className="pt-4 border-t border-slate-800">
                                        <button
                                            onClick={() => setConnectStep('api_config')}
                                            className="text-xs text-slate-500 hover:text-white underline"
                                        >
                                            Ho già un Token API (Configurazione Avanzata)
                                        </button>
                                    </div>

                                </div>
                            )}

                            {connectStep === 'select_page' && (
                                <div className="space-y-4 animate-fade-in">
                                    <h4 className="font-bold text-white">Seleziona la Pagina da gestire:</h4>
                                    {availablePages.length === 0 ? (
                                        <div className="flex justify-center p-8"><Loader className="animate-spin text-slate-500" /></div>
                                    ) : (
                                        <div className="space-y-2">
                                            {availablePages.map(page => (
                                                <div
                                                    key={page}
                                                    onClick={() => setSelectedPage(page)}
                                                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${selectedPage === page ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
                                                >
                                                    <span className="text-white font-medium">{page}</span>
                                                    {selectedPage === page && <CheckCircle size={18} className="text-blue-400" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={confirmConnection}
                                        disabled={!selectedPage}
                                        className="w-full mt-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Conferma e Collega
                                    </button>
                                </div>
                            )}


                            {connectStep === 'api_config' && (
                                <div className="space-y-4 animate-fade-in text-left">
                                    <h4 className="font-bold text-white">Configurazione Manuale API</h4>
                                    <p className="text-xs text-slate-400">Inserisci il Page ID e l'Access Token a lunga durata.</p>

                                    <div className="bg-blue-900/20 border border-blue-800 p-3 rounded-lg">
                                        <p className="text-[10px] text-blue-300 mb-2">
                                            Non sai dove trovare questi dati? Usa il Graph API Explorer di Facebook.
                                        </p>
                                        <a
                                            href="https://developers.facebook.com/tools/explorer/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-bold text-blue-400 hover:text-white flex items-center gap-1 underline"
                                        >
                                            Apri Graph API Explorer <ExternalLink size={10} />
                                        </a>
                                    </div>


                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Page ID / User ID</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 10492819283"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                            id="manualPageId"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Access Token (Long-Lived)</label>
                                        <input
                                            type="password"
                                            placeholder="EAAG..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                            id="manualToken"
                                        />
                                    </div>

                                    <button
                                        onClick={async () => {
                                            const pId = (document.getElementById('manualPageId') as HTMLInputElement).value;
                                            const tkn = (document.getElementById('manualToken') as HTMLInputElement).value;

                                            if (!pId || !tkn) {
                                                showToast("Inserisci sia il Page ID che il Token", "error");
                                                return;
                                            }

                                            try {
                                                const currentSettings = getAppSettings();
                                                if (!currentSettings.restaurantProfile) currentSettings.restaurantProfile = {}; // Safety check

                                                // Update Social Config
                                                currentSettings.restaurantProfile.socialApiConfig = {
                                                    facebookPageId: pId,
                                                    facebookAccessToken: tkn,
                                                    instagramUserId: currentSettings.restaurantProfile.socialApiConfig?.instagramUserId // Preserve if exists
                                                };

                                                await saveAppSettings(currentSettings);

                                                // Update UI State
                                                if (showConnectModal === 'facebook') {
                                                    setFacebookConnected(true);
                                                    setConnectedPageName(`Pagina ID: ${pId}`);
                                                } else {
                                                    setInstagramConnected(true);
                                                }

                                                setConnectStep('success');
                                                showToast("API Token salvato con successo!", "success");

                                                setTimeout(() => {
                                                    setShowConnectModal(null);
                                                }, 1500);

                                            } catch (e) {
                                                console.error("Save failed", e);
                                                showToast("Errore nel salvataggio impostazioni", "error");
                                            }
                                        }}
                                        className="w-full mt-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                                    >
                                        Salva e Connetti
                                    </button>

                                    <button
                                        onClick={() => setConnectStep('login')}
                                        className="w-full py-2 text-slate-500 text-sm hover:text-white"
                                    >
                                        Indietro
                                    </button>
                                </div>
                            )}

                            {connectStep === 'success' && (

                                <div className="text-center py-8 animate-fade-in">
                                    <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                                    <h4 className="font-bold text-white text-xl">Collegamento Riuscito!</h4>
                                    <p className="text-slate-400 mt-2">Ora puoi pubblicare direttamente sulla pagina.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}




