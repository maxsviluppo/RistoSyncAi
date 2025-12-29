# 📋 FILE MODIFICATI PER DEPLOY - RistoSync AI
**Data**: 29 Dicembre 2024  
**Versione**: 1.0.1  
**Modifiche**: Piano Basic con restrizioni + Pagamenti Stripe/PayPal

---

## 🎯 NUOVE FUNZIONALITÀ IMPLEMENTATE

### 1. **Piano Basic con Restrizioni Reparto**
- Gli utenti con piano Basic possono scegliere UN SOLO reparto (Kitchen, Pizzeria, Pub o Delivery)
- La scelta viene salvata permanentemente nel profilo
- Blocco automatico per accesso ad altri reparti

### 2. **Integrazione Pagamenti Stripe**
- Checkout sicuro con carta di credito/debito
- Supporto piani mensili e annuali
- Redirect automatico a Stripe Checkout

### 3. **Integrazione Pagamenti PayPal**
- Pagamento tramite email PayPal
- QR Code per pagamento rapido
- Conferma manuale pagamento

### 4. **Bonifico Bancario Migliorato**
- Copia rapida dati bancari
- Causale personalizzata automatica
- Stato "pending" fino a conferma admin

---

## 📦 FILE DA PUSHARE SU GITHUB

### **File Principali Modificati**

#### 1. **App.tsx** ⭐ CRITICO
**Path**: `/App.tsx`  
**Modifiche**:
- Aggiunta logica `checkRoleAccess()` per restrizioni piano Basic (righe 447-501)
- Controllo `allowedDepartment` dal profilo utente
- Dialog di conferma per selezione reparto unico
- Toast di errore per accesso non autorizzato

#### 2. **types.ts** ⭐ CRITICO
**Path**: `/types.ts`  
**Modifiche**:
- Aggiunto campo `allowedDepartment` in `RestaurantProfile` (riga 93)
- Tipo: `'kitchen' | 'pizzeria' | 'pub' | 'delivery'`
- Usato per salvare la scelta permanente del piano Basic

#### 3. **SubscriptionManager.tsx** ⭐ CRITICO
**Path**: `/components/SubscriptionManager.tsx`  
**Modifiche**:
- Integrazione completa Stripe Checkout (righe 198-224)
- Integrazione PayPal con QR Code (righe 226-250, 558-635)
- Miglioramento UI bonifico bancario (righe 638-717)
- Toggle mensile/annuale con sconto -17%
- Gestione stati: plans → payment → bonifico/paypal/stripe → success

---

### **File Servizi Nuovi**

#### 4. **stripeConfig.ts** ⭐ NUOVO
**Path**: `/services/stripeConfig.ts`  
**Contenuto**:
```typescript
- Publishable Key Stripe (pk_live_...)
- Price IDs per Basic/Pro Mensile/Annuale
- Helper functions: getPriceId(), getPlanPrice()
```

#### 5. **stripeService.ts** ⭐ NUOVO
**Path**: `/services/stripeService.ts`  
**Contenuto**:
```typescript
- getStripe(): Inizializza Stripe
- simpleCheckout(): Redirect a Stripe Checkout
- redirectToCheckout(): Gestione sessioni
- verifySubscription(): Verifica post-pagamento
```

---

### **File Configurazione**

#### 6. **package.json** ⭐ CRITICO
**Path**: `/package.json`  
**Modifiche**:
- Aggiunto `@stripe/stripe-js: ^8.6.0`
- Aggiunto `@stripe/react-stripe-js: ^5.4.1`
- Aggiunto `@paypal/react-paypal-js: ^8.9.2`
- Versione aggiornata a `1.0.1`

#### 7. **vite.config.ts**
**Path**: `/vite.config.ts`  
**Verifica**: Nessuna modifica necessaria (già configurato correttamente)

---

### **File Supporto (Opzionali ma Consigliati)**

#### 8. **DEPLOY_GUIDE.md**
**Path**: `/DEPLOY_GUIDE.md`  
**Contenuto**: Istruzioni deploy Vercel

#### 9. **README.md**
**Path**: `/README.md`  
**Aggiornare con**: Nuove funzionalità piani e pagamenti

---

## 🚀 COMANDI PER PUSH GITHUB

```bash
# 1. Naviga nella directory del progetto
cd "c:\Users\Max\Downloads\ristosync-ai 4"

# 2. Verifica stato Git
git status

# 3. Aggiungi TUTTI i file modificati
git add App.tsx
git add types.ts
git add components/SubscriptionManager.tsx
git add services/stripeConfig.ts
git add services/stripeService.ts
git add package.json
git add package-lock.json

# 4. Commit con messaggio descrittivo
git commit -m "feat: Piano Basic con restrizioni + Stripe/PayPal integration

- Implementato piano Basic con scelta reparto unico permanente
- Integrato Stripe Checkout per pagamenti carta
- Integrato PayPal con QR Code
- Migliorato flusso bonifico bancario
- Aggiunto toggle mensile/annuale con sconto -17%
- Versione 1.0.1"

# 5. Push su GitHub
git push origin main
```

---

## 🔧 CONFIGURAZIONE VERCEL

### Variabili d'Ambiente da Impostare

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

### Build Settings
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

## ✅ CHECKLIST PRE-DEPLOY

- [ ] Tutti i file modificati sono stati aggiunti a Git
- [ ] Package.json include le dipendenze Stripe e PayPal
- [ ] stripeConfig.ts contiene la Publishable Key corretta
- [ ] SubscriptionManager.tsx importa correttamente i servizi Stripe
- [ ] types.ts include il campo `allowedDepartment`
- [ ] App.tsx ha la logica `checkRoleAccess()` completa
- [ ] Commit effettuato con messaggio descrittivo
- [ ] Push su GitHub completato
- [ ] Vercel rileva automaticamente il nuovo commit
- [ ] Build Vercel completata con successo
- [ ] Test funzionalità su produzione

---

## 🧪 TEST POST-DEPLOY

### 1. Test Piano Basic
1. Login con account test
2. Vai in Admin → Profilo
3. Imposta `planType: "Basic"`
4. Esci e riprova ad accedere ai reparti
5. Verifica che venga chiesto di scegliere UN reparto
6. Conferma la scelta
7. Verifica che altri reparti siano bloccati

### 2. Test Stripe
1. Vai in Gestione Abbonamento
2. Seleziona piano Basic o Pro
3. Scegli "Carta di Credito"
4. Verifica redirect a Stripe Checkout
5. Usa carta test: `4242 4242 4242 4242`
6. Completa il pagamento
7. Verifica redirect e attivazione

### 3. Test PayPal
1. Seleziona piano
2. Scegli "PayPal"
3. Verifica visualizzazione email e QR Code
4. Copia dati PayPal
5. Conferma pagamento
6. Verifica stato "pending"

### 4. Test Bonifico
1. Seleziona piano
2. Scegli "Bonifico Bancario"
3. Verifica visualizzazione IBAN
4. Copia tutti i dati
5. Conferma bonifico
6. Verifica stato "pending"

---

## 📞 SUPPORTO

**Email**: castro.massimo@yahoo.com  
**WhatsApp**: +39 347 812 7440  
**GitHub**: https://github.com/your-repo/ristosync-ai

---

## 📝 NOTE IMPORTANTI

### Sicurezza Stripe
- ⚠️ **MAI** includere la Secret Key nel frontend
- ✅ Solo la Publishable Key (`pk_live_...`) è sicura per il frontend
- 🔒 Per funzionalità avanzate, creare Supabase Edge Functions

### PayPal
- Il QR Code deve essere caricato manualmente in `/public/paypal-qr.jpg`
- L'email PayPal è: `castro.massimo@gmail.com`

### Bonifico
- IBAN: `IT73W0623074792000057589384`
- Intestatario: `Massimo Castro`
- Banca: `Cariparma Credit Agricole`

---

**Fine Documento** 🎉
