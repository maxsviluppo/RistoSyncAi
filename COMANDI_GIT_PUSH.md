# 🚀 COMANDI GIT PER PUSH SU GITHUB

**Data**: 29 Dicembre 2024  
**Versione**: 1.0.1  
**Branch**: main

---

## 📋 LISTA FILE DA PUSHARE

### File Core Modificati (7 file)
1. ✅ `App.tsx`
2. ✅ `types.ts`
3. ✅ `package.json`
4. ✅ `package-lock.json`
5. ✅ `components/SubscriptionManager.tsx`
6. ✅ `services/stripeConfig.ts` (NUOVO)
7. ✅ `services/stripeService.ts` (NUOVO)

### File Documentazione (3 file)
8. ✅ `FILE_MODIFICATI_DEPLOY.md` (NUOVO)
9. ✅ `BACKUP_INFO_2025-12-29.md` (NUOVO)
10. ✅ `COMANDI_GIT_PUSH.md` (questo file)

---

## 🔧 COMANDI DA ESEGUIRE

### 1️⃣ Verifica Status Git
```bash
cd "c:\Users\Max\Downloads\ristosync-ai 4"
git status
```

### 2️⃣ Aggiungi File Modificati
```bash
# File Core
git add App.tsx
git add types.ts
git add package.json
git add package-lock.json

# Componenti
git add components/SubscriptionManager.tsx

# Servizi Nuovi
git add services/stripeConfig.ts
git add services/stripeService.ts

# Documentazione
git add FILE_MODIFICATI_DEPLOY.md
git add BACKUP_INFO_2025-12-29.md
git add COMANDI_GIT_PUSH.md
```

### 3️⃣ Commit con Messaggio Descrittivo
```bash
git commit -m "feat: Piano Basic con restrizioni + Stripe/PayPal integration v1.0.1

✨ Nuove Funzionalità:
- Implementato piano Basic con scelta reparto unico permanente
- Integrato Stripe Checkout per pagamenti carta (Visa, Mastercard, Amex)
- Integrato PayPal con QR Code e conferma manuale
- Migliorato flusso bonifico bancario con copia rapida dati
- Aggiunto toggle mensile/annuale con sconto -17%
- UI premium Subscription Manager con gradients e animazioni

🔧 Modifiche Tecniche:
- Aggiunto campo allowedDepartment in types.ts
- Implementata logica checkRoleAccess() in App.tsx
- Creati servizi stripeConfig.ts e stripeService.ts
- Aggiunte dipendenze @stripe/stripe-js e @paypal/react-paypal-js

📦 File Modificati:
- App.tsx (logica restrizioni Basic)
- types.ts (nuovo campo allowedDepartment)
- SubscriptionManager.tsx (UI completa pagamenti)
- package.json (dipendenze Stripe/PayPal)
- services/stripeConfig.ts (NUOVO)
- services/stripeService.ts (NUOVO)

📚 Documentazione:
- FILE_MODIFICATI_DEPLOY.md (guida deploy completa)
- BACKUP_INFO_2025-12-29.md (info backup)

🧪 Testato:
- ✅ Restrizioni piano Basic
- ✅ Stripe Checkout redirect
- ✅ PayPal con QR Code
- ✅ Bonifico con copia dati

Versione: 1.0.1
Data: 29/12/2024"
```

### 4️⃣ Push su GitHub
```bash
git push origin main
```

---

## ✅ VERIFICA POST-PUSH

### Controlla su GitHub
1. Vai su: https://github.com/YOUR-USERNAME/ristosync-ai
2. Verifica che tutti i file siano stati pushati
3. Controlla il commit message
4. Verifica la data dell'ultimo commit

### Verifica Vercel (se collegato)
1. Vai su: https://vercel.com/dashboard
2. Verifica che il deploy sia partito automaticamente
3. Controlla i log di build
4. Testa l'app in produzione

---

## 🔄 COMANDI ALTERNATIVI

### Push Tutti i File in Una Volta
```bash
cd "c:\Users\Max\Downloads\ristosync-ai 4"
git add .
git commit -m "feat: Piano Basic + Stripe/PayPal v1.0.1"
git push origin main
```

### Verifica Differenze Prima del Commit
```bash
git diff App.tsx
git diff types.ts
git diff components/SubscriptionManager.tsx
```

### Annulla Ultimo Commit (se necessario)
```bash
# ATTENZIONE: Usa solo se hai fatto un errore!
git reset --soft HEAD~1
```

---

## 📊 CHECKLIST PRE-PUSH

- [ ] Backup completato ✅
- [ ] Tutti i file modificati identificati ✅
- [ ] Documentazione creata ✅
- [ ] Test locali eseguiti
- [ ] Git status verificato
- [ ] File aggiunti a staging
- [ ] Commit message preparato
- [ ] Push eseguito
- [ ] Verifica su GitHub
- [ ] Deploy Vercel verificato

---

## 🆘 TROUBLESHOOTING

### Errore: "fatal: not a git repository"
```bash
# Inizializza Git
cd "c:\Users\Max\Downloads\ristosync-ai 4"
git init
git remote add origin https://github.com/YOUR-USERNAME/ristosync-ai.git
```

### Errore: "Updates were rejected"
```bash
# Pull prima di pushare
git pull origin main --rebase
git push origin main
```

### Errore: "Authentication failed"
```bash
# Usa Personal Access Token
# Vai su GitHub → Settings → Developer Settings → Personal Access Tokens
# Genera nuovo token e usalo come password
```

---

## 📞 SUPPORTO

**Email**: castro.massimo@yahoo.com  
**WhatsApp**: +39 347 812 7440

---

**Pronto per il push! 🚀**
