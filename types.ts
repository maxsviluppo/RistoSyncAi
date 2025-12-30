

export enum OrderStatus {
  PENDING = 'In Attesa',
  COOKING = 'In Preparazione',
  READY = 'Pronto',
  DELIVERED = 'Servito'
}

export enum Category {
  MENU_COMPLETO = 'Menu Completo', // New Combo Category
  ANTIPASTI = 'Antipasti',
  PANINI = 'Panini',
  PIZZE = 'Pizze',
  PRIMI = 'Primi',
  SECONDI = 'Secondi',
  DOLCI = 'Dolci',
  BEVANDE = 'Bevande'
}

export type Department = 'Cucina' | 'Sala' | 'Pizzeria' | 'Pub';

export interface NotificationSettings {
  kitchenSound: boolean;
  waiterSound: boolean;
  pushEnabled: boolean;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  google?: string; // Google Business
  tripadvisor?: string;
  thefork?: string;
  youtube?: string;
  linkedin?: string;
}

export interface AgentInfo {
  name?: string;
  iban?: string;
  commissionType?: 'Monthly' | 'Annual' | 'Percentage' | 'OneOff';
  commissionValue?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
}

export interface RestaurantProfile {
  name?: string; // Nome Visualizzato (Insegna)
  description?: string; // Bio/Descrizione pubblica
  logo?: string; // Logo del ristorante (base64 o URL) - formato quadrato consigliato 400x400
  tableCount?: number; // Configurable table count

  // Dati Fatturazione
  businessName?: string; // Ragione Sociale
  responsiblePerson?: string; // Nome e Cognome Responsabile
  vatNumber?: string; // P.IVA / CF
  sdiCode?: string;
  pecEmail?: string;
  address?: string; // Sede Legale
  billingAddress?: string; // Sede Fatturazione (se diversa)

  // Contatti
  phoneNumber?: string; // Cellulare
  landlineNumber?: string; // Fisso
  whatsappNumber?: string; // WhatsApp
  email?: string; // Email Contatto/Fatturazione
  website?: string;

  socials?: SocialLinks;

  // Real Social API Configuration
  socialApiConfig?: {
    facebookPageId?: string;
    facebookAccessToken?: string; // Long-lived Page Token
    instagramUserId?: string; // IG Business Account ID
    instagramAccessToken?: string; // Often same as FB, but good to separate
  };

  // WhatsApp Cloud API Configuration
  whatsappApiConfig?: {
    phoneNumberId?: string; // ID del numero di telefono Meta
    businessAccountId?: string; // ID Business Account
    accessToken?: string; // Token permanente o temporaneo
    apiVersion?: string; // es. v18.0
  };

  // Subscription Fields
  subscriptionEndDate?: string; // ISO Date String
  planType?: 'Trial' | 'Basic' | 'Pro' | 'Basic_Annuale' | 'Pro_Annuale' | 'Free' | 'Demo' | 'Promo';
  subscriptionCost?: string; // Custom cost set by Admin (string to allow formatting like "29.90")
  allowedDepartment?: 'kitchen' | 'pizzeria' | 'pub' | 'delivery'; // For Basic Plan restriction


  // Agent Data
  agent?: AgentInfo;

  // User Preferences
  userPreferences?: {
    termsAccepted?: boolean;
    cookiesAccepted?: boolean;
    privacyAccepted?: boolean;
    welcomeModalShown?: boolean;
    dontShowWelcomeAgain?: boolean;
  };

  adminNotes?: string; // Note interne Super Admin
}

// Delivery Platform Configuration
export interface DeliveryPlatform {
  id: string;
  name: string;
  shortCode: string; // es. 'JE', 'GL', 'DE'
  color: string; // HEX color
  bgClass: string; // Tailwind bg class
  borderClass: string; // Tailwind border class
  enabled: boolean;
  // Optional API/Contract Info
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  contractNumber?: string;
  commissionPercent?: number;
  notes?: string;
}

// Standalone Exported Interface
export interface Subscription {
  planId: 'trial' | 'basic' | 'pro';
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  startDate: number;
  endDate: number;
  paymentMethod?: 'stripe' | 'paypal' | 'bonifico' | 'manual_override';
  paymentReference?: string;
}

export interface AppSettings {
  categoryDestinations: Record<Category, Department>;
  // Updated: Record<string, boolean> to allow 'Cassa' key alongside departments
  printEnabled: Record<string, boolean>;
  restaurantProfile?: RestaurantProfile;
  deliveryPlatforms?: DeliveryPlatform[];
  // Cloud-Synced Operational Data
  tableReservations?: string[];
  sharedTables?: Record<string, string[]>; // tableNum -> [waiterName1, waiterName2]
  activeCollaborations?: any[]; // For syncing request/accept flows
  // Subscription data
  subscription?: Subscription;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  description?: string; // Used for AI context
  ingredients?: string; // New: Specific ingredients field
  allergens?: string[]; // Array of allergen names (e.g., 'Glutine', 'Latte')
  image?: string; // Base64 encoded image

  // Combo / Menu Completo specific fields
  isCombo?: boolean;
  comboItems?: string[]; // Array of IDs of other dishes included
  specificDepartment?: Department; // Overrides category destination (e.g. Pizza Menu goes to Pizzeria, Burger Menu to Pub)
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  completed?: boolean; // Kitchen finished cooking (Global or Single Item)
  served?: boolean;    // Waiter delivered to table
  isAddedLater?: boolean; // New: Tracks items added via modification

  // NEW: Tracks which specific sub-items of a Combo are done.
  // Example: ['pizza_id_1'] means the pizza part is done/cooked.
  comboCompletedParts?: string[];

  // NEW: Tracks which specific sub-items have been SERVED to the table.
  comboServedParts?: string[];
}

export type OrderSource = 'table' | 'just-eat' | 'glovo' | 'deliveroo' | 'uber-eats' | 'the-fork' | 'phone' | 'takeaway';

export interface Order {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  status: OrderStatus;
  timestamp: number; // Last updated timestamp (acts as exit time when Delivered)
  createdAt: number; // Creation timestamp (entry time)
  waiterName?: string;

  // Delivery & Takeaway Fields (Optional)
  source?: OrderSource;
  platformId?: string; // ID ordine Piattaforma (es. #JE123456)
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  deliveryTime?: string; // Orario richiesto
  deliveryNotes?: string; // Note citofono ecc
  notes?: string; // Note generali (es. per encoded delivery info)
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_item';
  discountValue: number;
  active: boolean;
  target: 'all' | 'table_spend_above' | 'specific_items';
  targetValue?: number; // e.g. spend > 50
  startDate?: string;
  endDate?: string;
}

export interface MarketingAutomation {
  id: string;
  type: 'birthday_promo' | 'review_request' | 'smart_upsell' | 'happy_hour';
  title: string;
  isActive: boolean;
  config: {
    discountValue?: number;
    discountType?: 'percentage' | 'fixed_amount';
    message?: string;
    reviewPlatform?: 'google' | 'tripadvisor' | 'all';
    daysOfWeek?: number[]; // 0=Sun, 1=Mon...
    startTime?: string; // "18:00"
    endTime?: string; // "20:00"
    minSpend?: number;
  };
}

export interface SocialPost {
  id: string;
  topic?: string;
  content: string;
  image?: string | null;
  overlayText?: string;
  date: number; // created timestamp
  platform?: 'facebook' | 'instagram' | 'all';
}

// ============================================
// 🆕 RESERVATION SYSTEM TYPES
// ============================================

export enum ReservationStatus {
  PENDING = 'In Attesa',        // Prenotazione confermata, cliente non ancora arrivato
  SEATED = 'A Tavola',          // Cliente arrivato e seduto, ma non ha ancora ordinato
  ORDERING = 'Ordinazione',     // Cliente sta ordinando
  ACTIVE = 'In Corso',          // Ordine attivo (usa il sistema esistente)
  COMPLETED = 'Completato',     // Servizio completato
  CANCELLED = 'Cancellato',     // Prenotazione cancellata
  NO_SHOW = 'Non Presentato'    // Cliente non si è presentato
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'paypal' | 'stripe' | 'satispay' | 'other';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
  createdAt: number;
  lastVisit?: number;
  totalVisits: number;
  totalSpent: number;
  preferredTable?: string;
  allergies?: string[];
  vip?: boolean; // Cliente VIP
  gender?: 'male' | 'female' | 'other';
}

export interface Deposit {
  id: string;
  reservationId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: number;
  notes?: string;
  refunded?: boolean;
  refundedAt?: number;
  refundReason?: string;
}

export interface Reservation {
  id: string;
  tableNumber: string;
  customerId: string; // Reference to Customer
  customerName: string; // Denormalized for quick access
  customerPhone: string; // Denormalized for quick access
  customerEmail?: string; // Denormalized for quick access
  numberOfGuests: number;
  numberOfChildren?: number; // Number of children (included in total or additional)
  reservationDate: string; // ISO date (YYYY-MM-DD)
  reservationTime: string; // HH:mm format (es. "20:30")
  status: ReservationStatus;
  createdAt: number;
  updatedAt: number;

  // Optional fields
  specialRequests?: string;
  occasion?: string; // es. "Compleanno", "Anniversario", "Business"
  highChair?: boolean; // Seggiolone per bambini

  // Deposit info
  depositAmount?: number;
  depositPaid?: boolean;
  depositMethod?: PaymentMethod;
  depositId?: string; // Reference to Deposit

  // Tracking
  arrivedAt?: number; // Timestamp quando il cliente è arrivato
  seatedAt?: number; // Timestamp quando è stato fatto sedere
  orderId?: string; // Reference to Order when they start ordering
  completedAt?: number;
  cancelledAt?: number;
  cancelReason?: string;
  noShowMarkedAt?: number;

  // Staff
  createdBy?: string; // Nome utente che ha creato la prenotazione
  waiterAssigned?: string; // Cameriere assegnato al tavolo
}

// Report Types
export interface DailyReport {
  date: string; // YYYY-MM-DD
  totalRevenue: number;
  totalOrders: number;
  totalReservations: number;
  totalDeposits: number;
  totalExpenses: number;
  netProfit: number;
}

export interface DepositReport {
  date: string;
  deposits: Deposit[];
  totalAmount: number;
  byPaymentMethod: Record<PaymentMethod, number>;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  receipt?: string; // Base64 image or URL
  notes?: string;
  createdAt: number;
  createdBy?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'food' | 'beverage' | 'supplies' | 'other';
  quantity: number;
  unit: string; // kg, l, pz, ecc.
  costPerUnit: number;
  supplier?: string;
  lastRestocked: number;
  minQuantity?: number; // Soglia minima per alert
  expiryDate?: string; // YYYY-MM-DD
}