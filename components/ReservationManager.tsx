import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Users, Phone, Mail, MapPin, Euro, CreditCard, X, Check, Edit2, Trash2, AlertCircle, User, History, Plus, Search, Filter, ChevronDown, Baby, Gift, Briefcase, Heart, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Reservation, Customer, ReservationStatus, PaymentMethod, Deposit } from '../types';

interface ReservationManagerProps {
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
}

const ReservationManager: React.FC<ReservationManagerProps> = ({ onClose, showToast, showConfirm }) => {
    const [view, setView] = useState<'grid' | 'form' | 'customer'>('grid');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [allReservations, setAllReservations] = useState<Reservation[]>([]); // All reservations for calendar indicators
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all'>('all');

    // Ref for date picker
    const dateInputRef = useRef<HTMLInputElement>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Form state
    const [formData, setFormData] = useState({
        customerPhone: '',
        customerFirstName: '',
        customerLastName: '',
        customerEmail: '',
        customerCity: '',
        numberOfGuests: 2,
        numberOfChildren: 0,
        reservationTime: '20:00',
        specialRequests: '',
        occasion: '',
        highChair: false,
        depositAmount: 0,
        depositMethod: 'cash' as PaymentMethod,
    });

    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [tableCount, setTableCount] = useState(20);

    // Load data
    useEffect(() => {
        loadReservations();
        loadCustomers();
        loadTableCount();
    }, [selectedDate]);

    // Listen for settings changes
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'ristosync_app_settings') {
                loadTableCount();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Also listen for custom event for same-window updates
        const handleSettingsUpdate = () => {
            loadTableCount();
        };
        window.addEventListener('settings-updated', handleSettingsUpdate);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('settings-updated', handleSettingsUpdate);
        };
    }, []);

    const loadReservations = () => {
        const stored = localStorage.getItem('reservations');
        if (stored) {
            const all: Reservation[] = JSON.parse(stored);
            setAllReservations(all); // Store all reservations for calendar
            const filtered = all.filter(r => r.reservationDate === selectedDate);
            setReservations(filtered);
        }
    };

    const loadCustomers = () => {
        const stored = localStorage.getItem('customers');
        if (stored) {
            setCustomers(JSON.parse(stored));
        }
    };

    const loadTableCount = () => {
        const settingsData = localStorage.getItem('ristosync_app_settings');
        if (settingsData) {
            const settings = JSON.parse(settingsData);
            const count = settings.restaurantProfile?.tableCount || 20;
            setTableCount(count);
        }
    };

    const saveReservation = (reservation: Reservation) => {
        const stored = localStorage.getItem('reservations');
        const all: Reservation[] = stored ? JSON.parse(stored) : [];
        const index = all.findIndex(r => r.id === reservation.id);
        if (index >= 0) {
            all[index] = reservation;
        } else {
            all.push(reservation);
        }
        localStorage.setItem('reservations', JSON.stringify(all));
        loadReservations();
    };

    const saveCustomer = (customer: Customer) => {
        const stored = localStorage.getItem('customers');
        const all: Customer[] = stored ? JSON.parse(stored) : [];
        const index = all.findIndex(c => c.id === customer.id);
        if (index >= 0) {
            all[index] = customer;
        } else {
            all.push(customer);
        }
        localStorage.setItem('customers', JSON.stringify(all));
        loadCustomers();
    };

    // Search customer by phone or name
    const searchCustomer = (query: string) => {
        const found = customers.find(c =>
            c.phone.includes(query) ||
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
        );

        if (found) {
            setFoundCustomer(found);
            setFormData({
                ...formData,
                customerPhone: found.phone,
                customerFirstName: found.firstName,
                customerLastName: found.lastName,
                customerEmail: found.email || '',
                customerCity: found.city || '',
            });
            showToast(`✅ Cliente trovato: ${found.firstName} ${found.lastName}`, 'success');
        } else {
            setFoundCustomer(null);
        }
    };

    const handleSubmitReservation = () => {
        if (!selectedTable) {
            showToast('⚠️ Seleziona un tavolo', 'error');
            return;
        }

        if (!formData.customerPhone || !formData.customerFirstName || !formData.customerLastName) {
            showToast('⚠️ Compila tutti i campi obbligatori', 'error');
            return;
        }

        // Create or update customer
        let customer = foundCustomer;
        if (!customer) {
            customer = {
                id: `customer_${Date.now()}`,
                firstName: formData.customerFirstName,
                lastName: formData.customerLastName,
                phone: formData.customerPhone,
                email: formData.customerEmail,
                city: formData.customerCity,
                createdAt: Date.now(),
                totalVisits: 0,
                totalSpent: 0,
            };
            saveCustomer(customer);
        }

        // Create reservation
        const reservation: Reservation = {
            id: editingReservation?.id || `res_${Date.now()}`,
            tableNumber: selectedTable,
            customerId: customer.id,
            customerName: `${formData.customerFirstName} ${formData.customerLastName}`,
            customerPhone: formData.customerPhone,
            numberOfGuests: formData.numberOfGuests,
            numberOfChildren: formData.numberOfChildren,
            reservationDate: selectedDate,
            reservationTime: formData.reservationTime,
            status: ReservationStatus.PENDING,
            createdAt: editingReservation?.createdAt || Date.now(),
            updatedAt: Date.now(),
            specialRequests: formData.specialRequests,
            occasion: formData.occasion,
            highChair: formData.highChair,
            depositAmount: formData.depositAmount,
            depositPaid: formData.depositAmount > 0,
            depositMethod: formData.depositMethod,
        };

        // Save deposit if amount > 0
        if (formData.depositAmount > 0) {
            const deposit: Deposit = {
                id: `dep_${Date.now()}`,
                reservationId: reservation.id,
                amount: formData.depositAmount,
                paymentMethod: formData.depositMethod,
                paidAt: Date.now(),
            };
            const deposits = JSON.parse(localStorage.getItem('deposits') || '[]');
            deposits.push(deposit);
            localStorage.setItem('deposits', JSON.stringify(deposits));
            reservation.depositId = deposit.id;
        }

        saveReservation(reservation);
        showToast('✅ Prenotazione salvata con successo!', 'success');
        resetForm();
        setView('grid');
    };

    const resetForm = () => {
        setFormData({
            customerPhone: '',
            customerFirstName: '',
            customerLastName: '',
            customerEmail: '',
            customerCity: '',
            numberOfGuests: 2,
            numberOfChildren: 0,
            reservationTime: '20:00',
            specialRequests: '',
            occasion: '',
            highChair: false,
            depositAmount: 0,
            depositMethod: 'cash',
        });
        setFoundCustomer(null);
        setSelectedTable(null);
        setEditingReservation(null);
    };

    const handleCancelReservation = async (reservation: Reservation) => {
        const confirmed = await showConfirm(
            'Cancellare Prenotazione?',
            `Vuoi cancellare la prenotazione di ${reservation.customerName}?`
        );

        if (confirmed) {
            reservation.status = ReservationStatus.CANCELLED;
            reservation.cancelledAt = Date.now();
            saveReservation(reservation);
            showToast('Prenotazione cancellata', 'info');
        }
    };

    const getTableStatus = (tableNum: string) => {
        const res = reservations.find(r => r.tableNumber === tableNum && r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.COMPLETED);
        if (!res) return 'free';

        // Check if table should be blocked 2 hours before arrival
        const now = new Date();
        const [hours, minutes] = res.reservationTime.split(':').map(Number);
        const reservationDateTime = new Date(res.reservationDate);
        reservationDateTime.setHours(hours, minutes, 0, 0);
        const twoHoursBefore = new Date(reservationDateTime.getTime() - 2 * 60 * 60 * 1000);

        if (res.status === ReservationStatus.PENDING) {
            // If we're within 2 hours of reservation time, show as reserved
            if (now >= twoHoursBefore) {
                return 'reserved';
            }
            return 'reserved'; // Always show reserved for pending
        }
        if (res.status === ReservationStatus.SEATED) return 'seated';
        return 'active';
    };

    const getTableColor = (status: string) => {
        switch (status) {
            case 'free': return 'bg-slate-800 border-slate-700';
            case 'reserved': return 'bg-blue-900/30 border-blue-500';
            case 'seated': return 'bg-yellow-900/30 border-yellow-500';
            case 'active': return 'bg-green-900/30 border-green-500';
            default: return 'bg-slate-800 border-slate-700';
        }
    };

    // Check if all tables are booked for a specific date
    const isDateFullyBooked = (dateStr: string): boolean => {
        const dateReservations = allReservations.filter(
            r => r.reservationDate === dateStr &&
                r.status !== ReservationStatus.CANCELLED &&
                r.status !== ReservationStatus.COMPLETED
        );
        return dateReservations.length >= tableCount;
    };

    const tables = Array.from({ length: tableCount }, (_, i) => (i + 1).toString());

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl w-full max-w-7xl h-[90vh] flex flex-col border border-slate-800 shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                            <Calendar className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">Gestione Prenotazioni</h2>
                            <p className="text-slate-400 text-sm">Organizza i tavoli e gestisci i clienti</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="flex items-center gap-3 bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/50 hover:border-purple-400 rounded-2xl px-5 py-3 text-white transition-all shadow-xl min-w-[240px] group backdrop-blur-sm"
                            >
                                <Calendar size={18} className="text-purple-400 group-hover:scale-110 transition-transform drop-shadow-lg" />
                                <span className="flex-1 text-left font-black capitalize bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                                    {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                                </span>
                                <ChevronDown size={16} className={`text-purple-300 transition-all ${showDatePicker ? 'rotate-180' : ''}`} />
                            </button>


                            {/* Custom Calendar Picker */}
                            {showDatePicker && (
                                <div className="absolute top-full mt-2 right-0 bg-slate-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl p-5 z-50 min-w-[360px] backdrop-blur-sm">
                                    {/* Calendar Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            onClick={() => {
                                                const newMonth = new Date(calendarMonth);
                                                newMonth.setMonth(newMonth.getMonth() - 1);
                                                // Don't allow going before current month
                                                const today = new Date();
                                                if (newMonth.getMonth() >= today.getMonth() || newMonth.getFullYear() > today.getFullYear()) {
                                                    setCalendarMonth(newMonth);
                                                }
                                            }}
                                            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                                        >
                                            <ChevronLeft size={16} className="text-purple-400" />
                                        </button>
                                        <div className="text-center">
                                            <div className="text-lg font-black text-white capitalize">
                                                {calendarMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newMonth = new Date(calendarMonth);
                                                newMonth.setMonth(newMonth.getMonth() + 1);
                                                // Don't allow going beyond 12 months from now
                                                const maxDate = new Date();
                                                maxDate.setMonth(maxDate.getMonth() + 12);
                                                if (newMonth <= maxDate) {
                                                    setCalendarMonth(newMonth);
                                                }
                                            }}
                                            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                                        >
                                            <ChevronRight size={16} className="text-purple-400" />
                                        </button>
                                    </div>

                                    {/* Day Names */}
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                                            <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {(() => {
                                            const year = calendarMonth.getFullYear();
                                            const month = calendarMonth.getMonth();
                                            const firstDay = new Date(year, month, 1);
                                            const lastDay = new Date(year, month + 1, 0);
                                            const daysInMonth = lastDay.getDate();

                                            // Get the day of week (0 = Sunday, 1 = Monday, etc.)
                                            // Adjust so Monday = 0
                                            let startDay = firstDay.getDay() - 1;
                                            if (startDay === -1) startDay = 6; // Sunday becomes 6

                                            const days = [];
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);

                                            const maxDate = new Date();
                                            maxDate.setMonth(maxDate.getMonth() + 12);
                                            maxDate.setHours(23, 59, 59, 999);

                                            // Empty cells for days before month starts
                                            for (let i = 0; i < startDay; i++) {
                                                days.push(
                                                    <div key={`empty-${i}`} className="aspect-square" />
                                                );
                                            }

                                            // Days of the month
                                            for (let day = 1; day <= daysInMonth; day++) {
                                                const date = new Date(year, month, day);
                                                date.setHours(0, 0, 0, 0);
                                                const dateStr = date.toISOString().split('T')[0];
                                                const isSelected = dateStr === selectedDate;
                                                const isToday = date.getTime() === today.getTime();
                                                const isPast = date < today;
                                                const isFuture = date > maxDate;
                                                const isDisabled = isPast || isFuture;
                                                const isFullyBooked = isDateFullyBooked(dateStr);

                                                days.push(
                                                    <button
                                                        key={day}
                                                        onClick={() => {
                                                            if (!isDisabled) {
                                                                setSelectedDate(dateStr);
                                                                setShowDatePicker(false);
                                                            }
                                                        }}
                                                        disabled={isDisabled}
                                                        className={`aspect-square rounded-lg font-bold text-sm transition-all flex items-center justify-center relative ${isSelected
                                                                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg scale-105 ring-2 ring-purple-400'
                                                                : isToday
                                                                    ? 'bg-purple-900/30 border-2 border-purple-500 text-purple-300 hover:bg-purple-900/50'
                                                                    : isDisabled
                                                                        ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                                                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:scale-105 border border-slate-700'
                                                            }`}
                                                    >
                                                        {day}
                                                        {isFullyBooked && !isDisabled && (
                                                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full shadow-lg" title="Tutto prenotato" />
                                                        )}
                                                    </button>
                                                );
                                            }

                                            return days;
                                        })()}
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
                                        <button
                                            onClick={() => {
                                                const today = new Date();
                                                setSelectedDate(today.toISOString().split('T')[0]);
                                                setCalendarMonth(today);
                                                setShowDatePicker(false);
                                            }}
                                            className="flex-1 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500 text-purple-300 font-bold py-2 rounded-lg text-sm transition-colors"
                                        >
                                            Oggi
                                        </button>
                                        <button
                                            onClick={() => {
                                                const tomorrow = new Date();
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                setSelectedDate(tomorrow.toISOString().split('T')[0]);
                                                setCalendarMonth(tomorrow);
                                                setShowDatePicker(false);
                                            }}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-2 rounded-lg text-sm transition-colors"
                                        >
                                            Domani
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {view === 'grid' && (
                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFilterStatus('all')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterStatus === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        Tutti
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus(ReservationStatus.PENDING)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterStatus === ReservationStatus.PENDING ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        In Attesa
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus(ReservationStatus.SEATED)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterStatus === ReservationStatus.SEATED ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        A Tavola
                                    </button>
                                </div>

                                <button
                                    onClick={() => setView('form')}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                                >
                                    <Plus size={20} />
                                    Nuova Prenotazione
                                </button>
                            </div>

                            {/* Tables Grid */}
                            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                {tables.map(tableNum => {
                                    const status = getTableStatus(tableNum);
                                    const reservation = reservations.find(r => r.tableNumber === tableNum && r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.COMPLETED);

                                    return (
                                        <button
                                            key={tableNum}
                                            onClick={() => {
                                                if (status === 'free') {
                                                    setSelectedTable(tableNum);
                                                    setView('form');
                                                } else if (reservation) {
                                                    setEditingReservation(reservation);
                                                    setSelectedTable(tableNum);
                                                    // Populate form with reservation data
                                                    setFormData({
                                                        customerPhone: reservation.customerPhone,
                                                        customerFirstName: reservation.customerName.split(' ')[0] || '',
                                                        customerLastName: reservation.customerName.split(' ').slice(1).join(' ') || '',
                                                        customerEmail: '',
                                                        customerCity: '',
                                                        numberOfGuests: reservation.numberOfGuests,
                                                        numberOfChildren: reservation.numberOfChildren || 0,
                                                        reservationTime: reservation.reservationTime,
                                                        specialRequests: reservation.specialRequests || '',
                                                        occasion: reservation.occasion || '',
                                                        highChair: reservation.highChair || false,
                                                        depositAmount: reservation.depositAmount || 0,
                                                        depositMethod: reservation.depositMethod || 'cash',
                                                    });
                                                    setView('form');
                                                }
                                            }}
                                            className={`aspect-square ${getTableColor(status)} border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-xl relative group`}
                                        >
                                            <span className="text-2xl font-black text-white">{tableNum}</span>
                                            {reservation && (
                                                <>
                                                    <div className="text-xs text-slate-300 font-bold text-center">
                                                        {reservation.customerName.split(' ')[0]}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Users size={12} />
                                                        {reservation.numberOfGuests}{reservation.numberOfChildren ? ` +${reservation.numberOfChildren}` : ''}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Clock size={12} />
                                                        {reservation.reservationTime}
                                                    </div>
                                                </>
                                            )}
                                            {status === 'free' && (
                                                <span className="text-xs text-slate-500 font-bold">Libero</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Reservations List */}
                            <div className="mt-8">
                                <h3 className="text-xl font-black text-white mb-4">Prenotazioni del Giorno</h3>
                                <div className="space-y-3">
                                    {reservations
                                        .filter(r => filterStatus === 'all' || r.status === filterStatus)
                                        .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime))
                                        .map(res => (
                                            <div
                                                key={res.id}
                                                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-purple-500 transition-colors cursor-pointer group"
                                                onClick={() => {
                                                    setEditingReservation(res);
                                                    setSelectedTable(res.tableNumber);
                                                    // Populate form with reservation data
                                                    setFormData({
                                                        customerPhone: res.customerPhone,
                                                        customerFirstName: res.customerName.split(' ')[0] || '',
                                                        customerLastName: res.customerName.split(' ').slice(1).join(' ') || '',
                                                        customerEmail: '',
                                                        customerCity: '',
                                                        numberOfGuests: res.numberOfGuests,
                                                        numberOfChildren: res.numberOfChildren || 0,
                                                        reservationTime: res.reservationTime,
                                                        specialRequests: res.specialRequests || '',
                                                        occasion: res.occasion || '',
                                                        highChair: res.highChair || false,
                                                        depositAmount: res.depositAmount || 0,
                                                        depositMethod: res.depositMethod || 'cash',
                                                    });
                                                    setView('form');
                                                }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <span className="text-white font-black text-lg">{res.tableNumber}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">{res.customerName}</div>
                                                        <div className="text-sm text-slate-400 flex items-center gap-3">
                                                            <span className="flex items-center gap-1"><Clock size={14} />{res.reservationTime}</span>
                                                            <span className="flex items-center gap-1"><Users size={14} />{res.numberOfGuests} persone</span>
                                                            <span className="flex items-center gap-1"><Phone size={14} />{res.customerPhone}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {res.depositAmount && res.depositAmount > 0 && (
                                                        <div className="bg-green-900/30 border border-green-500 rounded-lg px-3 py-1 text-xs font-bold text-green-400">
                                                            Acconto: €{res.depositAmount}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent triggering the parent div's onClick
                                                            handleCancelReservation(res);
                                                        }}
                                                        className="w-8 h-8 bg-red-900/30 hover:bg-red-900/50 border border-red-500 rounded-lg flex items-center justify-center transition-colors"
                                                    >
                                                        <Trash2 size={16} className="text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'form' && (
                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="max-w-3xl mx-auto">
                                <div className="mb-6">
                                    <button
                                        onClick={() => {
                                            resetForm();
                                            setView('grid');
                                        }}
                                        className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
                                    >
                                        ← Torna alla Griglia
                                    </button>
                                </div>

                                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black text-white">
                                            {editingReservation ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}
                                        </h3>
                                        {selectedTable && (
                                            <div className="bg-purple-600 px-4 py-2 rounded-xl">
                                                <span className="text-white font-black">Tavolo {selectedTable}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Customer Search */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cerca Cliente (Telefono o Nome)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Inserisci telefono o nome..."
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                            />
                                            <button
                                                onClick={() => searchCustomer(searchQuery)}
                                                className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold text-white transition-colors flex items-center gap-2"
                                            >
                                                <Search size={18} />
                                                Cerca
                                            </button>
                                        </div>
                                        {foundCustomer && (
                                            <div className="mt-3 bg-green-900/20 border border-green-500 rounded-xl p-3 flex items-center gap-3">
                                                <Check size={20} className="text-green-400" />
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold text-green-400">Cliente Trovato!</div>
                                                    <div className="text-xs text-slate-400">{foundCustomer.totalVisits} visite precedenti • Ultima: {foundCustomer.lastVisit ? new Date(foundCustomer.lastVisit).toLocaleDateString() : 'Mai'}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Customer Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome *</label>
                                            <input
                                                type="text"
                                                value={formData.customerFirstName}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                                                    setFormData({ ...formData, customerFirstName: capitalized });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cognome *</label>
                                            <input
                                                type="text"
                                                value={formData.customerLastName}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                                                    setFormData({ ...formData, customerLastName: capitalized });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Telefono *</label>
                                            <input
                                                type="tel"
                                                value={formData.customerPhone}
                                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Email</label>
                                            <input
                                                type="email"
                                                value={formData.customerEmail}
                                                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Città</label>
                                        <input
                                            type="text"
                                            value={formData.customerCity}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                                                setFormData({ ...formData, customerCity: capitalized });
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    {/* Reservation Details */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                                <Users size={14} className="text-purple-400" />
                                                Numero Persone *
                                            </label>
                                            <select
                                                value={formData.numberOfGuests}
                                                onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 cursor-pointer"
                                            >
                                                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                                    <option key={num} value={num}>{num} {num === 1 ? 'Persona' : 'Persone'}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                                <Plus size={14} className="text-green-400" />
                                                <Baby size={14} className="text-blue-400" />
                                                Bambini
                                            </label>
                                            <select
                                                value={formData.numberOfChildren}
                                                onChange={(e) => setFormData({ ...formData, numberOfChildren: parseInt(e.target.value) })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 cursor-pointer"
                                            >
                                                {Array.from({ length: 11 }, (_, i) => i).map(num => (
                                                    <option key={num} value={num}>{num === 0 ? 'Nessuno' : num}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Orario Arrivo *</label>
                                            <select
                                                value={formData.reservationTime}
                                                onChange={(e) => setFormData({ ...formData, reservationTime: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 cursor-pointer"
                                            >
                                                {Array.from({ length: 48 }, (_, i) => {
                                                    const hour = Math.floor(i / 2) + 12; // Start from 12:00
                                                    const minute = i % 2 === 0 ? '00' : '30';
                                                    if (hour >= 24) return null;
                                                    const displayHour = hour % 24;
                                                    return <option key={i} value={`${String(displayHour).padStart(2, '0')}:${minute}`}>{`${String(displayHour).padStart(2, '0')}:${minute}`}</option>;
                                                }).filter(Boolean)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Occasion */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Occasione</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { value: 'Compleanno', icon: Gift, color: 'pink' },
                                                { value: 'Anniversario', icon: Heart, color: 'red' },
                                                { value: 'Business', icon: Briefcase, color: 'blue' },
                                                { value: 'Altro', icon: User, color: 'purple' },
                                            ].map(({ value, icon: Icon, color }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => setFormData({ ...formData, occasion: formData.occasion === value ? '' : value })}
                                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${formData.occasion === value
                                                        ? `bg-${color}-900/30 border-${color}-500`
                                                        : 'bg-slate-950 border-slate-700 hover:border-slate-600'
                                                        }`}
                                                >
                                                    <Icon size={20} className={formData.occasion === value ? `text-${color}-400` : 'text-slate-400'} />
                                                    <span className={`text-xs font-bold ${formData.occasion === value ? `text-${color}-400` : 'text-slate-400'}`}>
                                                        {value}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* High Chair */}
                                    <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <Baby size={20} className="text-blue-400" />
                                            <div>
                                                <div className="font-bold text-white text-sm">Seggiolone</div>
                                                <div className="text-xs text-slate-400">Richiesto per bambini</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, highChair: !formData.highChair })}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.highChair ? 'bg-blue-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.highChair ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Special Requests */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Richieste Speciali</label>
                                        <textarea
                                            value={formData.specialRequests}
                                            onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                                            placeholder="Allergie, preferenze, note particolari..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 resize-none h-24"
                                        />
                                    </div>

                                    {/* Deposit */}
                                    <div className="border-t border-slate-700 pt-6">
                                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                            <Euro size={18} className="text-green-400" />
                                            Acconto (Opzionale)
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Importo €</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.depositAmount}
                                                    onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Metodo Pagamento</label>
                                                <select
                                                    value={formData.depositMethod}
                                                    onChange={(e) => setFormData({ ...formData, depositMethod: e.target.value as PaymentMethod })}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500"
                                                >
                                                    <option value="cash">Contanti</option>
                                                    <option value="card">Carta</option>
                                                    <option value="bank_transfer">Bonifico</option>
                                                    <option value="paypal">PayPal</option>
                                                    <option value="stripe">Stripe</option>
                                                    <option value="satispay">Satispay</option>
                                                    <option value="other">Altro</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => {
                                                resetForm();
                                                setView('grid');
                                            }}
                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-colors"
                                        >
                                            Annulla
                                        </button>
                                        {editingReservation && (
                                            <button
                                                onClick={async () => {
                                                    if (editingReservation) {
                                                        await handleCancelReservation(editingReservation);
                                                        resetForm();
                                                        setView('grid');
                                                    }
                                                }}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={20} />
                                                Disdetta
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSubmitReservation}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Check size={20} />
                                            {editingReservation ? 'Aggiorna Prenotazione' : 'Conferma Prenotazione'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReservationManager;
