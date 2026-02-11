import Order from '@/models/Order';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'debug_orders.log');

function logDebug(message, data = null) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logLine);
    } catch (e) {
        console.error('Error writing to log file:', e);
    }
}

/**
 * Crea una orden basada en un objeto de pago de MercadoPago.
 * @param {Object} paymentInfo - Objeto de pago obtenido de la API de MP
 * @returns {Promise<Order>} La orden creada
 */
export async function createOrderFromPayment(paymentInfo) {
    logDebug('Iniciando createOrderFromPayment', { paymentId: paymentInfo?.id, status: paymentInfo?.status });

    try {
        // 1. Evitar duplicados (Check de seguridad extra)
        const existingOrder = await Order.findOne({ mercadoPagoId: paymentInfo.id.toString() });
        if (existingOrder) {
            logDebug('Orden ya existe', existingOrder.orderNumber);
            return existingOrder;
        }

        // 2. Extraer y parsear metadata
        const meta = paymentInfo.metadata || {};
        logDebug('Metadata recibida', meta);

        // Manejo robusto de customerData e items que pueden venir como strings o objetos
        const customerDataRaw = meta.customer_data || meta.customerData;
        const itemsRaw = meta.items;
        const locationId = meta.location_id || meta.locationId;
        const total = meta.total || paymentInfo.transaction_amount;

        if (!customerDataRaw || !itemsRaw) {
            logDebug('Metadata incompleta', { customerDataRaw, itemsRaw });
            throw new Error('Metadata incompleta en el pago de MP');
        }

        const customerData = typeof customerDataRaw === 'string' ? JSON.parse(customerDataRaw) : customerDataRaw;
        const items = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : itemsRaw;

        logDebug('Datos parseados', { customerData, itemsCount: items.length });

        // 3. Generar Order Number
        const orderCount = await Order.countDocuments();
        const timestamp = Date.now().toString(36).toUpperCase();
        const orderNumber = `ORD-${String(orderCount + 1).padStart(4, '0')}-${timestamp.slice(-4)}`;

        // 4. Sanitizar notas
        const MAX_NOTES_LENGTH = 500;
        const sanitizedNotes = (customerData.notes || '')
            .toString()
            .trim()
            .substring(0, MAX_NOTES_LENGTH);

        // 5. Crear la orden
        const newOrder = new Order({
            orderNumber,
            customer: {
                name: customerData.name,
                lastname: customerData.lastname || '',
                phone: customerData.phone,
                email: customerData.email || ''
            },
            items: items.map(item => ({
                itemId: item.itemId,
                name: item.name,
                quantity: item.quantity,
                price: item.unitPrice, // Schema expects 'price'
                customizations: (item.customizations || []).map(c => ({
                    groupName: c.group || c.groupName || '',
                    selected: c.option || c.selected || ''
                })),
                origin: item.origin || 'organic',
                ...(item.upsellId && { upsellId: item.upsellId }),
            })),
            location: {
                locationId: locationId || 'unknown',
                locationName: locationId || 'unknown'
            },
            deliveryMethod: customerData.deliveryMethod || 'Retiro en Sucursal',
            deliveryAddress: customerData.deliveryAddress || '',
            paymentMethod: 'Mercado Pago',
            paymentStatus: paymentInfo.status === 'approved' ? 'approved' : 'pending',
            mercadoPagoId: paymentInfo.id.toString(),
            status: 'pending', // Pending de "Preparación"
            subtotal: total,
            total,
            notes: sanitizedNotes
        });

        await newOrder.save();
        logDebug(`✅ Orden creada exitosamente: ${orderNumber}`);
        console.log(`[ORDER SERVICE] ✅ Orden creada desde pago MP: ${orderNumber}`);

        return newOrder;
    } catch (error) {
        logDebug('❌ Error en createOrderFromPayment', error.message);
        throw error;
    }
}
