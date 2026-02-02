import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment, MerchantOrder } from 'mercadopago';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { getMPCredentials } from '@/utils/getMPCredentials';

export async function POST(req) {
    try {
        const url = new URL(req.url);
        const queryId = url.searchParams.get('id');
        const queryTopic = url.searchParams.get('topic');

        // Leer body por si es un Webhook (JSON)
        let body = {};
        try {
            body = await req.json();
        } catch (e) {
            // Body vacío o no JSON (es común en IPN legacy)
        }

        const id = queryId || body.data?.id || (body.resource ? body.resource.split('/').pop() : null);
        const topic = queryTopic || body.type || 'unknown';

        console.log('---------------------------------------------------');
        console.log(`[WEBHOOK START] Received: ${req.method} ${req.url}`);
        console.log('[WEBHOOK HOST] Host Header:', req.headers.get('host'));
        console.log(`[WEBHOOK PARAMS] Topic: ${topic}, ID: ${id}`);
        console.log('[WEBHOOK BODY]:', JSON.stringify(body, null, 2));
        console.log('---------------------------------------------------');

        if (!id || (topic !== 'payment' && topic !== 'merchant_order')) {
            console.log(`[WEBHOOK] Ignorado: Topic ${topic} no manejado.`);
            return NextResponse.json({ received: true });
        }

        // Obtener credenciales
        const credentials = await getMPCredentials();
        if (!credentials) {
            console.error('[WEBHOOK] Credenciales no configuradas.');
            return NextResponse.json({ error: 'MP not configured' }, { status: 503 });
        }

        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const paymentClient = new Payment(client);
        const merchantOrderClient = new MerchantOrder(client);

        let paymentInfo = null;
        let merchantOrder = null;

        // Estrategia:
        // 1. Si es 'payment', buscamos el pago directo.
        // 2. Si es 'merchant_order', buscamos la orden y revisamos sus pagos.

        if (topic === 'payment') {
            try {
                paymentInfo = await paymentClient.get({ id });
            } catch (error) {
                console.error(`[WEBHOOK] Error buscando pago ${id}:`, error.message);
                return NextResponse.json({ received: true }); // Respondemos OK para que no reintente infinito
            }
        } else if (topic === 'merchant_order') {
            try {
                merchantOrder = await merchantOrderClient.get({ merchantOrderId: id });
                console.log(`[WEBHOOK] Merchant Order Data:`, JSON.stringify(merchantOrder, null, 2));

                // Buscamos el pago aprobado más reciente (o el último intento)
                if (merchantOrder.payments && merchantOrder.payments.length > 0) {
                    const lastPayment = merchantOrder.payments[merchantOrder.payments.length - 1];
                    paymentInfo = await paymentClient.get({ id: lastPayment.id });
                } else {
                    console.log(`[WEBHOOK] Merchant Order ${id} sin pagos asociados.`);
                    return NextResponse.json({ received: true });
                }
            } catch (error) {
                console.error(`[WEBHOOK] Error buscando merchant_order ${id}:`, error.message);
                return NextResponse.json({ received: true });
            }
        }

        if (!paymentInfo) {
            return NextResponse.json({ received: true });
        }

        // --- Logica de Procesamiento ---

        console.log(`[WEBHOOK] Procesando Pago ${paymentInfo.id}: Estado=${paymentInfo.status} (${paymentInfo.status_detail})`);

        // Si NO está aprobado, solo logueamos y salimos (no creamos orden)
        // IMPORTANTE: Aquí es donde ves por qué salen rechazados los "create-preference"
        if (paymentInfo.status !== 'approved') {
            console.warn(`[WEBHOOK] Pago NO APROBADO. Razón: ${paymentInfo.status_detail}`);
            return NextResponse.json({ received: true });
        }

        // --- Creación de Orden ---
        await dbConnect();

        // Evitar duplicados
        const existingOrder = await Order.findOne({ mercadoPagoId: paymentInfo.id.toString() });
        if (existingOrder) {
            console.log(`[WEBHOOK] La orden ${existingOrder.orderNumber} ya existe.`);
            return NextResponse.json({ received: true, order: existingOrder.orderNumber });
        }

        // Extraer metadata
        // MP a veces devuelve snake_case en metadata cuando se consulta vía API
        const meta = paymentInfo.metadata || {};
        const customerDataRaw = meta.customer_data || meta.customerData;
        const itemsRaw = meta.items;
        const locationId = meta.location_id || meta.locationId;
        const total = meta.total;

        if (!customerDataRaw || !itemsRaw) {
            console.error('[WEBHOOK] Metadata incompleta en el pago.');
            return NextResponse.json({ received: true }); // No podemos hacer nada sin data
        }

        // Parsear si vienen como strings (bug usual de MP v1/v2 mix)
        const customerData = typeof customerDataRaw === 'string' ? JSON.parse(customerDataRaw) : customerDataRaw;
        const items = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : itemsRaw;

        // Generar Order Number
        const orderCount = await Order.countDocuments();
        const orderNumber = `ORD-${String(orderCount + 1).padStart(4, '0')}`;

        const newOrder = new Order({
            orderNumber,
            customer: {
                name: customerData.name,
                lastname: customerData.lastname || '',
                phone: customerData.phone,
                email: customerData.email || ''
            },
            items,
            location: {
                locationId: locationId,
                locationName: locationId // Podrías mejorar esto buscando el nombre real
            },
            deliveryMethod: customerData.deliveryMethod || 'Retiro en Sucursal',
            deliveryAddress: customerData.deliveryAddress || '',
            paymentMethod: 'Mercado Pago',
            paymentStatus: 'approved',
            mercadoPagoId: paymentInfo.id.toString(),
            status: 'pending', // Pending de "Preparación", pero pagado
            subtotal: total,
            total,
            notes: customerData.notes || ''
        });

        await newOrder.save();
        console.log(`[WEBHOOK] ✅ Orden creada exitosamente: ${orderNumber}`);

        return NextResponse.json({ received: true, order: orderNumber });

    } catch (error) {
        console.error('[WEBHOOK CRASH]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'Webhook endpoint active' });
}

export const dynamic = 'force-dynamic';
