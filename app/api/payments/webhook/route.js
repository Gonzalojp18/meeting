import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment, MerchantOrder } from 'mercadopago';
import crypto from 'crypto';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { getMPCredentials } from '@/utils/getMPCredentials';
import { createOrderFromPayment } from '@/utils/orderService';

// 🔒 SECURITY: Validate MercadoPago webhook signature (VULN-002)
function validateMPSignature(req, secret, dataId) {
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    // Si no hay firma, rechazar en producción, permitir en desarrollo para testing
    if (!xSignature || !xRequestId) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[WEBHOOK SECURITY] Missing signature headers in production');
            return false;
        }
        console.warn('[WEBHOOK SECURITY] Missing signature - allowed in development');
        return true;
    }

    try {
        // Parsear los componentes de la firma: ts=xxx,v1=xxx
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

        // Construir el manifest según documentación de MP
        // Template: id:[data.id];request-id:[x-request-id];ts:[ts];
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

        // Calcular HMAC-SHA256
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(manifest);
        const calculatedSignature = hmac.digest('hex');

        // Comparación timing-safe para prevenir timing attacks
        const signatureBuffer = Buffer.from(v1, 'hex');
        const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');

        if (signatureBuffer.length !== calculatedBuffer.length) {
            console.warn('[WEBHOOK SECURITY] Signature length mismatch');
            return false;
        }

        const isValid = crypto.timingSafeEqual(signatureBuffer, calculatedBuffer);

        if (!isValid) {
            console.warn('[WEBHOOK SECURITY] Signature validation failed');
        }

        return isValid;
    } catch (error) {
        console.error('[WEBHOOK SECURITY] Error validating signature:', error.message);
        return false;
    }
}

export async function POST(req) {
    try {
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

        // 🔒 SECURITY: Validar firma del webhook
        const webhookSecret = process.env.MP_WEBHOOK_SECRET;
        if (webhookSecret) {
            if (!validateMPSignature(req, webhookSecret, dataId || id)) {
                console.error('[WEBHOOK SECURITY] ❌ Invalid signature - possible attack');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
            console.log('[WEBHOOK SECURITY] ✅ Signature validated');
        } else if (process.env.NODE_ENV === 'production') {
            console.error('[WEBHOOK SECURITY] ⚠️ MP_WEBHOOK_SECRET not configured in production!');
            // En producción sin secret, aún procesamos pero logueamos warning
        }

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
        if (paymentInfo.status !== 'approved') {
            console.warn(`[WEBHOOK] Pago NO APROBADO. Razón: ${paymentInfo.status_detail}`);
            return NextResponse.json({ received: true });
        }

        // --- Creación de Orden ---
        await dbConnect();

        // Usamos el servicio centralizado para crear la orden
        // Esto maneja idempotencia (evita duplicados) y parseo de metadata
        const newOrder = await createOrderFromPayment(paymentInfo);

        console.log(`[WEBHOOK] ✅ Orden procesada/creada: ${newOrder.orderNumber}`);

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
