import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMPCredentials } from '@/utils/getMPCredentials';
import { createOrderFromPayment } from '@/utils/orderService';

// Sanitizar entrada para prevenir inyección NoSQL
function sanitizePaymentId(input) {
    if (typeof input !== 'string') return '';
    // Payment IDs de MP son numéricos
    return input.replace(/[^0-9]/g, '').substring(0, 30);
}

/**
 * GET /api/orders/by-payment/[paymentId]
 * Busca la orden confirmada por ID de pago de MercadoPago.
 *
 * Sistema de recuperación de 3 niveles:
 * 1. Buscar en DB por mercadoPagoId  (webhook ya procesó)
 * 2. Buscar en DB por orderId de metadata (orden creada antes del pago, webhook tardó)
 * 3. Crear la orden como último recurso si el pago está aprobado en MP
 */
export async function GET(req, { params }) {
    try {
        await dbConnect();

        const { paymentId: rawPaymentId } = await params;
        if (!rawPaymentId) {
            return NextResponse.json({ error: 'paymentId es requerido' }, { status: 400 });
        }

        const paymentId = sanitizePaymentId(rawPaymentId);
        if (!paymentId) {
            return NextResponse.json({ error: 'Formato de paymentId inválido' }, { status: 400 });
        }

        // ── NIVEL 1: Buscar por mercadoPagoId en DB ──────────────────────────────
        // Caso nominal: el webhook ya llegó y confirmó la orden.
        let order = await Order.findOne({ mercadoPagoId: paymentId });
        if (order) {
            return NextResponse.json({
                orderNumber: order.orderNumber,
                orderId: order._id,
                status: order.status,
                locationId: order.location?.locationId,
            });
        }

        // ── Consultar MercadoPago para los niveles 2 y 3 ─────────────────────────
        console.log(`[RECOVERY] Orden no encontrada por paymentId ${paymentId}. Consultando MP...`);

        const credentials = await getMPCredentials();
        if (!credentials) {
            return NextResponse.json(
                { error: 'Pedido no encontrado y MP no configurado' },
                { status: 404 }
            );
        }

        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const paymentClient = new Payment(client);

        let paymentInfo;
        try {
            paymentInfo = await paymentClient.get({ id: paymentId });
        } catch (mpError) {
            console.error('[RECOVERY] Error consultando MP:', mpError.message);
            return NextResponse.json(
                { error: 'Pedido no encontrado y error en MP' },
                { status: 404 }
            );
        }

        if (!paymentInfo) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        // ── NIVEL 2: Buscar la orden pre-existente por orderId del metadata ───────
        // La orden fue creada en create-preference antes de ir a MP.
        // El webhook todavía no llegó (o falló), pero la orden YA existe en DB.
        const meta = paymentInfo.metadata || {};
        const orderId = meta.order_id || meta.orderId; // MP convierte camelCase → snake_case

        if (orderId) {
            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                {
                    $set: {
                        paymentStatus: 'approved',
                        mercadoPagoId: paymentId,
                        status: 'confirmed',
                        // NO tocar printStatus — es manejado exclusivamente por el agente de impresión
                    }
                },
                { new: true }
            );

            if (updatedOrder) {
                console.log(`[RECOVERY] ✅ Nivel 2 — Orden recuperada: ${updatedOrder.orderNumber}`);
                return NextResponse.json({
                    orderNumber: updatedOrder.orderNumber,
                    orderId: updatedOrder._id,
                    status: updatedOrder.status,
                    locationId: updatedOrder.location?.locationId,
                    recovered: true,
                });
            }
        }

        // ── NIVEL 3: Crear la orden como último recurso ────────────────────────────
        if (paymentInfo.status === 'approved') {
            console.log(`[RECOVERY] Nivel 3 — Creando orden desde metadata MP para pago ${paymentId}...`);
            try {
                order = await createOrderFromPayment(paymentInfo);
                return NextResponse.json({
                    orderNumber: order.orderNumber,
                    orderId: order._id,
                    status: order.status,
                    locationId: order.location?.locationId,
                    recovered: true,
                });
            } catch (createError) {
                console.error('[RECOVERY] Nivel 3 falló:', createError.message);
                return NextResponse.json(
                    { error: 'Error al recuperar la orden' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    } catch (error) {
        console.error('Error fetching order by payment:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
