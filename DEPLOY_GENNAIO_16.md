# Guida al Deploy - Aggiornamento 16 Gennaio 2026
## Oggetto: Backup e Deploy (Business Intelligence Update)

Questo aggiornamento include:
1. **Calendario Nativo**: Migliorato il selettore date nella sezione Business Intelligence (Analytics).
2. **Stampa Estratto Conto**: Aggiunta funzionalità di stampa A4 professionale.
3. **Backup**: Creato un backup zip automatico nella cartella `backups/`.

---

### 1. Verifica Backup
È stato creato automaticamente il file:
`backups/backup_16_gen_2026_native_calendar.zip`

### 2. Comandi per il Deploy su Vercel (via GitHub)
Esegui questi comandi nel terminale per inviare le modifiche online:

```bash
git add .
git commit -m "Update: Calendario nativo in Analytics e Stampa A4"
git push
```

### 3. Verifica Deploy
1. Vai su Vercel Dashboard.
2. Controlla che il nuovo deploy sia partito.
3. Una volta completato (pallino verde), verifica:
   - Apri **Amministrazione -> Business Intelligence**.
   - Seleziona "Custom" nel filtro date.
   - Clicca su "Dal" o "Al" e verifica che si apra il calendario nativo (su mobile o desktop).
   - Vai nel tab **Estratto Conto** e prova il pulsante **Stampa A4**.

---
*Nota: Se riscontri errori durante il push, assicurati di aver scaricato (pull) eventuali modifiche remote prima di caricare.*
