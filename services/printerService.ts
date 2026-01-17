import { Order, OrderStatus, OrderItem, AppSettings, Printer, Department, Category } from '../types';

// --- ESC/POS COMMANDS HELPERS (BINARY PROTOCOL) ---
const ESC = '\x1b';
const GS = '\x1d';
const CMD = {
    INIT: ESC + '@',
    BOLD_ON: ESC + 'E\x01',
    BOLD_OFF: ESC + 'E\x00',
    CENTER: ESC + 'a\x01',
    LEFT: ESC + 'a\x00',
    FONT_BIG: ESC + '!\x30', // Double height and width
    FONT_NORMAL: ESC + '!\x00',
    CUT: GS + 'V\x42\x00',
    FEED_3: ESC + 'd\x03'
};

// Internal helper to avoid circular dependency with storageService
const getSettingsInternal = (): AppSettings | null => {
    try {
        const stored = localStorage.getItem('ristosync_app_settings');
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error("Error reading settings in printerService", e); }
    return null;
};

// Fallback to Window Print if no network printer is configured
export const triggerBrowserPrint = (htmlContent: string) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    }
};

const generateReceiptHTML = (order: Order, department: Department, settings: AppSettings): string => {
    const profile = settings.restaurantProfile || {};
    const relevantItems = order.items.filter(item => {
        const itemDept = settings.categoryDestinations ? settings.categoryDestinations[item.menuItem.category] : 'Cucina';
        return itemDept === department;
    });

    if (relevantItems.length === 0) return '';

    return `
        <html>
        <head>
            <style>
                body { font-family: 'Courier New', monospace; width: 300px; font-size: 14px; margin: 0; padding: 10px; }
                .header { text-align: center; font-weight: bold; margin-bottom: 5px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
                .item { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold; }
                .meta { font-size: 11px; margin-bottom: 5px; text-align: center; color: #333; }
                .notes { font-size: 12px; margin-left: 10px; font-style: italic; margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <div class="header">${profile.name || 'RISTOSYNC AI'}<br>REPARTO: ${department.toUpperCase()}</div>
            <div class="meta">Tavolo: ${order.tableNumber} | ${new Date(order.timestamp).toLocaleTimeString()}</div>
            ${relevantItems.map(item => `
                <div class="item"><span>${item.quantity}x ${item.menuItem.name}</span></div>
                ${item.notes ? `<div class="notes">* ${item.notes}</div>` : ''}
            `).join('')}
            <div style="border-top:1px dashed #000; margin-top:10px; padding-top:5px; text-align:center; font-size:10px;">
                RISTOSYNC AI - SMART PRINT SYSTEM
            </div>
        </body>
        </html>
    `;
};

const generateESCPOSPayload = (order: Order, department: Department, settings: AppSettings): Uint8Array => {
    const profile = settings.restaurantProfile || {};
    const relevantItems = order.items.filter(item => {
        const dest = settings.categoryDestinations ? settings.categoryDestinations[item.menuItem.category] : 'Cucina';
        return dest === department;
    });

    if (relevantItems.length === 0) return new Uint8Array();

    let text = CMD.INIT;
    text += CMD.CENTER + CMD.BOLD_ON + CMD.FONT_BIG + (profile.name || 'RISTOSYNC') + '\n';
    text += CMD.FONT_NORMAL + '--------------------------------\n';
    text += 'REPARTO: ' + department.toUpperCase() + '\n';
    text += 'Tavolo: ' + order.tableNumber + ' | ' + new Date(order.timestamp).toLocaleTimeString() + '\n';
    text += '--------------------------------\n' + CMD.LEFT;

    relevantItems.forEach(item => {
        text += CMD.BOLD_ON + item.quantity + 'x ' + item.menuItem.name + CMD.BOLD_OFF + '\n';
        if (item.notes) text += '  * ' + item.notes + '\n';
    });

    text += '\n--------------------------------\n';
    text += CMD.CENTER + '--- FINE COMANDA ---\n' + CMD.FEED_3 + CMD.CUT;

    return new TextEncoder().encode(text);
};

const sendToNetworkPrinter = async (printer: Printer, order: Order, department: Department, settings: AppSettings) => {
    try {
        const payload = generateESCPOSPayload(order, department, settings);
        if (payload.length === 0) return false;

        console.log("[PRINT] Sending ESC/POS to " + printer.name + " @ " + printer.address);

        const targetUrl = printer.address?.startsWith('http') ? printer.address : "http://" + printer.address + "/print";

        await fetch(targetUrl, {
            method: 'POST',
            body: payload as any,
            mode: 'no-cors'
        });

        return true;
    } catch (e) {
        console.error("Print Error:", e);
        return false;
    }
};

export const printOrderTicket = async (order: Order, department: Department, settings?: AppSettings): Promise<boolean> => {
    const activeSettings = settings || getSettingsInternal();
    if (!activeSettings) return false;

    if (!activeSettings.printEnabled[department]) return false;

    const printerId = activeSettings.printerAssignments[department];
    if (!printerId) return false;

    const printer = activeSettings.printers.find(p => p.id === printerId);
    if (!printer) return false;

    if (printer.type === 'network') {
        return await sendToNetworkPrinter(printer, order, department, activeSettings);
    } else {
        const html = generateReceiptHTML(order, department, activeSettings);
        if (html) triggerBrowserPrint(html);
        return true;
    }
};

export const printOrderToAllDepartments = async (order: Order, settings?: AppSettings) => {
    const departments: Department[] = ['Cucina', 'Pizzeria', 'Pub', 'Sala', 'Cassa'];
    const activeSettings = settings || getSettingsInternal();

    for (const dept of departments) {
        await printOrderTicket(order, dept, activeSettings || undefined);
    }
};
