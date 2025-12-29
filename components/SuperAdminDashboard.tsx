import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { supabase, signOut } from '../services/supabase';
import AdminMessagesPanel from './AdminMessagesPanel';
import { ShieldCheck, Users, Database, LogOut, RefreshCw, Smartphone, PlayCircle, PauseCircle, AlertTriangle, Copy, Check, User, PlusCircle, Edit2, Save, X, FlaskConical, Terminal, Trash2, Lock, LifeBuoy, Globe, Image as ImageIcon, FileText, MapPin, CreditCard, Mail, MessageCircle, Share2, PhoneCall, Facebook, Instagram, Store, Compass, Wrench, Calendar, DollarSign, Briefcase, Clock, AlertOctagon, UserCheck, Banknote, CalendarCheck, Settings, Inbox, Hash, MonitorPlay, Shield, StickyNote, Sparkles } from 'lucide-react';

interface SuperAdminDashboardProps {
    onEnterApp: () => void;
}

const SUPER_ADMIN_EMAIL = 'castro.massimo@yahoo.com';

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onEnterApp }) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dashboardTab, setDashboardTab] = useState<'users' | 'messages'>('users');
    const [unreadCount, setUnreadCount] = useState(0);
    const [copiedSQL, setCopiedSQL] = useState(false);
    const [copiedDemo, setCopiedDemo] = useState(false);
    const [copiedRecovery, setCopiedRecovery] = useState(false);
    const [copiedFix, setCopiedFix] = useState(false);
    const [currentEmail, setCurrentEmail] = useState<string>('');
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [showFixModal, setShowFixModal] = useState(false);

    // Global Config State
    const [globalContactEmail, setGlobalContactEmail] = useState('info@ristosyncai.it');
    const [globalDefaultCost, setGlobalDefaultCost] = useState('49.90');

    // Global Bank & Support Data
    const [globalIban, setGlobalIban] = useState('IT73W0623074792000057589384');
    const [globalBankHolder, setGlobalBankHolder] = useState('Massimo Castro');
    const [globalSupportPhone, setGlobalSupportPhone] = useState('3478127440');

    // Link Promo Data
    const [promoName, setPromoName] = useState('Promo Launch');
    const [promoCost, setPromoCost] = useState('29.90');
    const [promoDuration, setPromoDuration] = useState('3 Mesi');
    const [promoDeadline, setPromoDeadline] = useState('72'); // Ore
    const [promoActive, setPromoActive] = useState(false);

    const [isSavingGlobal, setIsSavingGlobal] = useState(false);

    // Edit State
    const [viewingProfile, setViewingProfile] = useState<any | null>(null);
    const [isEditingRegistry, setIsEditingRegistry] = useState(false);
    const [registryForm, setRegistryForm] = useState<any>({});
    const [subDate, setSubDate] = useState('');
    const [subCost, setSubCost] = useState('');
    const [subPlan, setSubPlan] = useState('');



    // Agent State
    const [agentName, setAgentName] = useState('');
    const [agentIban, setAgentIban] = useState('');
    const [agentType, setAgentType] = useState('Percentage');
    const [agentValue, setAgentValue] = useState('');
    const [agentLastPay, setAgentLastPay] = useState('');
    const [agentNextPay, setAgentNextPay] = useState('');

    // Inline Name Edit
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Dialog/Toast state
    const [showDialog, setShowDialog] = useState(false);
    const [dialogConfig, setDialogConfig] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
    } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Helper functions for dialogs
    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setDialogConfig({ title, message, onConfirm, confirmText: 'Conferma', cancelText: 'Annulla' });
        setShowDialog(true);
    };

    const showToastMsg = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleDialogConfirm = () => {
        if (dialogConfig?.onConfirm) dialogConfig.onConfirm();
        setShowDialog(false);
        setDialogConfig(null);
    };

    const handleDialogCancel = () => {
        setShowDialog(false);
        setDialogConfig(null);
    };

    useEffect(() => {
        supabase?.auth.getUser().then(({ data }) => {
            if (data.user?.email) setCurrentEmail(data.user.email);
            // Fetch unread messages
            if (data.user?.id) {
                const fetchUnread = async () => {
                    const { count } = await supabase!.from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('recipient_id', data.user!.id)
                        .eq('is_read', false);
                    setUnreadCount(count || 0);
                };
                fetchUnread();

                const channel = supabase!.channel('admin_unread')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${data.user.id}` }, () => fetchUnread())
                    .subscribe();
            }
        });

        fetchProfiles();
        const interval = setInterval(fetchProfiles, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchProfiles = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (data) {
            setProfiles(data);

            // Extract Global Config from Super Admin Profile
            const superAdminProfile = data.find(p => p.email === SUPER_ADMIN_EMAIL);
            if (superAdminProfile && superAdminProfile.settings?.globalConfig) {
                const config = superAdminProfile.settings.globalConfig;
                setGlobalContactEmail(config.contactEmail || 'info@ristosyncai.it');
                setGlobalDefaultCost(config.defaultCost || '49.90');

                // Load Bank & Phone
                if (config.bankDetails) {
                    setGlobalIban(config.bankDetails.iban || '');
                    setGlobalBankHolder(config.bankDetails.holder || '');
                }
                if (config.supportContact) {
                    setGlobalSupportPhone(config.supportContact.phone || '');
                }

                // Load Promo
                if (config.promo) {
                    setPromoName(config.promo.name || 'Promo Launch');
                    setPromoCost(config.promo.cost || '29.90');
                    setPromoDuration(config.promo.duration || '3 Mesi');
                    setPromoDeadline(config.promo.deadlineHours || '72');
                    setPromoActive(config.promo.active || false);
                }
            }
        }
        if (error) console.error("Errore recupero profili:", error);
        setLoading(false);
    };

    const saveGlobalConfig = async () => {
        if (!supabase) return;
        setIsSavingGlobal(true);

        // Find Super Admin ID
        const adminProfile = profiles.find(p => p.email === SUPER_ADMIN_EMAIL);
        if (!adminProfile) {
            alert("Profilo Super Admin non trovato nel DB.");
            setIsSavingGlobal(false);
            return;
        }

        const currentSettings = adminProfile.settings || {};
        const updatedSettings = {
            ...currentSettings,
            globalConfig: {
                contactEmail: globalContactEmail,
                defaultCost: globalDefaultCost,
                bankDetails: {
                    iban: globalIban,
                    holder: globalBankHolder
                },
                supportContact: {
                    phone: globalSupportPhone
                },
                promo: {
                    name: promoName,
                    cost: promoCost,
                    duration: promoDuration,
                    deadlineHours: promoDeadline,
                    active: promoActive
                }
            }
        };

        // 1. Update DB Profile
        const { error } = await supabase
            .from('profiles')
            .update({ settings: updatedSettings })
            .eq('id', adminProfile.id);

        if (error) {
            showToastMsg("❌ Errore salvataggio DB: " + error.message, 'error');
        } else {
            // 2. Upload public JSON for Landing Page sync
            try {
                const publicConfig = {
                    monthlyCost: globalDefaultCost,
                    promo: {
                        name: promoName,
                        cost: promoCost,
                        duration: promoDuration,
                        deadlineHours: promoDeadline,
                        active: promoActive
                    },
                    lastUpdated: new Date().toISOString()
                };

                const blob = new Blob([JSON.stringify(publicConfig)], { type: 'application/json' });
                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload('global_pricing.json', blob, { upsert: true });

                if (uploadError) console.warn("Upload JSON fallito (potrebbe non essere critico):", uploadError);

            } catch (jsonErr) {
                console.error("JSON sync error", jsonErr);
            }

            showToastMsg("✅ Configurazione Globale salvata & Sincronizzata!", 'success');
            fetchProfiles();
        }
        setIsSavingGlobal(false);
    };

    const openRegistry = async (profile: any) => {
        // Fetch last_sign_in_at from auth.users using RPC function
        let enrichedProfile = { ...profile };

        if (supabase) {
            try {
                const { data: authData, error } = await supabase
                    .rpc('get_user_auth_data', { user_id: profile.id });

                if (!error && authData && authData.length > 0) {
                    enrichedProfile.last_sign_in_at = authData[0].last_sign_in_at;
                }
            } catch (err) {
                console.error('Error fetching auth data:', err);
            }
        }

        setViewingProfile(enrichedProfile);
        const profileData = enrichedProfile.settings?.restaurantProfile || {};

        // Load Registry Data
        setRegistryForm({
            businessName: profileData.businessName || '',
            responsiblePerson: profileData.responsiblePerson || '',
            vatNumber: profileData.vatNumber || '',
            sdiCode: profileData.sdiCode || '',
            pecEmail: profileData.pecEmail || '',
            phoneNumber: profileData.phoneNumber || '',
            landlineNumber: profileData.landlineNumber || '',
            whatsappNumber: profileData.whatsappNumber || '',
            email: profileData.email || '',
            address: profileData.address || '',
            billingAddress: profileData.billingAddress || '',
            website: profileData.website || '',
            socials: profileData.socials || { instagram: '', facebook: '', google: '', tripadvisor: '' },
            adminNotes: profileData.adminNotes || ''
        });

        setSubDate(profileData.subscriptionEndDate || '');

        let plan = profileData.planType || 'Trial';
        // FIX: Mappa il vecchio 'Pro' a 'Mensile' per visualizzarlo correttamente nei bottoni
        if (plan === 'Pro') plan = 'Mensile';

        setSubPlan(plan);
        // Costo basato sul piano
        const defaultCost = plan === 'Trial' || plan === 'Free' || plan === 'Demo' ? '0' : (profileData.subscriptionCost || '49.00');
        setSubCost(defaultCost);

        // Load Agent Data
        const agent = profileData.agent || {};
        setAgentName(agent.name || '');
        setAgentIban(agent.iban || '');
        setAgentType(agent.commissionType || 'Percentage');
        setAgentValue(agent.commissionValue || '');
        setAgentLastPay(agent.lastPaymentDate || '');
        setAgentNextPay(agent.nextPaymentDate || '');

        // AUTO ENTER EDIT MODE
        setIsEditingRegistry(true);
    };

    const handleRegistryChange = (field: string, value: string) => {
        setRegistryForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSocialChange = (network: string, value: string) => {
        setRegistryForm((prev: any) => ({
            ...prev,
            socials: { ...prev.socials, [network]: value }
        }));
    };

    const activateFreeTrial = () => {
        const today = new Date();
        today.setDate(today.getDate() + 15); // 15 Giorni
        setSubDate(today.toISOString());
        setSubPlan('Trial');
    };

    const activateDemoAgent = () => {
        // Data molto lontana per "Free/Demo"
        setSubDate('2099-12-31T23:59:59.000Z');
        setSubPlan('Demo');
        setSubCost('0.00');
    };

    const saveRegistryChanges = async () => {
        if (!supabase || !viewingProfile) return;

        const currentSettings = viewingProfile.settings || {};

        const updatedSettings = {
            ...currentSettings,
            restaurantProfile: {
                ...(currentSettings.restaurantProfile || {}),
                ...registryForm,
                subscriptionEndDate: subDate,
                subscriptionCost: subCost,
                planType: subPlan,
                name: viewingProfile.restaurant_name,
                agent: {
                    name: agentName,
                    iban: agentIban,
                    commissionType: agentType,
                    commissionValue: agentValue,
                    lastPaymentDate: agentLastPay,
                    nextPaymentDate: agentNextPay
                },

            }
        };

        // Aggiorna stato locale
        const updatedProfile = { ...viewingProfile, settings: updatedSettings };
        setViewingProfile(updatedProfile);
        setProfiles(prev => prev.map(p => p.id === viewingProfile.id ? updatedProfile : p));

        // Aggiorna DB
        const { error } = await supabase
            .from('profiles')
            .update({ settings: updatedSettings })
            .eq('id', viewingProfile.id);

        if (error) {
            alert("ERRORE SALVATAGGIO: " + error.message);
            fetchProfiles();
        } else {
            setIsEditingRegistry(false);
            // alert("Dati aggiornati con successo!");
        }
    };

    // Toggle Active/Suspended
    const toggleStatus = async (id: string, currentStatus: any, email: string) => {
        if (id.startsWith('demo-')) { showToastMsg("Questa è una riga simulata.", 'info'); return; }
        if (email === SUPER_ADMIN_EMAIL) { showToastMsg("Non puoi modificare lo stato del Super Admin.", 'error'); return; }
        if (!supabase) return;

        // Se null/undefined, consideriamo l'utente attivo, quindi lo sospendiamo
        const isActive = currentStatus === 'active' || !currentStatus;
        const newStatus = isActive ? 'suspended' : 'active';
        const action = newStatus === 'suspended' ? 'SOSPENDERE' : 'RIATTIVARE';

        showConfirm(
            action + ' Account',
            `Vuoi ${action.toLowerCase()} questo account?\n\n${newStatus === 'suspended' ? 'L\'utente vedrà la schermata di pagamento e non potrà accedere.' : 'L\'utente potrà accedere nuovamente all\'app.'}`,
            async () => {
                const { error } = await supabase!.from('profiles').update({ subscription_status: newStatus }).eq('id', id);
                if (!error) {
                    fetchProfiles();
                    showToastMsg(`Account ${newStatus === 'active' ? 'RIATTIVATO' : 'SOSPESO'}`, 'success');
                } else {
                    showToastMsg("Errore: " + error.message, 'error');
                }
            }
        );
    };



    // Elimina defintivamente
    const deleteProfile = async (id: string, name: string, email: string) => {
        if (email === SUPER_ADMIN_EMAIL) { showToastMsg("Non puoi eliminare il Super Admin.", 'error'); return; }
        if (id.startsWith('demo-')) { showToastMsg("Utente demo simulato, non eliminabile dal DB.", 'info'); return; }
        if (!supabase) return;

        showConfirm(
            'ELIMINAZIONE DEFINITIVA',
            `⚠️ SEI SICURO DI VOLER ELIMINARE "${name}"?\n\nL'azione è irreversibile. Verranno cancellati:\n- Profilo Ristorante\n- Tutti i dati associati (se collegati)\n\nL'utente Auth rimarrà ma senza profilo.`,
            async () => {
                const { error } = await supabase!.from('profiles').delete().eq('id', id);
                if (!error) {
                    fetchProfiles();
                    showToastMsg(`Account "${name}" ELIMINATO con successo.`, 'success');
                } else {
                    showToastMsg("Errore durante l'eliminazione: " + error.message, 'error');
                }
            }
        );
    };
    const startEdit = (profile: any) => { if (profile.id.startsWith('demo-')) return; setEditingId(profile.id); setEditName(profile.restaurant_name || ''); };
    const cancelEdit = () => { setEditingId(null); setEditName(''); };
    const saveEdit = async () => { if (!supabase || !editingId) return; const { error } = await supabase.from('profiles').update({ restaurant_name: editName }).eq('id', editingId); if (!error) { setEditingId(null); fetchProfiles(); showToastMsg('Nome aggiornato', 'success'); } else { showToastMsg("Errore salvataggio: " + error.message, 'error'); } };
    const addMonths = (dateStr: string, months: number) => { const d = dateStr ? new Date(dateStr) : new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().split('T')[0]; };

    // Status Logic
    const getStatusColor = (profile: any) => {
        if (profile.subscription_status === 'banned') return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (profile.subscription_status === 'suspended') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        const expiry = profile.settings?.restaurantProfile?.subscriptionEndDate;
        if (expiry && new Date(expiry) < new Date()) return 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse';
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    };

    // Status Label in Italian
    const getStatusLabel = (profile: any) => {
        if (profile.subscription_status === 'banned') return '🔒 BANNATO';
        if (profile.subscription_status === 'suspended') return '⏸️ SOSPESO';
        const expiry = profile.settings?.restaurantProfile?.subscriptionEndDate;
        if (expiry && new Date(expiry) < new Date()) return '🔴 SCADUTO';
        return '✅ ATTIVO';
    };
    const copySQL = (sql: string, type: 'reset' | 'demo' | 'recovery' | 'fix') => { navigator.clipboard.writeText(sql); if (type === 'demo') { setCopiedDemo(true); setTimeout(() => setCopiedDemo(false), 2000); } else if (type === 'fix') { setCopiedFix(true); setTimeout(() => setCopiedFix(false), 2000); } else { setCopiedRecovery(true); setTimeout(() => setCopiedRecovery(false), 2000); } };
    const getDemoUserSQL = () => `create extension if not exists pgcrypto; insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token) values ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', '00000000-0000-0000-0000-000000000000', 'demo@ristosync.com', crypt('password123', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"restaurant_name":"Ristorante Demo"}', now(), now(), '', '') on conflict (id) do nothing; insert into public.profiles (id, email, restaurant_name, subscription_status) values ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'demo@ristosync.com', 'Ristorante Demo', 'active') on conflict (id) do update set restaurant_name = 'Ristorante Demo';`;
    const getFixStructureSQL = () => `-- FIX DATABASE (Senza Errori Storage)

-- 1. Aggiorna colonne Menu
alter table public.menu_items add column if not exists combo_items jsonb;
alter table public.menu_items add column if not exists specific_department text;
alter table public.menu_items add column if not exists image text;
alter table public.menu_items add column if not exists ingredients text;

-- 2. Grant
grant all on table public.orders to authenticated;
grant all on table public.orders to service_role;
grant all on table public.menu_items to authenticated;
grant all on table public.menu_items to service_role;

-- 3. Policy Ordini
drop policy if exists "Enable All for Users" on public.orders;
drop policy if exists "Manage own orders" on public.orders;
create policy "Enable All for Users" on public.orders for all using (auth.uid() = user_id);

-- 4. Policy Menu
drop policy if exists "Manage own menu" on public.menu_items;
drop policy if exists "Public Read Menu" on public.menu_items;
create policy "Public Read Menu" on public.menu_items for select using (true);
drop policy if exists "Owner Manage Menu" on public.menu_items;
create policy "Owner Manage Menu" on public.menu_items for all using (auth.uid() = user_id);

-- 5. Realtime
do $$ begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end; $$;
do $$ begin alter publication supabase_realtime add table public.menu_items; exception when duplicate_object then null; end; $$;

-- 6. Super Admin
drop policy if exists "Super Admin Update All" on public.profiles;
create policy "Super Admin Update All" on public.profiles for update to authenticated using ( (auth.jwt() ->> 'email') = 'castro.massimo@yahoo.com' );
drop policy if exists "Super Admin Delete All" on public.profiles;
create policy "Super Admin Delete All" on public.profiles for delete to authenticated using ( (auth.jwt() ->> 'email') = 'castro.massimo@yahoo.com' );

-- 7. STORAGE (Solo creazione bucket, gestione policy MANUALE)
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true) on conflict (id) do nothing;

-- 8. Messaggi di Sistema
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id),
  recipient_id uuid references auth.users(id),
  subject text,
  content text,
  attachment_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;

drop policy if exists "Read Messages" on public.messages;
create policy "Read Messages" on public.messages for select using ( auth.uid() = recipient_id OR auth.uid() = sender_id OR recipient_id is null );

drop policy if exists "Insert Messages" on public.messages;
create policy "Insert Messages" on public.messages for insert with check ( auth.uid() = sender_id );

drop policy if exists "Delete Messages" on public.messages;
create policy "Delete Messages" on public.messages for delete using ( auth.uid() = recipient_id OR auth.uid() = sender_id );

do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end; $$;

NOTIFY pgrst, 'reload schema';`;
    const isEmailCorrect = currentEmail.toLowerCase() === SUPER_ADMIN_EMAIL;

    // Derived Status for Modal
    // Derived Status for Modal
    const isSuspended = viewingProfile?.subscription_status === 'suspended';
    const isBanned = viewingProfile?.subscription_status === 'banned';

    const isTrial = subPlan === 'Trial';
    const isFree = subPlan === 'Free' || subPlan === 'Demo';
    const isExpired = subDate && new Date(subDate) < new Date() && !isFree && !isSuspended && !isBanned;

    const statusLabel = isBanned ? 'BANNATO' : isSuspended ? 'SOSPESO' : isFree ? 'GRATIS / DEMO' : isExpired ? 'SCADUTO' : isTrial ? 'IN PROVA' : 'ATTIVO';
    const statusColorClass = isBanned ? 'bg-red-600' : isSuspended ? 'bg-orange-500' : isFree ? 'bg-indigo-600' : isExpired ? 'bg-red-600' : isTrial ? 'bg-blue-500' : 'bg-green-600';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
            {/* BACKGROUND DECORATIONS */}
            <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none" />

            <div className="max-w-[1600px] mx-auto p-4 md:p-8 relative z-10">
                {/* HEADER */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10">
                            <ShieldCheck size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight">Super Admin</h1>
                            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                <span className={`w-2 h-2 rounded-full ${isEmailCorrect ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 animate-pulse"}`} />
                                {currentEmail || 'Verifica utente...'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                        <div className="flex gap-2 mr-auto xl:mr-0">
                            <button onClick={() => setShowFixModal(true)} className="p-3 bg-slate-900/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl border border-slate-800 hover:border-red-500/50 transition-all active:scale-95" title="Strumenti Riparazione DB">
                                <Wrench size={20} />
                            </button>
                            <button onClick={() => setShowSqlModal(true)} className="p-3 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:border-slate-600 transition-all active:scale-95" title="Genera Demo User">
                                <Database size={20} />
                            </button>
                        </div>

                        <div className="h-12 w-[1px] bg-slate-800 hidden xl:block mx-2" />

                        <button onClick={onEnterApp} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold border border-slate-700 hover:border-slate-500 transition-all group">
                            <Smartphone size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                            App Utente
                        </button>
                        <button onClick={signOut} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-6 py-3 rounded-xl font-bold border border-red-500/20 hover:border-red-500 transition-all">
                            <LogOut size={18} />
                            Esci
                        </button>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex p-1.5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 w-full md:w-fit mb-8 shadow-lg">
                    <button
                        onClick={() => setDashboardTab('users')}
                        className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 ${dashboardTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users size={18} /> Tenants
                    </button>
                    <button
                        onClick={() => setDashboardTab('messages')}
                        className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 relative ${dashboardTab === 'messages' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Mail size={18} /> Messaggi
                        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-4 ring-slate-900 shadow-sm">{unreadCount}</span>}
                    </button>
                </div>

                {dashboardTab === 'messages' && (
                    <AdminMessagesPanel profiles={profiles} showToast={showToastMsg} />
                )}

                {dashboardTab === 'users' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* GLOBAL CONFIGURATION CARD */}
                        <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl relative">
                            {/* Card Header with Glass effect */}
                            <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-slate-800/50 to-slate-900 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                        <Globe size={24} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Configurazione Globale</h2>
                                        <p className="text-sm text-slate-400 font-medium">Impostazioni visibili a tutti i clienti attivi</p>
                                    </div>
                                </div>
                                <button onClick={saveGlobalConfig} disabled={isSavingGlobal} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSavingGlobal ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                    Salva Modifiche
                                </button>
                            </div>

                            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* LEFT COLUMN - BASE SETTINGS (4 Cols) */}
                                <div className="lg:col-span-4 space-y-6">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Settings size={14} /> Parametri Base
                                    </h3>

                                    <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 space-y-5">
                                        <div>
                                            <label className="text-[11px] text-slate-400 font-bold uppercase mb-2 block">Email Ricezione Ordini</label>
                                            <div className="relative group">
                                                <Inbox size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                                <input type="email" value={globalContactEmail} onChange={(e) => setGlobalContactEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600" placeholder="admin@ristosync.it" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-slate-400 font-bold uppercase mb-2 block">Costo Mensile Default</label>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-serif italic text-lg group-focus-within:text-emerald-400 transition-colors">€</span>
                                                <input type="text" value={globalDefaultCost} onChange={(e) => setGlobalDefaultCost(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-3.5 text-white text-lg font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all" placeholder="0.00" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800">
                                        <label className="text-[11px] text-slate-400 font-bold uppercase mb-2 block">Supporto WhatsApp</label>
                                        <div className="relative group">
                                            <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                                            <input type="text" value={globalSupportPhone} onChange={(e) => setGlobalSupportPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm font-medium focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none transition-all" placeholder="+39 000 000000" />
                                        </div>
                                    </div>
                                </div>

                                {/* MIDDLE COLUMN - BANK & FINANCE (4 Cols) */}
                                <div className="lg:col-span-4 space-y-6">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Banknote size={14} /> Dati Bancari
                                    </h3>

                                    <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 h-full flex flex-col justify-between overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                            <Banknote size={200} />
                                        </div>

                                        <div className="space-y-5 relative z-10">
                                            <div>
                                                <label className="text-[11px] text-slate-400 font-bold uppercase mb-2 block">Intestatario Conto</label>
                                                <input type="text" value={globalBankHolder} onChange={(e) => setGlobalBankHolder(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm font-medium focus:border-indigo-500 outline-none transition-all" placeholder="Nome Azienda / Persona" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-400 font-bold uppercase mb-2 block">Codice IBAN</label>
                                                <textarea value={globalIban} onChange={(e) => setGlobalIban(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-mono text-sm uppercase focus:border-indigo-500 outline-none transition-all resize-none h-24 sm:h-auto" rows={3} placeholder="IT00 X000 0000 0000 0000 0000 000" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN - PROMO CONFIGURATOR (4 Cols) - HIGHLIGHTED */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles size={14} /> Promo Speciale
                                        </h3>
                                        <div className="flex items-center gap-3 bg-slate-800 p-1 rounded-lg border border-slate-700">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${!promoActive ? 'text-slate-400' : 'text-slate-500'}`}>OFF</span>
                                            <button
                                                onClick={() => setPromoActive(!promoActive)}
                                                className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${promoActive ? 'bg-purple-500' : 'bg-slate-600'}`}
                                            >
                                                <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 ${promoActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${promoActive ? 'text-white' : 'text-slate-500'}`}>ON</span>
                                        </div>
                                    </div>

                                    <div className={`rounded-3xl p-1 bg-gradient-to-br transition-all duration-500 ${promoActive ? 'from-purple-600 via-pink-600 to-orange-500 shadow-xl shadow-purple-900/30' : 'from-slate-800 to-slate-800 grayscale opacity-50'}`}>
                                        <div className="bg-slate-900 rounded-[1.3rem] p-5 h-full relative overflow-hidden">
                                            {promoActive && <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-[50px] pointer-events-none" />}

                                            <div className="space-y-4 relative z-10">
                                                <div>
                                                    <label className="text-[10px] text-purple-300 font-bold uppercase mb-1.5 block">Nome Promo</label>
                                                    <input type="text" value={promoName} onChange={(e) => setPromoName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-purple-500 outline-none" placeholder="es. Summer Sale" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] text-purple-300 font-bold uppercase mb-1.5 block">Prezzo Offerta</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 font-bold text-xs">€</span>
                                                            <input type="text" value={promoCost} onChange={(e) => setPromoCost(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-3 text-white font-bold text-sm focus:border-purple-500 outline-none" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-purple-300 font-bold uppercase mb-1.5 block">Durata Testo</label>
                                                        <input type="text" value={promoDuration} onChange={(e) => setPromoDuration(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white font-medium text-sm focus:border-purple-500 outline-none" placeholder="3 Mesi" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] text-purple-300 font-bold uppercase mb-1.5 block flex justify-between">
                                                        <span>Scadenza Timer (Ore)</span>
                                                        <span className="text-white/50">{promoDeadline}h</span>
                                                    </label>
                                                    <div className="flex items-center gap-3">
                                                        <Clock size={16} className="text-purple-500" />
                                                        <input type="number" value={promoDeadline} onChange={(e) => setPromoDeadline(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-purple-500 outline-none" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-center text-[10px] text-slate-500 font-medium">
                                        Questa promo apparirà sulla Landing Page sostituendo il piano Standard.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* TENANTS LIST CARD */}
                        <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
                            <div className="p-6 md:p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm">
                                <h2 className="font-bold text-xl text-white flex items-center gap-3">
                                    <Users size={24} className="text-indigo-500" />
                                    Gestione Tenants
                                </h2>
                                <button onClick={fetchProfiles} className="flex items-center gap-2 text-sm font-bold bg-slate-800 hover:bg-slate-700 hover:text-white px-4 py-2.5 rounded-xl text-slate-400 transition-all border border-slate-700 hover:border-slate-500 active:scale-95 shadow-lg">
                                    <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-500' : ''} />
                                    Aggiorna
                                </button>
                            </div>

                            <div className="overflow-x-auto custom-scroll">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-black tracking-wider sticky top-0 z-10">
                                        <tr>
                                            <th className="p-5 font-black border-b border-slate-800">Ristorante</th>
                                            <th className="p-5 font-black border-b border-slate-800 hidden md:table-cell">Contatto Admin</th>
                                            <th className="p-5 font-black border-b border-slate-800">Status</th>
                                            <th className="p-5 font-black border-b border-slate-800">Piano</th>
                                            <th className="p-5 font-black border-b border-slate-800 text-right">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {profiles.map(p => {
                                            const isFake = p.id.toString().startsWith('demo-');
                                            const isSuperAdminProfile = p.email === SUPER_ADMIN_EMAIL;
                                            const hasProfileData = p.settings?.restaurantProfile?.vatNumber || p.settings?.restaurantProfile?.phoneNumber;
                                            const statusColor = getStatusColor(p);
                                            const planType = p.settings?.restaurantProfile?.planType || 'Trial';
                                            const expiry = p.settings?.restaurantProfile?.subscriptionEndDate;
                                            const isExpired = expiry && new Date(expiry) < new Date();
                                            const getPlanColor = () => {
                                                if (isExpired) return 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
                                                if (planType === 'Trial') return 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]';
                                                if (planType === 'Free') return 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-[0_0_10px_rgba(148,163,184,0.1)]';
                                                if (planType === 'Basic') return 'bg-blue-600/10 text-blue-500 border-blue-600/20 shadow-[0_0_10px_rgba(37,99,235,0.1)]';
                                                if (planType === 'Pro') return 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]';
                                                if (planType === 'Promo') return 'bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.1)]';
                                                return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                                            };

                                            return (
                                                <tr key={p.id} className={`group transition-all hover:bg-slate-800/40 border-l-2 border-l-transparent hover:border-l-indigo-500 ${isFake ? 'opacity-60 hover:opacity-100 grayscale-[0.5] hover:grayscale-0' : ''} ${isSuperAdminProfile ? 'bg-indigo-900/5' : ''}`}>

                                                    {/* Ristorante Name */}
                                                    <td className="p-5 align-middle">
                                                        {editingId === p.id ? (
                                                            <div className="flex items-center gap-2 animate-fade-in w-full max-w-[250px]">
                                                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-slate-950 border border-indigo-500 rounded-xl px-3 py-2.5 text-white text-sm font-bold w-full outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" autoFocus />
                                                                <button onClick={saveEdit} className="p-2.5 bg-emerald-500 rounded-xl text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"><Save size={18} /></button>
                                                                <button onClick={cancelEdit} className="p-2.5 bg-slate-700 rounded-xl text-white hover:bg-slate-600 border border-slate-600 active:scale-95 transition-transform"><X size={18} /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-4 group">
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:scale-105 ${isSuperAdminProfile ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                                                    {p.restaurant_name ? p.restaurant_name.charAt(0).toUpperCase() : <Store size={22} />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-bold text-white text-base tracking-tight">{p.restaurant_name || 'N/A'}</span>
                                                                        {isFake && <span className="bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">Demo</span>}
                                                                        {isSuperAdminProfile && <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30">HQ</span>}
                                                                        {!isFake && (
                                                                            <button onClick={() => startEdit(p)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all" title="Rinomina">
                                                                                <Edit2 size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{p.id.split('-')[0]}...</div>
                                                                        {!hasProfileData && !isFake && <span className="text-[9px] text-orange-400 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Dati mancanti</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Admin Contact */}
                                                    <td className="p-5 hidden md:table-cell align-middle">
                                                        <div className="flex items-center gap-3 text-slate-400 font-medium text-sm">
                                                            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                                                                <Mail size={14} className="text-slate-500" />
                                                            </div>
                                                            {p.email}
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="p-5 align-middle">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-slate-950/30 ${statusColor}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${p.subscription_status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-current'}`} />
                                                            {getStatusLabel(p)}
                                                        </div>
                                                    </td>

                                                    {/* Plan */}
                                                    <td className="p-5 align-middle">
                                                        <div className="flex flex-col items-start gap-1.5">
                                                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getPlanColor()} flex items-center gap-2`}>
                                                                {isExpired ? <AlertOctagon size={12} /> : <CreditCard size={12} />}
                                                                {isExpired ? 'SCADUTO' : planType || 'N/A'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 font-mono ml-1">
                                                                {expiry ? new Date(expiry).toLocaleDateString() : 'Illimitato'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Actions - BIG BUTTONS REDESIGN */}
                                                    <td className="p-5 text-right align-middle">
                                                        <div className="flex items-center justify-end gap-3">

                                                            {/* Main Action: Gestisci */}
                                                            <button
                                                                onClick={() => openRegistry(p)}
                                                                className={`flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 border group/btn relative ${hasProfileData
                                                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 hover:shadow-indigo-500/25'
                                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-slate-500'
                                                                    }`}
                                                            >
                                                                <Settings size={18} className="transition-transform group-hover/btn:rotate-90" />
                                                                <span className="hidden xl:inline">Gestisci</span>
                                                                {!hasProfileData && <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-slate-900 shadow-sm animate-pulse" />}
                                                            </button>

                                                            <div className="w-[1px] h-8 bg-slate-800 hidden md:block" />

                                                            {!isSuperAdminProfile ? (
                                                                <>
                                                                    {/* Suspend/Resume */}
                                                                    <button
                                                                        onClick={() => toggleStatus(p.id, p.subscription_status, p.email)}
                                                                        className={`p-2.5 rounded-xl border transition-all active:scale-95 shadow-md flex items-center justify-center ${p.subscription_status === 'suspended'
                                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                                                            } ${isFake ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                                                                        title={p.subscription_status === 'suspended' ? 'RIATTIVA Account' : 'SOSPENDI Account'}
                                                                    >
                                                                        {p.subscription_status === 'suspended' ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
                                                                    </button>

                                                                    {/* Delete */}
                                                                    <button onClick={() => deleteProfile(p.id, p.restaurant_name, p.email)}
                                                                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-500 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all active:scale-95 flex items-center justify-center"
                                                                        title="ELIMINA DEFINITIVAMENTE">
                                                                        <Trash2 size={20} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="p-3 text-slate-700 opacity-50 cursor-not-allowed border border-transparent"><Lock size={20} /></div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* EDITABLE ANAGRAFICA & SUBSCRIPTION MODAL */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-[90rem] shadow-2xl animate-slide-up flex flex-col max-h-[92vh] overflow-hidden relative">

                        {/* HEADER MODAL */}
                        <div className="p-6 md:p-8 border-b border-slate-800 flex justify-between items-start bg-slate-950/50 backdrop-blur-md z-20">
                            <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl ${statusColorClass} text-white ring-4 ring-slate-900`}>
                                    <Store size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-3xl font-black text-white tracking-tight">{viewingProfile.restaurant_name}</h2>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-lg ${statusColorClass}`}>{statusLabel}</div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm text-slate-400 font-medium">
                                        <div className="flex items-center gap-2"><Mail size={14} className="text-slate-500" /> {viewingProfile.email}</div>
                                        <div className="flex items-center gap-2 font-mono text-xs opacity-50 px-2 py-1 bg-slate-800 rounded-md border border-slate-700"><Database size={10} /> {viewingProfile.id}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {!isEditingRegistry ? (
                                    <button onClick={() => setIsEditingRegistry(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 active:scale-95 text-xs uppercase tracking-wider transform hover:-translate-y-1">
                                        <Edit2 size={16} /> Modifica
                                    </button>
                                ) : (
                                    <button onClick={saveRegistryChanges} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 active:scale-95 text-xs uppercase tracking-wider animate-pulse">
                                        <Save size={16} /> Salva Tutto
                                    </button>
                                )}
                                <button onClick={() => setViewingProfile(null)} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900 custom-scroll">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                {viewingProfile.email !== SUPER_ADMIN_EMAIL && (
                                    /* LEFT COLUMN - SUBSCRIPTION / AGENT (4 cols) */
                                    <div className="lg:col-span-4 space-y-8">

                                        {/* AGENT CARD */}
                                        <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden relative group">
                                            <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 p-5 border-b border-slate-800 flex items-center justify-between">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-2"><Briefcase size={14} /> Agente & Provvigioni</h3>
                                                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_purple]" />
                                            </div>

                                            <div className="p-6 space-y-6">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Nome Agente Assegnato</label>
                                                    {isEditingRegistry ? (
                                                        <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl font-bold outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all" placeholder="Nessun agente" />
                                                    ) : (
                                                        <div className="w-full bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-between group-hover:border-purple-500/30 transition-colors">
                                                            {agentName || 'Nessuno assegnato'}
                                                            {agentName && <UserCheck size={16} className="text-purple-500" />}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Commissione</label>
                                                        {isEditingRegistry ? (
                                                            <select value={agentType} onChange={(e) => setAgentType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-3 rounded-xl text-xs font-bold outline-none focus:border-purple-500">
                                                                <option value="Percentage">% Percentuale</option>
                                                                <option value="Monthly">Fisso Mese</option>
                                                                <option value="Annual">Fisso Anno</option>
                                                                <option value="OneOff">Una Tantum</option>
                                                            </select>
                                                        ) : (
                                                            <div className="w-full bg-slate-900 border border-slate-800 text-slate-300 px-3 py-3 rounded-xl font-bold text-xs truncate">
                                                                {agentType === 'Percentage' ? '% Percentuale' : agentType === 'Monthly' ? 'Fisso Mensile' : agentType === 'Annual' ? 'Fisso Annuale' : 'Una Tantum'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Valore</label>
                                                        {isEditingRegistry ? (
                                                            <input type="text" value={agentValue} onChange={(e) => setAgentValue(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-3 rounded-xl font-bold text-right outline-none focus:border-purple-500" placeholder="0" />
                                                        ) : (
                                                            <div className="w-full bg-slate-900 border border-slate-800 text-purple-400 px-3 py-3 rounded-xl font-bold text-right">
                                                                {agentValue ? (agentType === 'Percentage' ? `${agentValue}%` : `€ ${agentValue}`) : '-'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-2">IBAN Agente</label>
                                                    <div className="flex gap-3">
                                                        {isEditingRegistry ? (
                                                            <input type="text" value={agentIban} onChange={(e) => setAgentIban(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl font-mono text-xs outline-none focus:border-purple-500 uppercase" placeholder="IT00..." />
                                                        ) : (
                                                            <div className="w-full bg-slate-900 border border-slate-800 text-slate-400 px-4 py-3 rounded-xl font-mono text-xs flex items-center overflow-hidden">
                                                                <span className="truncate">{agentIban || 'Nessun IBAN'}</span>
                                                            </div>
                                                        )}
                                                        {(agentIban || isEditingRegistry) && (
                                                            <div className="bg-white p-1 rounded-xl shrink-0 h-[46px] w-[46px] flex items-center justify-center">
                                                                {agentIban ? <QRCode value={agentIban} size={38} /> : <div className="text-[8px] text-slate-300 font-bold text-center">NO<br />QR</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SUBSCRIPTION CARD */}
                                        <div className={`rounded-3xl border overflow-hidden relative ${isExpired ? 'bg-red-950/20 border-red-500/30' : isFree ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-emerald-950/20 border-emerald-500/30'}`}>
                                            <div className={`p-5 border-b flex items-center justify-between ${isExpired ? 'bg-red-900/20 border-red-500/20' : isFree ? 'bg-indigo-900/20 border-indigo-500/20' : 'bg-emerald-900/20 border-emerald-500/20'}`}>
                                                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isExpired ? 'text-red-400' : isFree ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                    <CreditCard size={14} /> Abbonamento
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isExpired ? 'bg-red-500 text-white' : isFree ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                                    {isExpired ? 'SCADUTO' : subPlan}
                                                </span>
                                            </div>

                                            <div className="p-6 space-y-6">
                                                <div className="text-center">
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Data Scadenza</label>
                                                    {isEditingRegistry ? (
                                                        <input type="date" value={subDate ? subDate.split('T')[0] : ''} onChange={(e) => setSubDate(e.target.value)} className="bg-slate-900 border border-slate-600 text-white p-3 rounded-xl w-full font-bold focus:border-white outline-none text-center" />
                                                    ) : (
                                                        <p className={`text-3xl font-black font-mono tracking-tight ${isExpired ? 'text-red-500 animate-pulse' : 'text-white'}`}>{subDate ? new Date(subDate).toLocaleDateString() : 'ILLIMITATO'}</p>
                                                    )}
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Piano Selezionato</label>
                                                        {isEditingRegistry ? (
                                                            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scroll pr-1">
                                                                {[
                                                                    { value: 'trial', label: 'Trial (15gg)', color: 'blue', cost: '0' },
                                                                    { value: 'basic', label: 'Basic €49,90/mese', color: 'emerald', cost: '49.90' },
                                                                    { value: 'pro', label: 'Pro AI €99,90/mese', color: 'purple', cost: '99.90' },
                                                                    { value: 'basic_yearly', label: 'Basic Annuale €499', color: 'teal', cost: '499.00' },
                                                                    { value: 'pro_yearly', label: 'Pro Annuale €999', color: 'violet', cost: '999.00' },
                                                                    { value: 'promo', label: `${promoName || 'Promo Special'}`, color: 'pink', cost: promoCost || '29.90' },
                                                                    { value: 'demo', label: 'Demo / Illimitato', color: 'indigo', cost: '0' },
                                                                ].map(plan => (
                                                                    <button
                                                                        key={plan.value}
                                                                        onClick={() => {
                                                                            setSubPlan(plan.value);
                                                                            setSubCost(plan.cost);
                                                                        }}
                                                                        className={`w-full px-4 py-3 rounded-xl text-left flex justify-between items-center transition-all border ${subPlan === plan.value ? `bg-${plan.color}-500/20 border-${plan.color}-500 text-${plan.color}-400` : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                                                    >
                                                                        <span className="font-bold text-xs uppercase">{plan.label}</span>
                                                                        {subPlan === plan.value && <div className={`w-2 h-2 rounded-full bg-${plan.color}-500 shadow-[0_0_8px_currentColor]`} />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-center font-bold text-slate-300">
                                                                {subPlan || 'Nessun Piano'}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isEditingRegistry && (
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Costo Personalizzato (€)</label>
                                                            <input type="text" value={subCost} onChange={(e) => setSubCost(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl font-bold focus:border-white outline-none" placeholder="0.00" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* LAST ACCESS */}
                                                <div className="pt-4 border-t border-white/10">
                                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase mb-2">
                                                        <span className="flex items-center gap-1"><Clock size={12} /> Ultimo Accesso</span>
                                                    </div>
                                                    <div className="bg-slate-950/50 px-4 py-2 rounded-lg border border-slate-800 font-mono text-xs text-slate-400">
                                                        {viewingProfile.last_sign_in_at ? new Date(viewingProfile.last_sign_in_at).toLocaleString() : 'Nessun accesso registrato'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* RIGHT COLUMN - COMPANY DATA (8 cols - or 12 for SuperAdmin) */}
                                <div className={`${viewingProfile.email === SUPER_ADMIN_EMAIL ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
                                    {/* SECTION: DATI AZIENDALI */}
                                    <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 relative">
                                        <h4 className="text-sm font-black text-white uppercase mb-6 flex items-center gap-3"><Briefcase className="text-orange-500" size={18} /> Dati Fiscali & Legali</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Ragione Sociale Completa</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.businessName} onChange={e => handleRegistryChange('businessName', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:border-orange-500 outline-none" /> : <p className="text-lg text-white font-bold bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">{viewingProfile.settings?.restaurantProfile?.businessName || '-'}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">P.IVA / C.F.</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.vatNumber} onChange={e => handleRegistryChange('vatNumber', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono focus:border-orange-500 outline-none" /> : <p className="text-white font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">{viewingProfile.settings?.restaurantProfile?.vatNumber || '-'}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Responsabile Legale</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.responsiblePerson} onChange={e => handleRegistryChange('responsiblePerson', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none" /> : <p className="text-white bg-slate-900 p-3 rounded-xl border border-slate-800">{viewingProfile.settings?.restaurantProfile?.responsiblePerson || '-'}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Codice SDI</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.sdiCode} onChange={e => handleRegistryChange('sdiCode', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono uppercase focus:border-orange-500 outline-none" placeholder="XXXXXXX" /> : <p className="text-white font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">{viewingProfile.settings?.restaurantProfile?.sdiCode || '-'}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Email PEC</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.pecEmail} onChange={e => handleRegistryChange('pecEmail', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono focus:border-orange-500 outline-none" /> : <p className="text-white font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">{viewingProfile.settings?.restaurantProfile?.pecEmail || '-'}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION: CONTATTI */}
                                    <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800">
                                        <h4 className="text-sm font-black text-white uppercase mb-6 flex items-center gap-3"><MapPin className="text-blue-500" size={18} /> Sede & Contatti</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Indirizzo Sede Operativa</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.address} onChange={e => handleRegistryChange('address', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" /> : <p className="text-white bg-slate-900 p-3 rounded-xl border border-slate-800">{viewingProfile.settings?.restaurantProfile?.address || '-'}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Cellulare</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.phoneNumber} onChange={e => handleRegistryChange('phoneNumber', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" /> : <p className="text-white bg-slate-900 p-3 rounded-xl border border-slate-800">{viewingProfile.settings?.restaurantProfile?.phoneNumber || '-'}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Email Pubblica</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.publicEmail} onChange={e => handleRegistryChange('publicEmail', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" /> : <p className="text-white bg-slate-900 p-3 rounded-xl border border-slate-800">{viewingProfile.settings?.restaurantProfile?.publicEmail || '-'}</p>}
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Sito Web</label>
                                                {isEditingRegistry ? <input type="text" value={registryForm.website} onChange={e => handleRegistryChange('website', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" placeholder="https://" /> : <p className="text-blue-400 bg-slate-900 p-3 rounded-xl border border-slate-800 break-all">{viewingProfile.settings?.restaurantProfile?.website || '-'}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION: SOCIAL MEDIA */}
                                    <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800">
                                        <h4 className="text-sm font-black text-white uppercase mb-6 flex items-center gap-3"><Share2 className="text-pink-500" size={18} /> Social Media</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                                                <Instagram className="text-pink-500" />
                                                {isEditingRegistry ? <input type="text" value={registryForm.socials?.instagram || ''} onChange={e => handleSocialChange('instagram', e.target.value)} className="bg-transparent text-sm w-full outline-none text-white" placeholder="Link Instagram..." /> : <a href={registryForm.socials?.instagram} target="_blank" rel="noreferrer" className="text-sm text-slate-300 truncate hover:text-white transition-colors">{registryForm.socials?.instagram || '-'}</a>}
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                                                <Facebook className="text-blue-600" />
                                                {isEditingRegistry ? <input type="text" value={registryForm.socials?.facebook || ''} onChange={e => handleSocialChange('facebook', e.target.value)} className="bg-transparent text-sm w-full outline-none text-white" placeholder="Link Facebook..." /> : <a href={registryForm.socials?.facebook} target="_blank" rel="noreferrer" className="text-sm text-slate-300 truncate hover:text-white transition-colors">{registryForm.socials?.facebook || '-'}</a>}
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                                                <Store className="text-green-500" />
                                                {isEditingRegistry ? <input type="text" value={registryForm.socials?.google || ''} onChange={e => handleSocialChange('google', e.target.value)} className="bg-transparent text-sm w-full outline-none text-white" placeholder="Link Google Business..." /> : <a href={registryForm.socials?.google} target="_blank" rel="noreferrer" className="text-sm text-slate-300 truncate hover:text-white transition-colors">{registryForm.socials?.google || '-'}</a>}
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                                                <Compass className="text-emerald-500" />
                                                {isEditingRegistry ? <input type="text" value={registryForm.socials?.tripadvisor || ''} onChange={e => handleSocialChange('tripadvisor', e.target.value)} className="bg-transparent text-sm w-full outline-none text-white" placeholder="Link TripAdvisor..." /> : <a href={registryForm.socials?.tripadvisor} target="_blank" rel="noreferrer" className="text-sm text-slate-300 truncate hover:text-white transition-colors">{registryForm.socials?.tripadvisor || '-'}</a>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION: NOTE AMMINISTRATORE */}
                                    <div className="bg-yellow-900/10 p-6 md:p-8 rounded-[2rem] border border-yellow-700/30">
                                        <h4 className="text-sm font-black text-yellow-500 uppercase mb-6 flex items-center gap-3"><StickyNote size={18} /> Note Interne (Admin Only)</h4>
                                        {isEditingRegistry ? (
                                            <textarea value={registryForm.adminNotes} onChange={e => handleRegistryChange('adminNotes', e.target.value)} className="w-full bg-slate-900 border border-yellow-700/30 rounded-xl px-4 py-3 text-white h-32 outline-none focus:border-yellow-500 resize-none" placeholder="Scrivi una nota interna..." />
                                        ) : (
                                            <div className="min-h-[6rem] text-slate-300 whitespace-pre-wrap">{registryForm.adminNotes || 'Nessuna nota presente.'}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-center text-[10px] text-slate-500 font-mono">
                            PROFILO ID: {viewingProfile.id}
                        </div>
                    </div>
                </div>
            )}

            {/* OTHER MODALS */}
            {showFixModal && (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"><div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-slide-up relative"><button onClick={() => setShowFixModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button><div className="flex items-center gap-3 mb-4 text-red-400"><div className="p-2 bg-red-500/10 rounded-lg"><Wrench size={24} /></div><h2 className="text-xl font-bold text-white">Riparazione Database & Permessi</h2></div><p className="text-slate-400 text-sm mb-4">Esegui questo script per aggiornare la struttura e i permessi.</p><div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative group text-left mb-6"><pre className="text-left text-xs text-green-400 font-mono whitespace-pre-wrap overflow-x-auto h-48 custom-scroll p-2">{getFixStructureSQL()}</pre><button onClick={() => copySQL(getFixStructureSQL(), 'fix')} className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all">{copiedFix ? <Check size={16} className="text-green-500" /> : <Copy size={16} />} {copiedFix ? 'COPIATO!' : 'COPIA SQL'}</button></div><div className="mt-6 flex justify-end"><button onClick={() => setShowFixModal(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold">Chiudi</button></div></div></div>)}
            {showSqlModal && (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"><div className="bg-slate-900 border border-orange-500/30 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-slide-up relative"><button onClick={() => setShowSqlModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button><h2 className="text-xl font-bold text-white mb-4">Genera Utente Demo</h2><div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative group text-left mb-6"><pre className="text-left text-xs text-green-400 font-mono whitespace-pre-wrap overflow-x-auto h-64 custom-scroll p-2">{getDemoUserSQL()}</pre><button onClick={() => copySQL(getDemoUserSQL(), 'demo')} className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2">{copiedDemo ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}</button></div><div className="mt-6 flex justify-end"><button onClick={() => setShowSqlModal(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold">Chiudi</button></div></div></div>)}

            {/* Custom Dialog */}
            {
                showDialog && dialogConfig && (
                    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-orange-500/30 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-slide-up">
                            <h2 className="text-2xl font-black text-white mb-4">{dialogConfig.title}</h2>
                            <p className="text-slate-300 mb-8 whitespace-pre-line">{dialogConfig.message}</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={handleDialogCancel} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all">
                                    {dialogConfig.cancelText || 'Annulla'}
                                </button>
                                <button onClick={handleDialogConfirm} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all">
                                    {dialogConfig.confirmText || 'Conferma'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Toast */}
            {
                toast && (
                    <div className="fixed bottom-8 right-8 z-[80] animate-slide-up">
                        <div className={`px-6 py-4 rounded-2xl shadow-2xl border-2 font-bold flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-600 border-green-400 text-white' :
                            toast.type === 'error' ? 'bg-red-600 border-red-400 text-white' :
                                'bg-blue-600 border-blue-400 text-white'
                            }`}>
                            {toast.type === 'success' && <Check size={20} />}
                            {toast.type === 'error' && <AlertTriangle size={20} />}
                            {toast.type === 'info' && <AlertOctagon size={20} />}
                            <span>{toast.message}</span>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SuperAdminDashboard;