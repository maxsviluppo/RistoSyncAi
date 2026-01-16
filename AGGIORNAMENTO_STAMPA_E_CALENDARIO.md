# Aggiornamento: Stampa Estratto Conto e Calendario Business Intelligence

## Modifiche Apportate

### 1. Stampa Estratto Conto (Amministrazione)
- Aggiunto pulsante **"Stampa A4"** nella sezione *Estratto Conto* (AnalyticsDashboard).
- Implementato foglio di stile specifico per la stampa (`@media print`):
  - Nasconde l'interfaccia utente (sidebar, menu, bottoni) lasciando solo l'estratto conto.
  - Imposta il formato pagina su **A4** con margini corretti.
  - Ripristina uno stile "pulito" (sfondo bianco, testo nero) per risparmiare inchiostro e garantire leggibilità.
- Aggiunto **Frontespizio** (intestazione) visibile solo in stampa:
  - Nome del Ristorante, Indirizzo, P.IVA, Telefono (dati presi dalle Impostazioni).
  - Titolo "ESTRATTO CONTO".
  - Data di stampa e Periodo di riferimento selezionato.

### 2. Calendario Stile App (Business Intelligence)
- Aggiornato il selettore date "Custom" nella dashboard statistiche.
- Sostituiti i campi input standard con **badge interattivi** ("Dal..." - "Al...").
- Implementata la logica **"Native Overlay"**:
  - Cliccando sul badge si apre il calendario nativo del dispositivo (stile app mobile).
  - Migliore esperienza utente e selezione più rapida.

## File Modificati
- `components/AnalyticsDashboard.tsx`
