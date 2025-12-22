
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MenuItem } from "../types";
import { getGoogleApiKey } from "./storageService";

export const askChefAI = async (query: string, currentItem: MenuItem | null): Promise<string> => {
    try {
        const apiKey = getGoogleApiKey() || process.env.API_KEY;
        if (!apiKey) {
            return "⚠️ Configurazione AI mancante. Vai nelle Impostazioni > AI Intelligence e inserisci la tua Google API Key.";
        }

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const context = currentItem
            ? `Il cliente sta chiedendo informazioni sul piatto: "${currentItem.name}". Ingredienti: ${currentItem.ingredients || 'Non specificati'}. Descrizione: ${currentItem.description || 'Nessuna'}. Allergeni: ${currentItem.allergens?.join(', ') || 'Nessuno'}.`
            : 'Il cliente sta facendo una domanda generale sul menu.';

        const prompt = `
      Sei un assistente chef esperto e cortese in un ristorante italiano.
      Contesto: ${context}
      Domanda del cliente: "${query}"
      
      Rispondi in modo conciso (max 2 frasi), professionale e invitante. 
      Se chiedono allergeni e non sei sicuro, consiglia di chiedere allo chef.
    `;

        const result = await model.generateContent(prompt);
        const response = result.response;

        return response.text() || "Non riesco a rispondere al momento.";
    } catch (error: any) {
        console.error("Gemini Error:", error);

        // Gestione dettagliata degli errori
        if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('invalid')) {
            return "❌ API Key non valida. Verifica di aver inserito la chiave corretta nelle Impostazioni > AI Intelligence.";
        }

        if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota')) {
            return "⏳ Quota giornaliera esaurita. Le API gratuite hanno limiti di utilizzo. Riprova domani o passa a un piano a pagamento.";
        }

        if (error?.message?.includes('PERMISSION_DENIED')) {
            return "🔒 Permesso negato. Assicurati che l'API key abbia i permessi corretti per Gemini AI.";
        }

        if (error?.message?.includes('not found') || error?.message?.includes('not available') || error?.message?.includes('does not exist')) {
            return "🚫 Modello AI non disponibile. Il modello potrebbe non essere accessibile con il tuo account. Verifica su Google AI Studio.";
        }

        if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
            return "🌐 Errore di connessione. Controlla la tua connessione internet e riprova.";
        }

        // Errore generico con dettagli
        return `❌ Errore AI: ${error?.message || 'Sconosciuto'}. Verifica la chiave API nelle impostazioni.`;
    }
};

export const generateRestaurantAnalysis = async (stats: any, date: string): Promise<string> => {
    try {
        const apiKey = getGoogleApiKey() || process.env.API_KEY;
        if (!apiKey) return "⚠️ Chiave API mancante.";

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            Sei un Consulente Ristorazione esperto. Analizza i dati del ${date}:
            
            📊 PERFORMANCE:
            - Incasso Totale: € ${(stats.totalRevenue || 0).toFixed(2)}
            - Numero Tavoli/Ordini: ${stats.totalOrders || 0}
            - Valore Medio Ordine: € ${(stats.avgOrderValue || 0).toFixed(2)}
            - Piatti Serviti: ${stats.totalItems || 0}
            - Food Cost Stimato: € ${(stats.foodCost || 0).toFixed(2)} (32%)
            - Tempo Medio Attesa: ${stats.avgWait || 0} minuti
            
            🏆 TOP PIATTI (più venduti): ${stats.topDishes?.length > 0 ? stats.topDishes.join(', ') : 'Nessun dato'}
            
            ⚠️ PIATTI MENO RICHIESTI: ${stats.bottomDishes?.length > 0 ? stats.bottomDishes.join(', ') : 'Nessun dato'}

            Fornisci un report DETTAGLIATO (max 150 parole) con:
            1. 📈 Valutazione performance complessiva
            2. 🏆 Analisi dei piatti top e come sfruttarli meglio
            3. ⚠️ Suggerimenti per i piatti meno venduti (promozioni, modifica ricetta, rimozione dal menu?)
            4. ⏱️ Valutazione tempo di attesa (ottimo <15min, buono <20min, da migliorare >20min)
            5. 💡 Un consiglio strategico per domani
            
            Usa emoji per rendere il report leggibile e coinvolgente.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;

        return response.text() || "Analisi non disponibile.";

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "Errore analisi AI.";
    }
};

export const generateDishIngredients = async (dishName: string): Promise<string> => {
    try {
        const apiKey = getGoogleApiKey() || process.env.API_KEY;
        if (!apiKey) return "";

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            Sei uno Chef. 
            Elenca SOLO gli ingredienti principali per il piatto "${dishName}", separati da virgola.
            Non scrivere nient'altro. Solo elenco ingredienti.
            Esempio: Pasta, Uova, Guanciale, Pecorino, Pepe.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;

        return response.text() ? response.text().replace(/\n/g, " ").trim() : "";
    } catch (error) {
        console.error("Ingredients Gen Error:", error);
        return "";
    }
};

export const generateDishDescription = async (dishName: string, ingredients: string): Promise<string> => {
    try {
        const apiKey = getGoogleApiKey() || process.env.API_KEY;
        if (!apiKey) return "";

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            Sei uno Chef stellato che scrive il menu.
            Scrivi una descrizione breve (max 20 parole), invitante e poetica per il piatto: "${dishName}".
            Considera questi ingredienti: ${ingredients}.
            Non elencare di nuovo gli ingredienti, descrivi l'esperienza di gusto.
            Tono elegante. Niente virgolette.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;

        return response.text() || "";
    } catch (error) {
        console.error("Description Gen Error:", error);
        return "";
    }
};

export const generateRestaurantDescription = async (restaurantName: string): Promise<string> => {
    try {
        const apiKey = getGoogleApiKey() || process.env.API_KEY;
        if (!apiKey) return "";

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            Sei un esperto copywriter per la ristorazione.
            Scrivi una "Bio" (descrizione breve) accattivante ed elegante per il ristorante chiamato "${restaurantName}".
            Massimo 30 parole.
            Usa un tono invitante che faccia venire fame.
            Usa 1 o 2 emoji appropriate.
            Non usare virgolette.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;

        return response.text() || "";
    } catch (error) {
        console.error("Restaurant Bio Gen Error:", error);
        return "";
    }
};

export interface ExtractedMenuItem {
    name: string;
    price: number;
    description?: string;
    category: string;
    ingredients?: string;
}

export const extractMenuFromImage = async (imageBase64: string): Promise<ExtractedMenuItem[]> => {
    try {
        const apiKey = getGoogleApiKey() || process.env.API_KEY;
        if (!apiKey) {
            console.error("API Key mancante");
            return [];
        }

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            Sei un esperto di OCR e menu di ristoranti.
            Analizza questa foto di un menu e estrai TUTTI i piatti che riesci a leggere.
            
            Per ogni piatto estrai:
            - name: nome del piatto
            - price: prezzo in numero (solo il numero, senza simbolo €)
            - description: descrizione se presente (altrimenti stringa vuota)
            - category: categoria tra queste ESATTE: "Antipasti", "Panini", "Pizze", "Primi", "Secondi", "Dolci", "Bevande", "Menu Completo"
            - ingredients: ingredienti se elencati (altrimenti stringa vuota)
            
            IMPORTANTE: Rispondi SOLO con un array JSON valido, senza markdown, senza backtick, senza spiegazioni.
            Esempio formato risposta:
            [{"name":"Spaghetti Carbonara","price":12,"description":"","category":"Primi","ingredients":"Pasta, Uova, Guanciale"},{"name":"Tiramisu","price":6,"description":"Classico dolce italiano","category":"Dolci","ingredients":""}]
            
            Se non riesci a leggere nulla o l'immagine non è un menu, rispondi con: []
        `;

        // Rimuovi il prefisso data:image se presente
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            }
        ]);
        const response = result.response;

        const responseText = response.text() || "[]";
        console.log("Gemini Vision Response:", responseText);

        // Pulisci la risposta da eventuali markdown
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanJson);

        // Valida la struttura
        if (!Array.isArray(parsed)) {
            console.error("Risposta non è un array");
            return [];
        }

        return parsed.map((item: any) => ({
            name: item.name || "Piatto senza nome",
            price: parseFloat(item.price) || 0,
            description: item.description || "",
            category: item.category || "Primi",
            ingredients: item.ingredients || ""
        }));

    } catch (error) {
        console.error("Menu Extraction Error:", error);
        return [];
    }
};

export const generateSocialPost = async (topic: string, imageContext?: string): Promise<string> => {
    try {
        const apiKey = getGoogleApiKey() || process.env.API_KEY;
        if (!apiKey) return "";

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            Sei un Social Media Manager esperto per ristoranti.
            Scrivi un post per Facebook/Instagram basato su questo argomento: "${topic}".
            ${imageContext ? `Considera che il post avrà un'immagine che mostra: ${imageContext}` : ''}

            Il post DEVE avere questa struttura esatta:
            1. Un TITOLO ACCATTIVANTE (in maiuscolo, max 5 parole, con emoji)
            2. Un corpo del testo di ALMENO 5 righe, usando un linguaggio persuasivo, emozionale e che faccia venire fame.
            3. Una CALL TO ACTION finale chiara (es. "Prenota ora", "Vieni a trovarci").
            4. Esattamente 10 HASHTAG pertinenti alla fine.

            Usa molte emoji nel testo.
            Tono: Entusiasta, Caldo, Invitante.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;

        return response.text() || "";
    } catch (error) {
        console.error("Social Post Gen Error:", error);
        return "Errore nella generazione del post.";
    }
};

/**
 * Rileva automaticamente gli allergeni dagli ingredienti di un piatto
 * @param ingredients - Stringa con elenco ingredienti separati da virgola
 * @returns Array di allergeni rilevati
 */
export const detectAllergensFromIngredients = async (ingredients: string): Promise<string[]> => {
    try {
        if (!ingredients || ingredients.trim().length === 0) {
            return [];
        }

        const apiKey = getGoogleApiKey() || process.env.API_KEY;
        if (!apiKey) {
            console.warn("API Key mancante per rilevamento allergeni");
            return [];
        }

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            Sei un esperto nutrizionista e allergologo.
            Analizza questa lista di ingredienti e identifica TUTTI gli allergeni presenti.
            
            Ingredienti: "${ingredients}"
            
            Allergeni da considerare (lista completa EU):
            - Glutine (cereali contenenti glutine: grano, segale, orzo, avena, farro, kamut)
            - Lattosio (latte e derivati: formaggi, burro, panna, yogurt, mozzarella, parmigiano, pecorino)
            - Uova (e prodotti a base di uova)
            - Frutta a guscio (mandorle, nocciole, noci, anacardi, pistacchi, noci pecan, noci del Brasile, noci macadamia)
            - Pesce (e prodotti della pesca)
            - Crostacei (gamberi, scampi, aragoste, granchi)
            - Soia (e prodotti a base di soia)
            - Sedano (e prodotti a base di sedano)
            - Senape (e prodotti a base di senape)
            - Sesamo (semi di sesamo e prodotti derivati)
            - Lupini (e prodotti a base di lupini)
            - Molluschi (cozze, vongole, ostriche, calamari, polpo, seppie)
            - Solfiti (anidride solforosa e solfiti in concentrazione superiore a 10 mg/kg)
            - Arachidi (e prodotti a base di arachidi)
            
            IMPORTANTE: Rispondi SOLO con un array JSON di stringhe contenente i nomi degli allergeni rilevati.
            Usa ESATTAMENTE questi nomi: "Glutine", "Lattosio", "Uova", "Frutta a guscio", "Pesce", "Crostacei", "Soia", "Sedano", "Senape", "Sesamo", "Lupini", "Molluschi", "Solfiti", "Arachidi"
            
            Se non ci sono allergeni, rispondi con: []
            
            Esempi:
            - Ingredienti: "Pasta, Pomodoro, Basilico" → ["Glutine"]
            - Ingredienti: "Mozzarella, Pomodoro, Basilico" → ["Lattosio"]
            - Ingredienti: "Uova, Farina, Latte, Burro" → ["Glutine", "Lattosio", "Uova"]
            - Ingredienti: "Gamberi, Aglio, Prezzemolo" → ["Crostacei"]
            - Ingredienti: "Insalata, Pomodoro, Cetrioli" → []
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;

        const responseText = response.text() || "[]";

        // Pulisci la risposta da eventuali markdown
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanJson);

        if (!Array.isArray(parsed)) {
            console.error("Risposta allergeni non è un array");
            return [];
        }

        // Filtra solo allergeni validi
        const validAllergens = [
            "Glutine", "Lattosio", "Uova", "Frutta a guscio", "Pesce",
            "Crostacei", "Soia", "Sedano", "Senape", "Sesamo",
            "Lupini", "Molluschi", "Solfiti", "Arachidi"
        ];

        return parsed.filter((allergen: string) => validAllergens.includes(allergen));

    } catch (error) {
        console.error("Allergen Detection Error:", error);
        return [];
    }
};