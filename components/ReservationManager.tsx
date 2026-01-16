import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Users, Phone, Mail, MapPin, Euro, CreditCard, X, Check, Edit2, Trash2, AlertCircle, User, History, Plus, Search, Filter, ChevronDown, Baby, Gift, Briefcase, Heart, XCircle, ChevronLeft, ChevronRight, LayoutGrid, Utensils, Printer } from 'lucide-react';
import { Reservation, Customer, ReservationStatus, PaymentMethod, Deposit, Order, OrderStatus } from '../types';
import { getReservationsFromCloud, getCustomersFromCloud, saveReservationToCloud, saveCustomerToCloud, generateUUID, getOrders } from '../services/storageService';

interface ReservationManagerProps {
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
}

const ReservationManager: React.FC<ReservationManagerProps> = ({ onClose, showToast, showConfirm }) => {
    const [view, setView] = useState<'grid' | 'form' | 'customer'>('grid');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all' | 'occupied'>('all');
    const [tableCount, setTableCount] = useState(12);
    const [occupancy, setOccupancy] = useState<Record<string, number>>({}); // Mappa: Data -> Num. Prenotazioni
    const [activeOrders, setActiveOrders] = useState<Order[]>([]); // Ordini attivi per mostrare tavoli occupati

    useEffect(() => {
        loadSettings();
        syncWithCloud();
        // Listener spostati nell'effect dipendente dalla data per closure corretta
    }, []);

    const loadSettings = () => {
        const settings = localStorage.getItem('ristosync_app_settings');
        if (settings) {
            try {
                const parsed = JSON.parse(settings);
                if (parsed.restaurantProfile && parsed.restaurantProfile.tableCount) {
                    setTableCount(parsed.restaurantProfile.tableCount);
                }
            } catch (e) { console.error("Error loading settings:", e); }
        }
    };

    const syncWithCloud = async () => {
        try {
            const cloudRes = await getReservationsFromCloud();
            if (cloudRes && cloudRes.length > 0) {
                localStorage.setItem('reservations', JSON.stringify(cloudRes));
                loadReservations();
                const updateOcc = () => { // Copy of updateOccupancy logic to avoid scope issues if defined later
                    try {
                        const counts: Record<string, number> = {};
                        cloudRes.forEach(r => {
                            if (r.status !== 'Cancellato' && r.status !== 'Non Presentato') {
                                counts[r.reservationDate] = (counts[r.reservationDate] || 0) + 1;
                            }
                        });
                        setOccupancy(counts);
                    } catch (e) { }
                };
                updateOcc();
            }
            const cloudCust = await getCustomersFromCloud();
            if (cloudCust && cloudCust.length > 0) {
                localStorage.setItem('customers', JSON.stringify(cloudCust));
                loadCustomers();
            }
        } catch (e) {
            console.error("Cloud sync failed (offline?)", e);
        }
    };

    // Ref for date picker
    const dateInputRef = useRef<HTMLInputElement>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        customerPhone: '',
        customerFirstName: '',
        customerLastName: '',
        customerEmail: '',
        customerCity: '',
        numberOfGuests: 2,
        numberOfChildren: 0,
        reservationDate: new Date().toISOString().split('T')[0],
        reservationTime: '20:00',
        specialRequests: '',
        occasion: '',
        highChair: false,
        depositAmount: '' as number | string,
        depositMethod: 'cash' as PaymentMethod,
    });

    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Load data
    useEffect(() => {
        loadReservations();
        loadCustomers();
        updateOccupancy();
        loadActiveOrders();

        const handleSettingsUpdate = () => loadSettings();
        // Re-definisco i listener qui per catturare la 'selectedDate' aggiornata nella closure di loadReservations
        const handleResUpdate = () => { loadReservations(); updateOccupancy(); };
        const handleCustUpdate = () => loadCustomers();
        const handleOrdersUpdate = () => loadActiveOrders();

        window.addEventListener('local-settings-update', handleSettingsUpdate);
        window.addEventListener('local-reservations-update', handleResUpdate);
        window.addEventListener('local-customers-update', handleCustUpdate);
        window.addEventListener('local-storage-update', handleOrdersUpdate);

        return () => {
            window.removeEventListener('local-settings-update', handleSettingsUpdate);
            window.removeEventListener('local-reservations-update', handleResUpdate);
            window.removeEventListener('local-customers-update', handleCustUpdate);
            window.removeEventListener('local-storage-update', handleOrdersUpdate);
        };
    }, [selectedDate]);
    // Load active orders (tables occupied by walk-ins)
    const loadActiveOrders = () => {
        const orders = getOrders() || [];
        const today = new Date().toISOString().split('T')[0];

        // Filter only REAL active orders:
        // 1. Not delivered/completed (check both enum value and string to be safe)
        // 2. Only from today (by checking timestamp)
        // 3. Only real table numbers (exclude _HISTORY, DEL_, ASP_ prefixes)
        const active = orders.filter(o => {
            // Check status - must NOT be delivered
            const statusStr = String(o.status);
            const isDelivered = statusStr === OrderStatus.DELIVERED ||
                statusStr === 'Servito' ||
                statusStr === 'DELIVERED';
            if (isDelivered) return false;

            // Check if it's a real table (not delivery, takeaway, or history)
            const tableNum = o.tableNumber?.toString() || '';
            const isSpecialTable = tableNum.includes('_HISTORY') ||
                tableNum.startsWith('DEL_') ||
                tableNum.startsWith('ASP_') ||
                tableNum.includes('HISTORY');
            if (isSpecialTable) return false;

            // Check if from today (optional but recommended)
            const orderDate = new Date(o.createdAt || o.timestamp);
            const orderDateStr = orderDate.toISOString().split('T')[0];
            if (orderDateStr !== today) return false;

            return true;
        });

        setActiveOrders(active);
    };

    // Get tables with active orders but NO reservation (walk-ins)
    const getOccupiedTablesWithoutReservation = (): string[] => {
        const reservedTables = reservations
            .filter(r => r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.COMPLETED)
            .map(r => r.tableNumber);

        const occupiedByOrders = [...new Set(activeOrders.map(o => o.tableNumber))];

        // Return tables that have orders but NO reservation
        return occupiedByOrders.filter(t => !reservedTables.includes(t));
    };

    // Sync form date with selected calendar date when opening new reservation
    useEffect(() => {
        // Solo se sto creando una NUOVA prenotazione (non editing)
        if (view === 'form' && !editingReservation && selectedTable) {
            setFormData(prev => ({
                ...prev,
                reservationDate: selectedDate
            }));
        }
    }, [view, selectedDate, editingReservation, selectedTable]);

    const updateOccupancy = () => {
        const stored = localStorage.getItem('reservations');
        if (stored) {
            try {
                const all: Reservation[] = JSON.parse(stored);
                const counts: Record<string, number> = {};
                all.forEach(r => {
                    if (r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.NO_SHOW) {
                        counts[r.reservationDate] = (counts[r.reservationDate] || 0) + 1;
                    }
                });
                setOccupancy(counts);
            } catch (e) { console.error("Error parsing reservations for occupancy", e); }
        }
    };

    const loadReservations = () => {
        const stored = localStorage.getItem('reservations');
        if (stored) {
            const all: Reservation[] = JSON.parse(stored);
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

    const saveReservation = async (reservation: Reservation): Promise<string | null> => {
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
        updateOccupancy();

        const cloudResult = await saveReservationToCloud(reservation);
        if (!cloudResult.success) {
            const msg = cloudResult.error?.message || JSON.stringify(cloudResult.error) || 'Errore Sconosciuto';
            showToast('⚠️ Errore Cloud: ' + msg, 'error');
            return msg;
        }
        return null;
    };

    const saveCustomer = async (customer: Customer): Promise<string | null> => {
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

        const cloudResult = await saveCustomerToCloud(customer);
        if (!cloudResult.success) {
            const msg = cloudResult.error?.message || JSON.stringify(cloudResult.error) || 'Errore Sconosciuto';
            showToast('⚠️ Errore Cloud Cliente: ' + msg, 'error');
            return msg;
        }
        return null;
    };

    // Ricerca intelligente in tempo reale
    const handleSearchInput = (query: string) => {
        setSearchQuery(query);

        if (query.trim().length < 2) {
            setCustomerSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Cerca clienti che matchano telefono, nome o cognome
        const matches = customers.filter(c =>
            c.phone.includes(query) ||
            c.firstName.toLowerCase().includes(query.toLowerCase()) ||
            c.lastName.toLowerCase().includes(query.toLowerCase()) ||
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // Max 5 suggerimenti

        setCustomerSuggestions(matches);
        setShowSuggestions(matches.length > 0);
    };

    // Seleziona cliente da suggerimenti
    const selectCustomer = (customer: Customer) => {
        setFoundCustomer(customer);
        setFormData({
            ...formData,
            customerPhone: customer.phone,
            customerFirstName: customer.firstName,
            customerLastName: customer.lastName,
            customerEmail: customer.email || '',
            customerCity: customer.city || '',
        });
        setSearchQuery(`${customer.firstName} ${customer.lastName}`);
        setShowSuggestions(false);
        showToast(`✅ Cliente selezionato: ${customer.firstName} ${customer.lastName}`, 'success');
    };

    const searchCustomer = (query: string) => {
        const found = customers.find(c =>
            c.phone.includes(query) ||
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
        );

        if (found) {
            selectCustomer(found);
        } else {
            setFoundCustomer(null);
        }
    };

    const getTableStatus = (tableNum: string) => {
        // FIRST: Check if table has active orders (walk-in or any order in progress)
        const hasActiveOrder = activeOrders.some(o => o.tableNumber === tableNum);
        if (hasActiveOrder) {
            return 'occupied'; // Table is in use right now!
        }

        // THEN: Check reservations - but only those that overlap with the time you want to book
        // A table can have multiple reservations at different times (e.g., lunch 12:00 and dinner 20:00)
        // We use a 2-hour window: if you're booking for 12:00, we check if there's a reservation
        // between 10:00 and 14:00 that would conflict
        const now = new Date();
        const activeRes = reservations.filter(r =>
            r.tableNumber === tableNum &&
            r.status !== ReservationStatus.CANCELLED &&
            r.status !== ReservationStatus.COMPLETED
        );

        // First priority: Check for SEATED customers (they are at the table now)
        const seatedRes = activeRes.find(r => r.status === ReservationStatus.SEATED);
        if (seatedRes) return 'seated';

        // Second: Check for PENDING reservations within a reasonable time window
        // Show as "reserved" only if there's a reservation within 2 hours from now
        const pendingRes = activeRes.find(r => {
            if (r.status !== ReservationStatus.PENDING) return false;

            const [hours, minutes] = r.reservationTime.split(':').map(Number);
            const resTime = new Date();
            resTime.setHours(hours, minutes, 0, 0);

            // Window: 2 hours before to 2 hours after reservation time
            // This prevents blocking the table all day for a single reservation
            const twoHoursBefore = new Date(resTime);
            twoHoursBefore.setHours(resTime.getHours() - 2);

            const twoHoursAfter = new Date(resTime);
            twoHoursAfter.setHours(resTime.getHours() + 2);

            return now >= twoHoursBefore && now <= twoHoursAfter;
        });

        if (pendingRes) return 'reserved';

        return 'free';
    };

    const handleTableClick = (tableNum: string) => {
        const status = getTableStatus(tableNum);

        // BLOCK: If table is occupied by active order, show warning
        if (status === 'occupied') {
            showToast(`⚠️ Tavolo ${tableNum} è OCCUPATO con ordine in corso! Non puoi prenotarlo adesso.`, 'error');
            return;
        }

        if (status === 'free') {
            setSelectedTable(tableNum);
            // Reset completo del form con data corretta dal calendario
            setFormData({
                customerPhone: '',
                customerFirstName: '',
                customerLastName: '',
                customerEmail: '',
                customerCity: '',
                numberOfGuests: 2,
                numberOfChildren: 0,
                reservationDate: selectedDate,
                reservationTime: '20:00',
                specialRequests: '',
                occasion: '',
                highChair: false,
                depositAmount: 0,
                depositMethod: 'cash' as PaymentMethod,
            });
            setEditingReservation(null);
            setFoundCustomer(null);
            setView('form');
        } else {
            const res = reservations.find(r => r.tableNumber === tableNum && r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.COMPLETED);
            if (res) {
                setEditingReservation(res);
                setSelectedTable(res.tableNumber);
                setFormData({
                    customerPhone: res.customerPhone,
                    customerFirstName: res.customerName.split(' ')[0] || '',
                    customerLastName: res.customerName.split(' ').slice(1).join(' ') || '',
                    customerEmail: res.customerEmail || '',
                    customerCity: '',
                    numberOfGuests: res.numberOfGuests,
                    numberOfChildren: res.numberOfChildren || 0,
                    reservationDate: res.reservationDate,
                    reservationTime: res.reservationTime,
                    specialRequests: res.specialRequests || '',
                    occasion: res.occasion || '',
                    highChair: res.highChair || false,
                    depositAmount: res.depositAmount || '',
                    depositMethod: res.depositMethod || 'cash',
                });
                setView('form');
            }
        }
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
            reservationDate: selectedDate,
            reservationTime: '20:00',
            specialRequests: '',
            occasion: '',
            highChair: false,
            depositAmount: '',
            depositMethod: 'cash',
        });
        setFoundCustomer(null);
        setSelectedTable(null);
        setEditingReservation(null);
        setSearchQuery('');
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [reservationToDelete, setReservationToDelete] = useState<Reservation | null>(null);

    const handleCancelReservation = (reservation: Reservation) => {
        setReservationToDelete(reservation);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (reservationToDelete) {
            const updatedRes = { ...reservationToDelete, status: ReservationStatus.CANCELLED, cancelledAt: Date.now() };
            saveReservation(updatedRes);
            showToast('Prenotazione cancellata', 'info');
            if (editingReservation?.id === reservationToDelete.id) {
                resetForm();
                setView('grid');
            }
            setShowDeleteConfirm(false);
            setReservationToDelete(null);
        }
    };

    const handleSubmitReservation = async () => {
        console.log("🚀 SUBMIT START");
        try {
            if (!selectedTable) {
                showToast('⚠️ Seleziona un tavolo', 'error');
                return;
            }

            if (!formData.customerPhone || !formData.customerFirstName) {
                showToast('⚠️ Compila almeno Nome e Telefono', 'error');
                return;
            }

            showToast('Salvataggio in corso...', 'info');

            // Create or update customer
            let customer = foundCustomer;

            // Search by phone if not found via search tool
            if (!customer && formData.customerPhone) {
                customer = customers.find(c => c.phone === formData.customerPhone) || null;
            }

            if (!customer) {
                customer = {
                    id: generateUUID(),
                    firstName: formData.customerFirstName,
                    lastName: formData.customerLastName,
                    phone: formData.customerPhone,
                    email: formData.customerEmail,
                    city: formData.customerCity,
                    createdAt: Date.now(),
                    totalVisits: 0,
                    totalSpent: 0,
                    vip: false
                };
                console.log("Creating new customer...");
                await saveCustomer(customer);
            } else {
                // Update existing customer data if changed
                const updatedCustomer = {
                    ...customer,
                    firstName: formData.customerFirstName,
                    lastName: formData.customerLastName,
                    email: formData.customerEmail || customer.email,
                    city: formData.customerCity || customer.city
                };
                console.log("Updating customer...");
                await saveCustomer(updatedCustomer);
            }

            const finalDepositAmount = Number(formData.depositAmount) || 0;

            // Create reservation
            const reservation: Reservation = {
                id: editingReservation?.id || generateUUID(),
                tableNumber: selectedTable,
                customerId: customer.id,
                customerName: `${formData.customerFirstName} ${formData.customerLastName}`.trim(),
                customerPhone: formData.customerPhone,
                customerEmail: formData.customerEmail,
                numberOfGuests: formData.numberOfGuests,
                numberOfChildren: formData.numberOfChildren,
                reservationDate: formData.reservationDate,
                reservationTime: formData.reservationTime,
                status: editingReservation ? editingReservation.status : ReservationStatus.PENDING,
                createdAt: editingReservation?.createdAt || Date.now(),
                updatedAt: Date.now(),
                specialRequests: formData.specialRequests,
                occasion: formData.occasion,
                highChair: formData.highChair,
                depositAmount: finalDepositAmount,
                depositPaid: finalDepositAmount > 0,
                depositMethod: formData.depositMethod,
            };

            // Handle Deposit (simple implementation)
            if (finalDepositAmount > 0 && !editingReservation) {
                const deposit: Deposit = {
                    id: generateUUID(),
                    reservationId: reservation.id,
                    amount: finalDepositAmount,
                    paymentMethod: formData.depositMethod,
                    paidAt: Date.now(),
                };
                const storedDeps = localStorage.getItem('deposits');
                const deposits = storedDeps ? JSON.parse(storedDeps) : [];
                deposits.push(deposit);
                localStorage.setItem('deposits', JSON.stringify(deposits));
                reservation.depositId = deposit.id;
            }

            console.log("Saving Reservation...");
            const errorMsg = await saveReservation(reservation);
            console.log("Save Result:", errorMsg);

            if (!errorMsg) {
                showToast('✅ Prenotazione salvata e sincronizzata!', 'success');
                resetForm();
                setView('grid');
            } else {
                alert("ERRORE SUPABASE:\n" + errorMsg + "\n\nControlla le Policy RLS su Supabase o l'Autenticazione.");
            }
        } catch (e: any) {
            console.error("CRITICAL ERROR handleSubmit:", e);
            alert("Errore Critico: " + (e.message || e));
        }
    };

    const handlePrint = () => {
        // Filter reservations for selected date
        const dailyReservations = reservations.filter(r => r.reservationDate === selectedDate && r.status !== 'Cancellato' && r.status !== 'Non Presentato');

        // Sort by time
        dailyReservations.sort((a, b) => a.reservationTime.localeCompare(b.reservationTime));

        // Calculate Summary Stats
        const totalReservations = dailyReservations.length;
        const totalPax = dailyReservations.reduce((acc, r) => acc + r.numberOfGuests, 0);
        const totalChildren = dailyReservations.reduce((acc, r) => acc + (r.numberOfChildren || 0), 0);

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Briefing Sala - ${new Date(selectedDate).toLocaleDateString('it-IT')}</title>
                    <style>
                        @page { size: A4; margin: 10mm; }
                        body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #1a1a1a; max-width: 210mm; margin: 0 auto; }
                        
                        /* Header */
                        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                        .header-left h1 { margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
                        .header-left p { margin: 5px 0 0; color: #555; font-size: 14px; }
                        .header-right { text-align: right; }
                        .date-box { font-size: 18px; font-weight: bold; border: 2px solid #000; padding: 5px 15px; border-radius: 4px; }

                        /* Summary Cards */
                        .summary { display: flex; gap: 15px; margin-bottom: 25px; }
                        .card { flex: 1; background: #f8f9fa; border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; }
                        .card-value { font-size: 24px; font-weight: 800; color: #000; display: block; }
                        .card-label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: 600; letter-spacing: 0.5px; }

                        /* Table */
                        table { width: 100%; border-collapse: collapse; font-size: 13px; }
                        th { background: #000; color: #fff; padding: 10px; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; text-align: left; }
                        td { border-bottom: 1px solid #eee; padding: 12px 10px; vertical-align: middle; }
                        
                        /* Rows */
                        tr:nth-child(even) { background-color: #fafafa; }
                        
                        /* Specific Columns */
                        .col-time { font-weight: bold; font-size: 15px; width: 60px; }
                        .col-table { font-weight: 900; font-size: 18px; text-align: center; width: 60px; border: 2px solid #000; border-radius: 4px; }
                        .col-pax { text-align: center; font-weight: bold; width: 50px; }
                        
                        /* Elements */
                        .customer-name { font-weight: bold; font-size: 15px; display: block; margin-bottom: 3px; }
                        .customer-phone { color: #666; font-size: 12px; }
                        
                        .tag { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-right: 5px; }
                        .tag-green { background: #e6f4ea; color: #1e7e34; border: 1px solid #c3e6cb; }
                        .tag-blue { background: #e8f0fe; color: #1967d2; border: 1px solid #b3d7ff; }
                        .tag-orange { background: #feefe3; color: #b05c0d; border: 1px solid #f8dec2; }
                        .tag-red { background: #fce8e6; color: #c5221f; border: 1px solid #fad2cf; }

                        .notes { font-style: italic; color: #555; background: #fff8e1; padding: 4px 8px; border-radius: 4px; margin-top: 4px; border-left: 3px solid #ffcc00; font-size: 12px; }

                        .checkbox { width: 20px; height: 20px; border: 2px solid #ccc; border-radius: 4px; display: inline-block; }

                        @media print {
                            body { -webkit-print-color-adjust: exact; padding: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="header-left">
                            <h1>Briefing Sala</h1>
                            <p>Lista Prenotazioni e Gestione Tavoli</p>
                        </div>
                        <div class="header-right">
                            <div class="date-box">
                                ${new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                        </div>
                    </div>
                
                    <div class="summary">
                        <div class="card">
                            <span class="card-value">${totalReservations}</span>
                            <span class="card-label">Prenotazioni Totali</span>
                        </div>
                        <div class="card">
                            <span class="card-value">${totalPax}</span>
                            <span class="card-label">Coperti Totali</span>
                        </div>
                        <div class="card">
                            <span class="card-value">${totalChildren}</span>
                            <span class="card-label">Bambini</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Ora</th>
                                <th>Arrivo</th>
                                <th>Tavolo</th>
                                <th>Cliente</th>
                                <th style="text-align: center;">Pax</th>
                                <th>Dettagli & Note</th>
                                <th>Acconto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dailyReservations.map(r => `
                                <tr>
                                    <td class="col-time">${r.reservationTime.substring(0, 5)}</td>
                                    <td><div class="checkbox"></div></td>
                                    <td style="padding: 5px;"><div class="col-table">${r.tableNumber || '?'}</div></td>
                                    <td>
                                        <span class="customer-name">${r.customerName}</span>
                                        <span class="customer-phone">${r.customerPhone}</span>
                                    </td>
                                    <td class="col-pax">
                                        ${r.numberOfGuests}
                                        ${r.numberOfChildren ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">+${r.numberOfChildren} Bimbi</div>` : ''}
                                    </td>
                                    <td>
                                        ${r.highChair ? `<span class="tag tag-orange">Seggiolone</span>` : ''}
                                        ${r.occasion ? `<span class="tag tag-blue">${r.occasion}</span>` : ''}
                                        ${r.specialRequests ? `<div class="notes">${r.specialRequests}</div>` : ''}
                                    </td>
                                    <td>
                                        ${r.depositAmount ? `<span class="tag tag-green">€${r.depositAmount}</span>` : '<span style="color:#ccc; font-size: 20px;">-</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 40px; padding-top: 10px; border-top: 1px dotted #ccc; display: flex; justify-content: space-between; font-size: 11px; color: #888;">
                        <div>Note Staff: _________________________________________________________________________________</div>
                        <div>Stampato il ${new Date().toLocaleString('it-IT')}</div>
                    </div>

                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

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
                        {/* Print Button */}
                        <button
                            onClick={handlePrint}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-3 rounded-xl transition-all shadow-lg border border-slate-700 hover:border-slate-500"
                            title="Stampa lista prenotazioni"
                        >
                            <Printer size={20} />
                        </button>

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

                            {/* Custom Date Picker Dropdown */}
                            {showDatePicker && (
                                <div className="absolute top-full mt-2 right-0 bg-slate-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl p-6 z-50 w-[400px]">
                                    {/* Calendar Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            onClick={() => {
                                                const newDate = new Date(selectedDate);
                                                newDate.setMonth(newDate.getMonth() - 1);
                                                setSelectedDate(newDate.toISOString().split('T')[0]);
                                            }}
                                            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
                                        >
                                            <ChevronLeft size={20} className="text-white" />
                                        </button>
                                        <div className="text-center">
                                            <div className="text-lg font-black text-white">
                                                {new Date(selectedDate).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newDate = new Date(selectedDate);
                                                const maxDate = new Date();
                                                maxDate.setFullYear(maxDate.getFullYear() + 1);
                                                newDate.setMonth(newDate.getMonth() + 1);
                                                if (newDate <= maxDate) {
                                                    setSelectedDate(newDate.toISOString().split('T')[0]);
                                                }
                                            }}
                                            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
                                        >
                                            <ChevronRight size={20} className="text-white" />
                                        </button>
                                    </div>

                                    {/* Weekday Headers */}
                                    <div className="grid grid-cols-7 gap-2 mb-2">
                                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                                            <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Days */}
                                    <div className="grid grid-cols-7 gap-2 mb-4">
                                        {(() => {
                                            const currentDate = new Date(selectedDate);
                                            const year = currentDate.getFullYear();
                                            const month = currentDate.getMonth();
                                            const firstDay = new Date(year, month, 1);
                                            const lastDay = new Date(year, month + 1, 0);
                                            const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Adjust for Monday start
                                            const days = [];

                                            // Empty cells before month starts
                                            for (let i = 0; i < startingDayOfWeek; i++) {
                                                days.push(<div key={`empty-${i}`} className="h-10" />);
                                            }

                                            // Days of the month
                                            for (let day = 1; day <= lastDay.getDate(); day++) {
                                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const isSelected = dateStr === selectedDate;
                                                const isToday = dateStr === new Date().toISOString().split('T')[0];
                                                const isPast = new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]);
                                                const dailyCount = occupancy[dateStr] || 0;
                                                const isFull = dailyCount >= tableCount;

                                                days.push(
                                                    <button
                                                        key={day}
                                                        onClick={() => {
                                                            setSelectedDate(dateStr);
                                                            setShowDatePicker(false);
                                                        }}
                                                        disabled={isPast}
                                                        className={`h-10 rounded-xl font-bold text-sm transition-all relative ${isSelected
                                                            ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                                                            : isToday
                                                                ? 'bg-purple-900/30 border-2 border-purple-500 text-purple-300 hover:bg-purple-900/50'
                                                                : isPast
                                                                    ? 'bg-slate-950 text-slate-700 cursor-not-allowed'
                                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                                            }`}
                                                    >
                                                        {/* Indicatore prenotazioni - alto sinistra */}
                                                        {dailyCount > 0 && !isSelected && !isPast && (
                                                            <div
                                                                className={`absolute top-1 left-1 w-2 h-2 rounded-full shadow-sm ring-1 ring-slate-900 ${isFull ? 'bg-red-500' : 'bg-orange-500'
                                                                    }`}
                                                                title={isFull ? `Tutto Esaurito (${dailyCount}/${tableCount})` : `${dailyCount} prenotazioni`}
                                                            />
                                                        )}
                                                        {day}
                                                    </button>
                                                );
                                            }

                                            return days;
                                        })()}
                                    </div>

                                    {/* Today Button */}
                                    <button
                                        onClick={() => {
                                            setSelectedDate(new Date().toISOString().split('T')[0]);
                                            setShowDatePicker(false);
                                        }}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                                    >
                                        Oggi
                                    </button>
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
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${filterStatus === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        Tutti
                                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                            {reservations.filter(r => r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.COMPLETED).length}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus(ReservationStatus.PENDING)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${filterStatus === ReservationStatus.PENDING ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        ⏳ In Attesa
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${filterStatus === ReservationStatus.PENDING ? 'bg-white/20' : 'bg-blue-500/30 text-blue-400'}`}>
                                            {reservations.filter(r => r.status === ReservationStatus.PENDING).length}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus(ReservationStatus.SEATED)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${filterStatus === ReservationStatus.SEATED ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        🪑 A Tavola
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${filterStatus === ReservationStatus.SEATED ? 'bg-white/20' : 'bg-yellow-500/30 text-yellow-400'}`}>
                                            {reservations.filter(r => r.status === ReservationStatus.SEATED).length}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus('occupied')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${filterStatus === 'occupied' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        🍽️ Occupato
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${filterStatus === 'occupied' ? 'bg-white/20' : 'bg-orange-500/30 text-orange-400'}`}>
                                            {getOccupiedTablesWithoutReservation().length}
                                        </span>
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

                            {/* Tables Grid Visualization */}
                            <div className="mb-8">
                                <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                                    <LayoutGrid size={24} className="text-purple-500" />
                                    Mappa Tavoli ({new Date(selectedDate).toLocaleDateString('it-IT')})
                                </h3>
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                    {Array.from({ length: tableCount }, (_, i) => i + 1).map(num => {
                                        const tableNum = num.toString();
                                        const status = getTableStatus(tableNum);

                                        // Find active reservation for this table
                                        const res = reservations.find(r =>
                                            r.tableNumber === tableNum &&
                                            r.status !== ReservationStatus.CANCELLED &&
                                            r.status !== ReservationStatus.COMPLETED
                                        );

                                        // Status now includes 'occupied' for tables with active orders
                                        const isOccupied = status === 'occupied';

                                        let bgClass = "bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-400";
                                        let icon = <Check size={16} />;
                                        let label = "Libero";

                                        if (isOccupied) {
                                            // Table with active order (walk-in or seated customer ordering)
                                            bgClass = "bg-orange-900/40 border-orange-500 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-not-allowed";
                                            icon = <Utensils size={16} />;
                                            label = "Occupato";
                                        } else if (status === 'reserved') {
                                            bgClass = "bg-purple-900/30 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]";
                                            icon = <Calendar size={16} />;
                                            label = "Prenotato";
                                        } else if (status === 'seated') {
                                            bgClass = "bg-yellow-900/30 border-yellow-500 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
                                            icon = <Users size={16} />;
                                            label = "A Tavola";
                                        }

                                        return (
                                            <button
                                                key={num}
                                                onClick={() => handleTableClick(tableNum)}
                                                className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 transition-all hover:scale-105 active:scale-95 relative group overflow-hidden ${bgClass}`}
                                            >
                                                <span className={`font-black mb-1 transition-all ${res || isOccupied ? 'text-xl' : 'text-2xl'}`}>{num}</span>

                                                {res ? (
                                                    <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-2">
                                                        <div className="text-[10px] font-bold text-white truncate w-full text-center px-0.5 mb-0.5">
                                                            {res.customerName.split(' ')[0]}
                                                        </div>
                                                        <div className="flex items-center justify-center gap-2 w-full opacity-90">
                                                            <span className="flex items-center gap-0.5 text-[10px]">
                                                                <Users size={10} />
                                                                {res.numberOfGuests}
                                                                {res.numberOfChildren ? <span className="text-[9px] opacity-80">+{res.numberOfChildren}👶</span> : ''}
                                                            </span>
                                                            <span className="flex items-center gap-0.5 text-[10px]"><Clock size={10} /> {res.reservationTime.substring(0, 5)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        {icon}
                                                        <span className="text-[10px] uppercase font-bold mt-1">{label}</span>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Reservations List */}
                            <div className="mt-8">
                                <h3 className="text-xl font-black text-white mb-4">Prenotazioni del Giorno</h3>
                                <div className="space-y-3">
                                    {reservations
                                        .filter(r => r.status !== ReservationStatus.CANCELLED && r.status !== ReservationStatus.COMPLETED)
                                        .filter(r => filterStatus === 'all' || r.status === filterStatus)
                                        .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime))
                                        .map(res => (
                                            <div
                                                key={res.id}
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
                                                        reservationDate: res.reservationDate,
                                                        reservationTime: res.reservationTime,
                                                        specialRequests: res.specialRequests || '',
                                                        occasion: res.occasion || '',
                                                        highChair: res.highChair || false,
                                                        depositAmount: res.depositAmount || 0,
                                                        depositMethod: res.depositMethod || 'cash',
                                                    });
                                                    setView('form');
                                                }}
                                                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-purple-500 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${res.status === ReservationStatus.SEATED ? 'bg-yellow-600' : 'bg-purple-600'}`}>
                                                        <span className="text-white font-black text-lg">{res.tableNumber}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white">{res.customerName}</span>
                                                            {/* Status Badge */}
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${res.status === ReservationStatus.SEATED
                                                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                                                }`}>
                                                                {res.status === ReservationStatus.SEATED ? '🪑 A Tavola' : '⏳ In Attesa'}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-slate-400 flex items-center gap-3">
                                                            <span className="flex items-center gap-1"><Clock size={14} />{res.reservationTime}</span>
                                                            <span className="flex items-center gap-1"><Users size={14} />{res.numberOfGuests} adulti</span>
                                                            <span className="flex items-center gap-1"><Phone size={14} />{res.customerPhone}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Status Change Button */}
                                                    {res.status === ReservationStatus.PENDING && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const updatedRes = {
                                                                    ...res,
                                                                    status: ReservationStatus.SEATED,
                                                                    arrivedAt: Date.now(),
                                                                    seatedAt: Date.now()
                                                                };
                                                                await saveReservation(updatedRes);
                                                                showToast(`✅ ${res.customerName} è arrivato! Tavolo ${res.tableNumber} occupato.`, 'success');
                                                            }}
                                                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-lg"
                                                        >
                                                            <Check size={14} />
                                                            È Arrivato
                                                        </button>
                                                    )}
                                                    {res.status === ReservationStatus.SEATED && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const updatedRes = {
                                                                    ...res,
                                                                    status: ReservationStatus.COMPLETED,
                                                                    completedAt: Date.now()
                                                                };
                                                                await saveReservation(updatedRes);
                                                                showToast(`✅ Tavolo ${res.tableNumber} liberato.`, 'success');
                                                            }}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-lg"
                                                        >
                                                            <Check size={14} />
                                                            Completa
                                                        </button>
                                                    )}
                                                    {res.depositAmount && res.depositAmount > 0 && (
                                                        <div className="bg-green-900/30 border border-green-500 rounded-lg px-3 py-1 text-xs font-bold text-green-400">
                                                            €{res.depositAmount}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCancelReservation(res);
                                                        }}
                                                        className="w-8 h-8 bg-red-900/30 hover:bg-red-900/50 border border-red-500 rounded-lg flex items-center justify-center transition-colors"
                                                        title="Cancella prenotazione"
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

                                    {/* Date & Table Selection Row */}
                                    {/* Date & Table Selection Row */}
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        {/* Styled Date Picker using Overlay Trick */}
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2">
                                                <Calendar size={12} className="text-purple-400" />
                                                Data Prenotazione
                                            </label>
                                            <div className="bg-slate-900 border border-slate-700 group-hover:border-purple-500 rounded-xl px-4 py-3 flex items-center justify-between transition-all cursor-pointer h-[72px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                                        <Calendar size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-bold text-sm">
                                                            {new Date(formData.reservationDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                                            {formData.reservationDate.split('-')[0]}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronDown size={16} className="text-slate-500 group-hover:text-purple-500 transition-colors" />
                                            </div>
                                            <input
                                                type="date"
                                                value={formData.reservationDate}
                                                onClick={(e) => {
                                                    try { (e.target as HTMLInputElement).showPicker(); } catch (err) { }
                                                }}
                                                onChange={(e) => setFormData({ ...formData, reservationDate: e.target.value })}
                                                className="absolute inset-0 top-6 w-full h-full opacity-0 cursor-pointer z-20"
                                            />
                                        </div>

                                        {/* Styled Dynamic Table Selector */}
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2">
                                                <LayoutGrid size={12} className="text-blue-400" />
                                                Tavolo
                                            </label>
                                            <div className="bg-slate-900 border border-slate-700 group-hover:border-blue-500 rounded-xl px-4 py-3 flex items-center justify-between transition-all cursor-pointer h-[72px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                                        <LayoutGrid size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-bold text-sm">
                                                            {selectedTable ? `Tavolo ${selectedTable}` : 'Seleziona...'}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                                            {selectedTable ? 'Disponibile' : 'Nessun tavolo'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronDown size={16} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                            <select
                                                value={selectedTable || ''}
                                                onChange={(e) => setSelectedTable(e.target.value)}
                                                className="absolute inset-0 top-6 w-full h-full opacity-0 cursor-pointer z-20 appearance-none bg-transparent"
                                            >
                                                <option value="" disabled>Seleziona un tavolo</option>
                                                {selectedTable && !Array.from({ length: tableCount }, (_, i) => String(i + 1)).includes(selectedTable) && (
                                                    <option value={selectedTable}>Tavolo {selectedTable} (Corrente)</option>
                                                )}
                                                {Array.from({ length: tableCount }, (_, i) => String(i + 1))
                                                    .filter(tNum => {
                                                        if (tNum === selectedTable) return true;
                                                        const conflict = reservations.some(r =>
                                                            r.tableNumber === tNum &&
                                                            r.reservationDate === formData.reservationDate &&
                                                            r.status !== 'Cancellato' &&
                                                            r.status !== 'Non Presentato' &&
                                                            r.id !== editingReservation?.id
                                                        );
                                                        return !conflict;
                                                    })
                                                    .map(tNum => (
                                                        <option key={tNum} value={tNum}>Tavolo {tNum}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>

                                    {/* Customer Search */}
                                    <div className="relative">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cerca Cliente (Telefono o Nome)</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearchInput(e.target.value)}
                                                    onFocus={() => {
                                                        if (customerSuggestions.length > 0) setShowSuggestions(true);
                                                    }}
                                                    placeholder="Inserisci telefono o nome..."
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                                                />

                                                {/* Dropdown Suggerimenti */}
                                                {showSuggestions && customerSuggestions.length > 0 && (
                                                    <div className="absolute top-full mt-2 w-full bg-slate-900 border border-purple-500 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                                                        {customerSuggestions.map((customer) => (
                                                            <button
                                                                key={customer.id}
                                                                type="button"
                                                                onClick={() => selectCustomer(customer)}
                                                                className="w-full text-left px-4 py-3 hover:bg-purple-900/30 transition-colors border-b border-slate-800 last:border-0"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <div className="text-white font-bold text-sm">
                                                                            {customer.firstName} {customer.lastName}
                                                                        </div>
                                                                        <div className="text-slate-400 text-xs">
                                                                            📞 {customer.phone} {customer.city && `• 📍 ${customer.city}`}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-purple-400 font-bold">
                                                                        {customer.totalVisits || 0} visite
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
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
                                                Numero Adulti *
                                            </label>
                                            <select
                                                value={formData.numberOfGuests}
                                                onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 cursor-pointer"
                                            >
                                                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                                    <option key={num} value={num}>{num} {num === 1 ? 'Adulto' : 'Adulti'}</option>
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
                                                    value={formData.depositAmount === 0 || formData.depositAmount === '' ? '' : formData.depositAmount}
                                                    onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                                                    onFocus={(e) => {
                                                        if (formData.depositAmount === 0 || formData.depositAmount === '') {
                                                            setFormData({ ...formData, depositAmount: '' });
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        if (e.target.value === '') {
                                                            setFormData({ ...formData, depositAmount: '' });
                                                        }
                                                    }}
                                                    placeholder="es. 10.00"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 placeholder:opacity-50 outline-none focus:border-green-500"
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
                                                onClick={() => {
                                                    if (editingReservation) {
                                                        handleCancelReservation(editingReservation);
                                                    }
                                                }}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={20} />
                                                Disdetta
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                console.log("CLICK CONFIRM BUTTON");
                                                handleSubmitReservation();
                                            }}
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


            {/* Local Delete Confirmation Dialog */}
            {
                showDeleteConfirm && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-2 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                    <AlertCircle size={40} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-2">Sicuro?</h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        Vuoi davvero cancellare questa prenotazione? <br />L'azione è irreversibile.
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full mt-4">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setReservationToDelete(null);
                                        }}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-900/40 hover:-translate-y-1"
                                    >
                                        Cancella
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ReservationManager;
