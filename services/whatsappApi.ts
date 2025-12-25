/**
 * WhatsApp Business Cloud API Service
 * Official Meta API integration for sending WhatsApp messages
 * (Fixed import path case sensitivity)
 */

export interface WhatsAppConfig {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId?: string;
    apiVersion?: string;
}

export interface WhatsAppMessage {
    to: string; // Phone number with country code (e.g., "393478127440")
    type: 'text' | 'template';
    text?: string; // For text messages
    template?: {
        name: string;
        language: { code: string };
        components?: any[];
    };
}

export interface WhatsAppResponse {
    success: boolean;
    messageId?: string;
    error?: string;
    details?: any;
}

/**
 * Send a WhatsApp message using Meta Cloud API
 */
export async function sendWhatsAppMessage(
    config: WhatsAppConfig,
    message: WhatsAppMessage
): Promise<WhatsAppResponse> {
    const apiVersion = config.apiVersion || 'v22.0';
    const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`;

    try {
        const body: any = {
            messaging_product: 'whatsapp',
            to: message.to,
            type: message.type
        };

        if (message.type === 'text' && message.text) {
            body.text = { body: message.text };
        } else if (message.type === 'template' && message.template) {
            body.template = message.template;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            // Gestione specifica errori comuni
            if (data.error?.code === 131026 || data.error?.code === 131030) {
                return {
                    success: false,
                    error: 'Numero non abilitato (Modalità Test). Aggiungi questo numero alla "Phone Number List" nella Meta Dashboard o passa in Produzione.',
                    details: data
                };
            }
            if (data.error?.code === 190) {
                return {
                    success: false,
                    error: 'Token scaduto o non valido. Aggiorna il token nelle impostazioni.',
                    details: data
                };
            }

            return {
                success: false,
                error: data.error?.message || 'Failed to send message',
                details: data
            };
        }

        return {
            success: true,
            messageId: data.messages?.[0]?.id,
            details: data
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Network error',
            details: error
        };
    }
}

/**
 * Send a template message (pre-approved by Meta)
 * Template "hello_world" is available by default for testing
 */
export async function sendTemplateMessage(
    config: WhatsAppConfig,
    to: string,
    templateName: string = 'hello_world',
    languageCode: string = 'en_US'
): Promise<WhatsAppResponse> {
    const formattedTo = formatPhoneNumber(to);
    return sendWhatsAppMessage(config, {
        to: formattedTo,
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode }
        }
    });
}

/**
 * Send a simple text message
 * Note: Can only send text messages to users who have messaged you first
 * or within 24 hours of their last message
 */
export async function sendTextMessage(
    config: WhatsAppConfig,
    to: string,
    text: string
): Promise<WhatsAppResponse> {
    const formattedTo = formatPhoneNumber(to);
    return sendWhatsAppMessage(config, {
        to: formattedTo,
        type: 'text',
        text
    });
}

/**
 * Format phone number for WhatsApp API
 * Removes spaces, dashes, and automatically adds +39 for Italy if missing
 */
export function formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading 00 (international format)
    if (cleaned.startsWith('00')) {
        cleaned = cleaned.substring(2);
    }

    // Caso: Numero fisso/mobile che inizia con 0 (es. 06..., 02...) -> sostituisci con 39
    if (cleaned.startsWith('0')) {
        return '39' + cleaned.substring(1);
    }

    // Se inizia già con 39 ed è abbastanza lungo (> 10 cifre), assumiamo sia ok
    if (cleaned.startsWith('39') && cleaned.length > 10) {
        return cleaned;
    }

    // Se NON inizia con 39, assumiamo sia un numero italiano (mobile o fisso) e aggiungiamo il prefisso
    // Es. 3471234567 (10 cifre) -> 393471234567
    if (!cleaned.startsWith('39')) {
        return '39' + cleaned;
    }

    return cleaned;
}
