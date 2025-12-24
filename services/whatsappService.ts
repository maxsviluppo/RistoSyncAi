/**
 * WhatsApp Business Cloud API Service
 * Official Meta API integration for sending WhatsApp messages
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
    return sendWhatsAppMessage(config, {
        to,
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
    return sendWhatsAppMessage(config, {
        to,
        type: 'text',
        text
    });
}

/**
 * Format phone number for WhatsApp API
 * Removes spaces, dashes, and ensures country code
 */
export function formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If it starts with 0, assume it's Italian and add +39
    if (cleaned.startsWith('0')) {
        cleaned = '39' + cleaned.substring(1);
    }

    // If it doesn't start with country code, assume Italian
    if (!cleaned.startsWith('39') && cleaned.length === 10) {
        cleaned = '39' + cleaned;
    }

    return cleaned;
}
