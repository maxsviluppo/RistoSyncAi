import React, { useState, useEffect, useRef } from 'react';
import { Mail, Send, Paperclip, Trash2, CheckCircle, Search, User, Filter, AlertCircle, Loader, MessageCircle, X, Reply, ChevronDown, Store, ArrowLeft, Download, Inbox, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AdminMessagesPanelProps {
    profiles: any[];
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Message {
    id: string;
    sender_id: string;
    recipient_id: string | null; // null for broadcast
    subject: string;
    content: string;
    attachment_url?: string;
    is_read: boolean;
    created_at: string;
    sender_email?: string; // enriched
    restaurant_name?: string; // enriched
}

export default function AdminMessagesPanel({ profiles, showToast }: AdminMessagesPanelProps) {
    const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [loading, setLoading] = useState(false);

    // CDM State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Compose State
    const [recipientId, setRecipientId] = useState<string>('broadcast'); // 'broadcast' or uuid
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [sending, setSending] = useState(false);

    // Recipient Selector State
    const [isRecipientOpen, setIsRecipientOpen] = useState(false);
    const [recipientSearch, setRecipientSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close Click Outside Recipient Selector
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsRecipientOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Messages (Inbox for Admin)
    useEffect(() => {
        if (!supabase) return;
        fetchMessages();

        const channel = supabase
            .channel('admin_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                fetchMessages();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            // Enrich with sender details
            const enriched = data?.map(msg => {
                const senderProfile = profiles.find(p => p.id === msg.sender_id);
                return {
                    ...msg,
                    sender_email: senderProfile?.email || 'Sconosciuto',
                    restaurant_name: senderProfile?.restaurant_name || 'Ristorante Sconosciuto'
                };
            });
            setMessages(enriched || []);
        }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!subject.trim() || !content.trim()) {
            showToast("Oggetto e messaggio sono obbligatori.", 'error');
            return;
        }

        setSending(true);
        let attachmentUrl = null;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utente non autenticato");

            // Upload Attachment
            if (attachment) {
                const fileExt = attachment.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(fileName, attachment);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(fileName);

                attachmentUrl = publicUrl;
            }

            // Insert Message Logic
            let payload = [];

            if (recipientId === 'broadcast') {
                payload = profiles.map(p => ({
                    sender_id: user.id,
                    recipient_id: p.id,
                    subject: subject,
                    content: content,
                    attachment_url: attachmentUrl,
                    is_read: false
                }));
            } else {
                payload = [{
                    sender_id: user.id,
                    recipient_id: recipientId,
                    subject: subject,
                    content: content,
                    attachment_url: attachmentUrl,
                    is_read: false
                }];
            }

            const { error } = await supabase.from('messages').insert(payload);

            if (error) throw error;

            showToast(recipientId === 'broadcast' ? `Messaggio inviato a ${payload.length} utenti!` : "Messaggio inviato con successo!", 'success');
            setSubject('');
            setContent('');
            setAttachment(null);
            setActiveTab('inbox');

        } catch (err: any) {
            console.error(err);
            showToast("Errore invio: " + err.message, 'error');
        } finally {
            setSending(false);
        }
    };

    const confirmDelete = async () => {
        if (!showDeleteConfirm) return;
        const id = showDeleteConfirm;

        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (error) {
            showToast("Errore eliminazione", 'error');
        } else {
            setMessages(prev => prev.filter(m => m.id !== id));
            showToast("Messaggio eliminato con successo", 'success');
            if (selectedMessage?.id === id) setSelectedMessage(null);
        }
        setShowDeleteConfirm(null);
    };

    const handleMarkRead = async (id: string) => {
        const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', id);
        if (!error) {
            setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        }
    };

    const handleReply = (msg: Message) => {
        if (!msg.is_read) handleMarkRead(msg.id);
        setSubject(`Re: ${msg.subject}`);
        setRecipientId(msg.sender_id);
        setActiveTab('compose');
        setSelectedMessage(null); // Switch to compose view
    };

    // Filter Profiles for Selector
    const filteredProfiles = profiles.filter(p => {
        const search = recipientSearch.toLowerCase();
        return (p.restaurant_name?.toLowerCase() || '').includes(search) ||
            (p.email?.toLowerCase() || '').includes(search);
    });

    const getRecipientLabel = () => {
        if (recipientId === 'broadcast') return '📢 TUTTI I RISTORANTI (Broadcast)';
        const found = profiles.find(p => p.id === recipientId);
        return found ? `👤 ${found.restaurant_name} (${found.email})` : 'Seleziona Destinatario';
    };

    return (
        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-0 shadow-xl h-[700px] flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="bg-slate-800 p-6 flex justify-between items-center border-b border-slate-700">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Mail className="text-indigo-500" /> Centro Messaggi
                </h2>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                    <button
                        onClick={() => { setActiveTab('inbox'); setSelectedMessage(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'inbox' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <MessageCircle size={16} /> Posta in Arrivo
                        {messages.some(m => !m.is_read) && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                    </button>
                    <button
                        onClick={() => { setActiveTab('compose'); setSelectedMessage(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'compose' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Send size={16} /> Componi / Broadcast
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex relative bg-slate-900">

                {/* LIST VIEW (Left Pane) */}
                {activeTab === 'inbox' && (
                    <div className={`w-full md:w-1/3 border-r border-slate-800 flex flex-col ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-4 border-b border-slate-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                <input type="text" placeholder="Cerca msg..." className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scroll">
                            {loading ? (
                                <div className="flex justify-center p-8"><Loader className="animate-spin text-slate-500" /></div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                                    <Inbox size={32} className="opacity-30" />
                                    <span className="text-xs">Nessun messaggio</span>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        onClick={() => { setSelectedMessage(msg); if (!msg.is_read) handleMarkRead(msg.id); }}
                                        className={`p-4 border-b border-slate-800 cursor-pointer transition-colors relative 
                                            ${selectedMessage?.id === msg.id ? 'bg-indigo-900/20' : 'hover:bg-slate-800/50'} 
                                            ${!msg.is_read ? 'bg-slate-800/40 border-l-4 border-l-orange-500' : 'opacity-60 border-l-4 border-l-transparent hover:opacity-100'}
                                        `}
                                    >
                                        <div className="flex justify-between mb-1">
                                            <span className={`text-xs font-bold truncate max-w-[150px] flex items-center gap-1 ${!msg.is_read ? 'text-white' : 'text-slate-400'}`}>
                                                {msg.restaurant_name}
                                                {!msg.is_read && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ml-1">NUOVO</span>}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{new Date(msg.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className={`text-sm mb-1 truncate ${!msg.is_read ? 'font-bold text-white' : 'text-slate-300'}`}>
                                            {msg.subject}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">{msg.content}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* DETAIL / COMPOSE (Right Pane) */}
                <div className={`flex-1 flex flex-col bg-slate-900/50 ${activeTab === 'inbox' && !selectedMessage ? 'hidden md:flex' : 'flex'}`}>

                    {/* INBOX DETAIL VIEW */}
                    {activeTab === 'inbox' && (
                        selectedMessage ? (
                            <div className="flex-1 flex flex-col h-full animate-fade-in text-white">
                                {/* Mobile Header */}
                                <div className="md:hidden p-4 border-b border-slate-800 flex items-center gap-2">
                                    <button onClick={() => setSelectedMessage(null)} className="text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
                                    <span className="font-bold text-white">Dettaglio Messaggio</span>
                                </div>

                                <div className="p-8 overflow-y-auto flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h1 className="text-2xl font-black text-white mb-2">{selectedMessage.subject}</h1>
                                            <div className="flex items-center gap-3 text-sm text-slate-400">
                                                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg">
                                                    <Store size={14} className="text-indigo-400" />
                                                    <span className="text-white font-bold">{selectedMessage.restaurant_name}</span>
                                                </div>
                                                <span className="bg-slate-800 px-2 py-1 rounded text-xs">{selectedMessage.sender_email}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setShowDeleteConfirm(selectedMessage.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-500 transition-colors" title="Elimina">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-line mb-8 p-6 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                                        {selectedMessage.content}
                                    </div>

                                    {selectedMessage.attachment_url && (
                                        <div className="mb-8">
                                            <a href={selectedMessage.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-4 py-3 bg-indigo-900/20 border border-indigo-500/30 rounded-xl hover:bg-indigo-900/40 transition-colors group">
                                                <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 group-hover:scale-110 transition-transform"><Paperclip size={20} /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">Allegato disponibile</p>
                                                    <p className="text-xs text-indigo-300">Clicca per scaricare</p>
                                                </div>
                                                <Download size={16} className="text-indigo-400 ml-2" />
                                            </a>
                                        </div>
                                    )}

                                    <div className="border-t border-slate-800 pt-6">
                                        <button
                                            onClick={() => handleReply(selectedMessage)}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                                        >
                                            <Reply size={18} /> Rispondi a {selectedMessage.restaurant_name}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-40">
                                <Mail size={64} className="mb-4" strokeWidth={1} />
                                <p className="text-lg font-medium">Seleziona un messaggio per leggerlo</p>
                            </div>
                        )
                    )}

                    {/* COMPOSE VIEW */}
                    {activeTab === 'compose' && (
                        <div className="p-8 overflow-y-auto h-full flex justify-center">
                            <div className="w-full max-w-2xl space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Destinatario</label>

                                    {/* Custom Dropdown Selector */}
                                    <div className="relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setIsRecipientOpen(!isRecipientOpen)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white flex justify-between items-center hover:border-indigo-500 transition-colors"
                                        >
                                            <span className="font-bold flex items-center gap-2 truncate">
                                                {getRecipientLabel()}
                                            </span>
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isRecipientOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isRecipientOpen && (
                                            <div className="absolute top-full left-0 w-full bg-slate-900 border border-slate-700 rounded-xl mt-2 z-50 max-h-80 shadow-2xl overflow-hidden flex flex-col animate-slide-up">
                                                <div className="p-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                                                    <div className="relative">
                                                        <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Cerca ristorante o email..."
                                                            value={recipientSearch}
                                                            onChange={(e) => setRecipientSearch(e.target.value)}
                                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto flex-1 custom-scroll p-2 space-y-1">
                                                    <button
                                                        onClick={() => { setRecipientId('broadcast'); setIsRecipientOpen(false); }}
                                                        className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors ${recipientId === 'broadcast' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                                                    >
                                                        <div className="p-2 bg-white/10 rounded-full"><MessageCircle size={16} /></div>
                                                        <div>
                                                            <div className="font-bold text-sm">📢 TUTTI I RISTORANTI (Broadcast)</div>
                                                            <div className="text-xs opacity-70">Invia a tutti gli utenti attivi</div>
                                                        </div>
                                                    </button>

                                                    {filteredProfiles.length === 0 && (
                                                        <div className="p-4 text-center text-xs text-slate-500">Nessun risultato trovato</div>
                                                    )}

                                                    {filteredProfiles.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => { setRecipientId(p.id); setIsRecipientOpen(false); }}
                                                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${recipientId === p.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-xs">
                                                                {p.restaurant_name?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <div className="font-bold text-sm truncate">{p.restaurant_name}</div>
                                                                <div className="text-xs opacity-70 truncate">{p.email}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Oggetto</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Es. Richiesta informazioni"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors placeholder-slate-600 font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Messaggio</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Scrivi qui il messaggio..."
                                        className="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors placeholder-slate-600 resize-none leading-relaxed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Allegato (Opzionale)</label>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2"
                                        >
                                            <Paperclip size={16} /> {attachment ? 'Cambia File' : 'Seleziona File'}
                                        </button>
                                        {attachment && (
                                            <div className="text-xs text-slate-300 flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                                                {attachment.name}
                                                <button onClick={() => setAttachment(null)} className="text-red-400 hover:text-red-300"><X size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3 justify-end">
                                    <button
                                        onClick={() => { setActiveTab('inbox'); setSelectedMessage(null); }}
                                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        onClick={handleSend}
                                        disabled={sending}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {sending ? <Loader className="animate-spin" /> : <><Send size={20} /> Invia </>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform scale-100 animate-slide-up">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">Elimina Messaggio</h3>
                            <p className="text-slate-400 mb-6">
                                Sei sicuro di voler eliminare questo messaggio? L'azione non può essere annullata.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20 transition-colors"
                                >
                                    Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

