import React, { useState, useEffect } from 'react';
import { Mail, Send, Paperclip, Trash2, Reply, CheckCircle, AlertCircle, Loader, X, FileText, Download, Inbox } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Message {
    id: string;
    sender_id: string;
    recipient_id: string | null;
    subject: string;
    content: string;
    attachment_url: string | null;
    is_read: boolean;
    created_at: string;
    sender_email?: string; // Optional for UI
}

interface MessagesPanelProps {
    session: any;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
    onClose?: () => void;
}

export default function MessagesPanel({ session, onClose, showToast, showConfirm }: MessagesPanelProps) {
    const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [loading, setLoading] = useState(false);

    // Compose State
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetchMessages();

        // Realtime subscription for new messages
        const channel = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMessage = payload.new as Message;
                if (newMessage.recipient_id === session.user.id || newMessage.recipient_id === null) {
                    fetchMessages();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [session.user.id]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            // Get hidden and read messages from local storage
            const hidden = JSON.parse(localStorage.getItem('hidden_messages') || '[]');
            const readBroadcasts = JSON.parse(localStorage.getItem('read_broadcasts') || '[]');

            // Fetch messages where user is recipient OR broadcast (null)
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`recipient_id.eq.${session.user.id},recipient_id.is.null`)
                .order('created_at', { ascending: false });

            if (data) {
                // Filter out hidden messages AND apply read status for broadcasts
                const visibleMessages = data
                    .filter(m => !hidden.includes(m.id))
                    .map(m => {
                        if (m.recipient_id === null && readBroadcasts.includes(m.id)) {
                            return { ...m, is_read: true };
                        }
                        return m;
                    });
                setMessages(visibleMessages);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
        setLoading(false);
    };

    const handleSendMessage = async () => {
        if (!subject || !content) {
            showToast("Compila tutti i campi obbligatori.", 'error');
            return;
        }

        setIsSending(true);
        let attachmentUrl = null;

        try {
            // Upload attachment if exists
            if (attachment) {
                const fileExt = attachment.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
                const filePath = `${session.user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(filePath, attachment);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(filePath);

                attachmentUrl = publicUrl;
            }

            // Send Message (To Admin - we assume Admin reads all messages without specific recipient_id or we set proper admin ID)
            // For MVP, messages from users have recipient_id = NULL or a specific Admin ID. 
            // Better: User messages should identify the sender. Admin queries "sender_id != admin_id".
            // Let's set recipient_id to a known Admin ID or hardcode it. 
            // We'll leave recipient_id NULL for NOW to imply "System/Admin".
            // WAIT: If recipient_id is NULL, policies say "Broadcast". 
            // Let's look up the Super Admin ID.

            // For now, let's assume specific Logic:
            // If User sends -> recipient_id is fetched via a quick query or hardcoded to the Super Admin Email.
            // Let's just find the profile with the SUPER_ADMIN_EMAIL.
            const { data: adminProfile } = await supabase.from('profiles').select('id').eq('email', 'castro.massimo@yahoo.com').single();
            const adminId = adminProfile?.id;

            if (!adminId) {
                showToast("Impossibile trovare l'amministratore. Riprova più tardi.", 'error');
                setIsSending(false);
                return;
            }

            const { error } = await supabase.from('messages').insert({
                sender_id: session.user.id,
                recipient_id: adminId,
                subject,
                content,
                attachment_url: attachmentUrl,
                is_read: false
            });

            if (error) throw error;

            setSubject('');
            setContent('');
            setAttachment(null);
            setActiveTab('inbox');
            showToast("Messaggio inviato con successo!", 'success');
            fetchMessages(); // Refresh sent items if we had a Sent tab

        } catch (error: any) {
            showToast("Errore nell'invio: " + error.message, 'error');
        }
        setIsSending(false);
    };

    const deleteMessage = async (id: string) => {
        const confirmed = await showConfirm("Elimina Messaggio", "Vuoi cancellare definitivamente questo messaggio?");
        if (!confirmed) return;

        const msgToDelete = messages.find(m => m.id === id);

        // Se è un broadcast (recipient_id === null), nascondilo solo localmente
        if (msgToDelete && msgToDelete.recipient_id === null) {
            const hidden = JSON.parse(localStorage.getItem('hidden_messages') || '[]');
            localStorage.setItem('hidden_messages', JSON.stringify([...hidden, id]));

            setMessages(prev => prev.filter(m => m.id !== id));
            if (selectedMessage?.id === id) setSelectedMessage(null);
            showToast("Messaggio eliminato", 'success');
            return;
        }

        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (!error) {
            setMessages(prev => prev.filter(m => m.id !== id));
            if (selectedMessage?.id === id) setSelectedMessage(null);
            showToast("Messaggio eliminato", 'success');
        } else {
            showToast("Errore eliminazione: " + error.message, 'error');
        }
    };

    const markAsRead = async (msg: Message) => {
        if (msg.is_read) return;

        // Broadcast: Local Only
        if (msg.recipient_id === null) {
            const readBroadcasts = JSON.parse(localStorage.getItem('read_broadcasts') || '[]');
            if (!readBroadcasts.includes(msg.id)) {
                localStorage.setItem('read_broadcasts', JSON.stringify([...readBroadcasts, msg.id]));
            }
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
            window.dispatchEvent(new Event('messages:updated')); // Sync Badge
            return;
        }

        // Direct: DB Update
        setTimeout(async () => {
            const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
            if (!error) {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
                window.dispatchEvent(new Event('messages:updated')); // Sync Badge
            }
        }, 2000);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white animate-fade-in relative">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <Mail className="text-orange-500" /> Centro Messaggi
                    </h2>
                    <p className="text-slate-400 text-sm">Comunicazioni di servizio e supporto dedicato</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setActiveTab('inbox'); setSelectedMessage(null); }}
                        className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'inbox' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Inbox size={18} /> In Arrivo
                    </button>
                    <button
                        onClick={() => { setActiveTab('compose'); setSelectedMessage(null); }}
                        className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'compose' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Send size={18} /> Scrivi
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex relative">

                {/* INBOX VIEW */}
                {activeTab === 'inbox' && (
                    <div className={`flex-1 flex flex-col md:flex-row h-full transition-all duration-300 ${selectedMessage ? 'md:flex' : 'flex'}`}>

                        {/* List */}
                        <div className={`w-full md:w-1/3 border-r border-slate-800 overflow-y-auto ${selectedMessage ? 'hidden md:block' : 'block'}`}>
                            {loading ? (
                                <div className="flex justify-center items-center h-40"><Loader className="animate-spin text-indigo-500" /></div>
                            ) : messages.length === 0 ? (
                                <div className="p-10 text-center text-slate-500 flex flex-col items-center">
                                    <Inbox size={48} strokeWidth={1} className="mb-4 opacity-50" />
                                    <p>Nessun messaggio ricevuto.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            onClick={() => { setSelectedMessage(msg); markAsRead(msg); }}
                                            className={`p-4 cursor-pointer transition-all border-b border-slate-800/50 relative overflow-hidden group
                                                ${selectedMessage?.id === msg.id ? 'bg-indigo-900/20' : 'hover:bg-slate-900/50'} 
                                                ${!msg.is_read && msg.recipient_id !== null ? 'border-l-4 border-l-orange-500 bg-slate-900' : 'border-l-4 border-l-transparent opacity-70 hover:opacity-100'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-sm font-bold flex items-center gap-2 ${!msg.is_read && msg.recipient_id !== null ? 'text-white' : 'text-slate-400'}`}>
                                                    {msg.recipient_id === null ? '📢 RistoSync Team' : '👤 Supporto'}
                                                    {!msg.is_read && msg.recipient_id !== null && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">NUOVO</span>}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    {new Date(msg.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className={`text-base mb-1 truncate ${!msg.is_read && msg.recipient_id !== null ? 'font-black text-white' : 'font-medium text-slate-300'}`}>
                                                {msg.subject}
                                            </h4>
                                            <p className="text-xs text-slate-500 line-clamp-2">{msg.content}</p>
                                            {msg.attachment_url && <Paperclip size={12} className="text-slate-500 mt-2" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Detail */}
                        <div className={`flex-1 bg-slate-900/30 flex-col ${selectedMessage ? 'flex' : 'hidden md:flex'}`}>
                            {selectedMessage ? (
                                <div className="flex-1 flex flex-col h-full overflow-hidden">
                                    {/* Toolbar Mobile */}
                                    <div className="md:hidden p-4 border-b border-slate-800 flex gap-2">
                                        <button onClick={() => setSelectedMessage(null)} className="flex items-center gap-1 text-slate-400 text-sm">
                                            <Reply size={16} className="rotate-90" /> Indietro
                                        </button>
                                    </div>

                                    {/* Message Body */}
                                    <div className="p-8 overflow-y-auto flex-1">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h1 className="text-2xl font-black text-white mb-2">{selectedMessage.subject}</h1>
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <span>Da: <strong>{selectedMessage.recipient_id === null ? 'RistoSync Team (Broadcast)' : 'Supporto Clienti'}</strong></span>
                                                    <span>•</span>
                                                    <span>{new Date(selectedMessage.created_at).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            {selectedMessage.recipient_id !== null && (
                                                <button
                                                    onClick={() => deleteMessage(selectedMessage.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
                                                    title="Elimina"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-line mb-8 p-6 bg-slate-950 rounded-2xl border border-slate-800">
                                            {selectedMessage.content}
                                        </div>

                                        {selectedMessage.attachment_url && (
                                            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 flex items-center gap-4 max-w-sm mb-8">
                                                <div className="bg-indigo-500/20 p-3 rounded-lg"><FileText className="text-indigo-400" /></div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-sm font-bold text-white truncate">Allegato</p>
                                                    <p className="text-xs text-indigo-300">File allegato al messaggio</p>
                                                </div>
                                                <a
                                                    href={selectedMessage.attachment_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                                                >
                                                    <Download size={18} />
                                                </a>
                                            </div>
                                        )}

                                        <div className="mt-8 border-t border-slate-800 pt-8">
                                            <h3 className="text-lg font-bold text-white mb-4">Risposta Rapida</h3>
                                            <button
                                                onClick={() => {
                                                    setSubject(`RE: ${selectedMessage.subject}`);
                                                    setActiveTab('compose');
                                                }}
                                                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
                                            >
                                                <Reply size={18} /> Rispondi al Supporto
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50">
                                    <Mail size={64} className="mb-4" strokeWidth={1} />
                                    <p className="text-lg">Seleziona un messaggio per leggerlo</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* COMPOSE VIEW */}
                {activeTab === 'compose' && (
                    <div className="flex-1 flex justify-center p-6 md:p-10 pb-32 overflow-y-auto">
                        <div className="w-full max-w-2xl">
                            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                                <Send className="text-orange-500" /> Scrivi allo Staff
                            </h2>

                            <div className="space-y-6 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl mb-10">
                                <div>
                                    <label className="block text-slate-400 text-sm font-bold mb-2 uppercase">Oggetto</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Es: Conferma Pagamento, Problema Tecnico..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-sm font-bold mb-2 uppercase">Messaggio</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Scrivi qui il tuo messaggio..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors h-40 resize-none leading-relaxed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-sm font-bold mb-2 uppercase">Allegato (Opzionale)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-full bg-slate-950 border border-dashed border-slate-700 rounded-xl px-4 py-4 text-slate-400 flex items-center justify-center gap-3 hover:border-orange-500/50 transition-colors">
                                            <Paperclip size={20} />
                                            <span className="truncate">{attachment ? attachment.name : 'Clicca per caricare un file (PDF, JPG, PNG)'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        onClick={() => setActiveTab('inbox')}
                                        className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isSending}
                                        className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-600/20 transform active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSending ? <Loader className="animate-spin" /> : <Send size={20} />}
                                        {isSending ? 'Invio in corso...' : 'Invia Messaggio'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
