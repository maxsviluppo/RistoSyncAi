# Aggiornamento Food Cost Markup Modificabile

Questo aggiornamento permette di modificare il coefficiente "Food Cost" (moltiplicatore prezzo consigliato) direttamente dalla pagina "Magazzino e Food Cost". Il valore viene salvato e sincronizzato.

## File Modificati da Caricare su GitHub

Si prega di caricare i seguenti file per applicare le modifiche:

1. `types.ts` (Aggiunta definizione `foodCostMarkup` nei settings)
2. `services/storageService.ts` (Logica di salvataggio e recupero del markup)
3. `components/InventoryManager.tsx` (Nuovo campo input nella dashboard Magazzino)
4. `App.tsx` (Utilizzo del markup dinamico nel calcolo del prezzo consigliato)

## Istruzioni di Verifica

1. Andare nella pagina **Magazzino & Food Cost**.
2. Notare la nuova card **"Markup Prezzi (x)"**.
3. Modificare il valore (default 3.5).
4. Andare in **Gestione Menu** e aprire (o creare) un piatto con ingredienti collegati.
5. Verificare nella sezione "Scheda Tecnica" che il **"Consigliato (x...)"** rifletta il nuovo valore impostato e che il calcolo sia corretto.
