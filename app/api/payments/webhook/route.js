import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment, MerchantOrder } from 'mercadopago';
import crypto from 'crypto';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { getMPCredentials } from '@/utils/getMPCredentials';
import { createOrderFromPayment } from '@/utils/orderService';
import { trackCustomer } from '@/utils/customerTracking';
import Settings from '@/models/Settings';
import AuditLog from '@/models/AuditLog';
import { decrypt } from '@/utils/encryption';
import { checkRateLimit } from '@/lib/rateLimit';

// 🔒 SECURITY: Validate MercadoPago webhook signature (VULN-002)
function validateMPSignature(req, secret, dataId) {
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    if (!xSignature || !xRequestId) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[WEBHOOK SECURITY] Missing signature headers in production');
            return false;
        }
        console.warn('[WEBHOOK SECURITY] Missing signature - allowed in development');
        return true;
    }

    try {
        const signatureParts = xSignature.split(',').reduce((acc, part) => {
            const [key, value] = part.split('=');
            if (key && value) {
                acc[key.trim()] = value.trim();
            }
            return acc;
        }, {});

        const ts = signatureParts['ts'];
        const v1 = signatureParts['v1'];

        if (!ts || !v1) {
            console.warn('[WEBHOOK SECURITY] Invalid signature format');
            return false;
        }

        // --- PROTECCIÓN CONTRA REPETICIÓN (REPLAY PROTECTION) ---
        // Validar que la firma no tenga más de 5 minutos de antigüedad
        const FIVE_MINUTES_MS = 5 * 60 * 1000;
        const signatureTime = parseInt(ts) * 1000;
        const now = Date.now();
        if (Math.abs(now - signatureTime) > FIVE_MINUTES_MS) {
            console.error('[WEBHOOK SECURITY] Signature expired (Replay Attack?)');
            return false;
        }

        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(manifest);
        const calculatedSignature = hmac.digest('hex');

        const signatureBuffer = Buffer.from(v1, 'hex');
        const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');

        if (signatureBuffer.length !== calculatedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(signatureBuffer, calculatedBuffer);
    } catch (error) {
        console.error('[WEBHOOK SECURITY] Error validating signature:', error.message);
        return false;
    }
}

export async function POST(req) {
    try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
        const { success } = await checkRateLimit(`webhook:${ip}`)
        if (!success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }

        const url = new URL(req.url);
        const queryId = url.searchParams.get('id');
        const queryTopic = url.searchParams.get('topic');
        const dataId = url.searchParams.get('data.id') || queryId;

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
        // 🔒 No loguear el body completo en producción (puede contener datos sensibles)
        if (process.env.NODE_ENV === 'development') {
            console.log('[WEBHOOK BODY]:', JSON.stringify(body, null, 2));
        }
        console.log('---------------------------------------------------');

        // Obtener credenciales
        const credentials = await getMPCredentials();
        await dbConnect(); // Asegurar conexión
        const settings = await Settings.getValue('mercadopago_credentials');
        const webhookSecret = settings?.webhookSecret ? decrypt(settings.webhookSecret) : process.env.MP_WEBHOOK_SECRET;

        // 🔒 SECURITY: Validar firma del webhook
        if (webhookSecret) {
            if (!validateMPSignature(req, webhookSecret, dataId || id)) {
                console.error('[WEBHOOK SECURITY] ❌ Invalid signature - possible attack');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
            console.log('[WEBHOOK SECURITY] ✅ Signature validated');
        } else {
            // ⚠️ Sin secret configurado — procesamos el pago igual pero logueamos fuerte.
            // Es preferible recibir pedidos reales sin validar firma que bloquear pagos legítimos.
            // ACCIÓN REQUERIDA: configurar MP_WEBHOOK_SECRET en Vercel para mayor seguridad.
            console.warn('[WEBHOOK SECURITY] ⚠️ MP_WEBHOOK_SECRET no configurado — procesando sin validar firma.');
        }

        if (!id || (topic !== 'payment' && topic !== 'merchant_order')) {
            console.log(`[WEBHOOK] Ignorado: Topic ${topic} no manejado.`);
            return NextResponse.json({ received: true });
        }

        if (!credentials) {
            console.error('[WEBHOOK] Credenciales no configuradas.');
            return NextResponse.json({ error: 'MP not configured' }, { status: 503 });
        }

        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const paymentClient = new Payment(client);
        const merchantOrderClient = new MerchantOrder(client);

        let paymentInfo = null;
        let merchantOrder = null;

        // 📝 AUDIT: Registrar llegada del webhook
        await AuditLog.create({
            performedBy: { userName: 'MercadoPago Webhook', userRole: 'system' },
            action: 'UPDATE',
            entity: 'order',
            details: `Webhook recibido: Topic=${topic}, ID=${id}`,
            metadata: { topic, dataId: id, body: body }
        }).catch(err => console.error('[WEBHOOK AUDIT ERROR]:', err));

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
        if (paymentInfo.status !== 'approved') {
            console.warn(`[WEBHOOK] Pago NO APROBADO. Razón: ${paymentInfo.status_detail}`);
            return NextResponse.json({ received: true });
        }

        // --- Creación/Actualización de Orden ---
        await dbConnect();

        // Estrategia principal: el orderId viene en metadata (creado en create-preference)
        const meta = paymentInfo.metadata || {};
        const orderId = meta.order_id || meta.orderId; // MP convierte camelCase a snake_case

        if (orderId) {
            // 🛡️ IDEMPOTENCIA: Verificar si ya está aprobada
            const existingOrder = await Order.findById(orderId);
            if (existingOrder && (existingOrder.paymentStatus === 'approved' || existingOrder.status === 'confirmed')) {
                console.log(`[WEBHOOK] ⏩ Orden ${existingOrder.orderNumber} ya procesada anteriormente.`);
                return NextResponse.json({ received: true, alreadyProcessed: true });
            }

            // Actualizar la orden pendiente que ya fue creada en create-preference
            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                {
                    $set: {
                        paymentStatus: 'approved',
                        mercadoPagoId: paymentInfo.id.toString(),
                        status: 'confirmed',
                        confirmedAt: new Date(),
                        // NO tocar printStatus — es manejado exclusivamente por el agente de impresión
                    }
                },
                { new: true }
            );

            if (updatedOrder) {
                console.log(`[WEBHOOK] ✅ Orden actualizada: ${updatedOrder.orderNumber} → confirmed`);
                
                await AuditLog.create({
                    performedBy: { userName: 'MercadoPago Webhook', userRole: 'system' },
                    action: 'STATUS_CHANGE',
                    entity: 'order',
                    entityId: updatedOrder._id,
                    entityName: updatedOrder.orderNumber,
                    details: `Pago aprobado y orden confirmada automáticamente.`,
                    metadata: { paymentId: paymentInfo.id, status: paymentInfo.status }
                }).catch(err => console.error('[WEBHOOK SUCCESS AUDIT ERROR]:', err));

                trackCustomer({
                    phone: updatedOrder.customer?.phone,
                    email: updatedOrder.customer?.email,
                    name: updatedOrder.customer?.name,
                    lastname: updatedOrder.customer?.lastname,
                    total: updatedOrder.total,
                    locationId: updatedOrder.location?.locationId,
                    orderId: updatedOrder._id,
                    isExecutive: updatedOrder.orderMode === 'executive',
                    affiliateDiscountCode: updatedOrder.affiliateDiscountCode || null,
                }).catch(err => console.error('[WEBHOOK] trackCustomer error:', err));
                return NextResponse.json({ received: true, order: updatedOrder.orderNumber });
            } else {
                console.warn(`[WEBHOOK] ⚠️ orderId ${orderId} no encontrado en DB. Intentando fallback...`);
            }
        }

        // Fallback: crear orden desde metadata (compatibilidad con pagos anteriores al refactor)
        const newOrder = await createOrderFromPayment(paymentInfo);
        console.log(`[WEBHOOK] ✅ Orden creada (fallback): ${newOrder.orderNumber}`);
        trackCustomer({
            phone: newOrder.customer?.phone,
            email: newOrder.customer?.email,
            name: newOrder.customer?.name,
            lastname: newOrder.customer?.lastname,
            total: newOrder.total,
            locationId: newOrder.location?.locationId,
        }).catch(err => console.error('[WEBHOOK] trackCustomer fallback error:', err));
        return NextResponse.json({ received: true, order: newOrder.orderNumber });

    } catch (error) {
        console.error('[WEBHOOK CRASH]:', error);
        // 🔒 SECURITY: No exponer detalles del error en producción (VULN-008)
        const errorMessage = process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message;
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'Webhook endpoint active' });
}

export const dynamic = 'force-dynamic';
