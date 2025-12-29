// Email Service for RistoSync
// Sends confirmation emails using Resend API

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const FROM_EMAIL = 'RistoSync <noreply@ristosyncai.it>';
const ADMIN_EMAIL = 'info@ristosyncai.it';

interface EmailParams {
    to: string;
    subject: string;
    html: string;
}

// Send email using Resend API
const sendEmail = async ({ to, subject, html }: EmailParams): Promise<boolean> => {
    try {
        if (!RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not configured. Email not sent.');
            return false;
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [to],
                subject: subject,
                html: html,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Email send failed:', error);
            return false;
        }

        const data = await response.json();
        console.log('Email sent successfully:', data.id);
        return true;

    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

// Send payment confirmation email to customer
export const sendPaymentConfirmationEmail = async (
    customerEmail: string,
    customerName: string,
    planType: string,
    price: string,
    endDate: string,
    sessionId?: string
): Promise<boolean> => {
    const formattedEndDate = new Date(endDate).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const subject = `✅ Conferma Pagamento - Piano ${planType} Attivato`;

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conferma Pagamento RistoSync</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">
                                🎉 Pagamento Completato!
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Ciao <strong>${customerName || 'Cliente'}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Il tuo pagamento è stato completato con successo! Il tuo piano <strong>${planType}</strong> è ora attivo.
                            </p>

                            <!-- Details Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; border: 2px solid #e5e7eb; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 700;">
                                            📋 Dettagli Abbonamento
                                        </h2>
                                        
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Piano:</td>
                                                <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${planType}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Importo:</td>
                                                <td style="color: #10b981; font-size: 18px; font-weight: 800; text-align: right;">${price}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Valido fino al:</td>
                                                <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${formattedEndDate}</td>
                                            </tr>
                                            ${sessionId ? `
                                            <tr>
                                                <td style="color: #6b7280; font-size: 12px; font-weight: 600;">ID Transazione:</td>
                                                <td style="color: #6b7280; font-size: 11px; font-family: monospace; text-align: right;">${sessionId}</td>
                                            </tr>
                                            ` : ''}
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://ristosync.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                                            🚀 Accedi a RistoSync
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Puoi iniziare subito ad utilizzare tutte le funzionalità del tuo piano!
                            </p>

                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Se hai domande o hai bisogno di assistenza, non esitare a contattarci.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 700;">
                                Grazie per aver scelto RistoSync! 🙏
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px;">
                                Il Team RistoSync
                            </p>

                            <div style="margin: 20px 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
                                    📧 <a href="mailto:info@ristosyncai.it" style="color: #667eea; text-decoration: none;">info@ristosyncai.it</a>
                                </p>
                                <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
                                    📱 <a href="tel:+393478127440" style="color: #667eea; text-decoration: none;">+39 347 812 7440</a>
                                </p>
                                <p style="margin: 0; color: #6b7280; font-size: 13px;">
                                    🌐 <a href="https://ristosync.vercel.app" style="color: #667eea; text-decoration: none;">ristosync.vercel.app</a>
                                </p>
                            </div>

                            <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
                                Questa è una email automatica di conferma pagamento.<br>
                                Per qualsiasi problema, contatta il nostro supporto.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    return await sendEmail({
        to: customerEmail,
        subject,
        html,
    });
};

// Send payment notification to admin
export const sendAdminPaymentNotification = async (
    customerEmail: string,
    customerName: string,
    planType: string,
    price: string,
    sessionId?: string
): Promise<boolean> => {
    const subject = `💰 Nuovo Pagamento Ricevuto - ${planType}`;

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuovo Pagamento</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">
                                💰 Nuovo Pagamento Ricevuto
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 30px;">
                            <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; border: 2px solid #e5e7eb;">
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Cliente:</td>
                                    <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${customerName || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Email:</td>
                                    <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${customerEmail}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Piano:</td>
                                    <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${planType}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Importo:</td>
                                    <td style="color: #10b981; font-size: 20px; font-weight: 800; text-align: right;">${price}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Data:</td>
                                    <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right;">${new Date().toLocaleString('it-IT')}</td>
                                </tr>
                                ${sessionId ? `
                                <tr>
                                    <td style="color: #6b7280; font-size: 12px; font-weight: 600;">Session ID:</td>
                                    <td style="color: #6b7280; font-size: 11px; font-family: monospace; text-align: right;">${sessionId}</td>
                                </tr>
                                ` : ''}
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://dashboard.stripe.com/payments" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px;">
                                            📊 Vedi su Stripe Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">
                                Email automatica da RistoSync
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    return await sendEmail({
        to: ADMIN_EMAIL,
        subject,
        html,
    });
};

export default {
    sendPaymentConfirmationEmail,
    sendAdminPaymentNotification,
};
