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

// GET /api/orders/by-payment/[paymentId]
// Endpoint público para buscar orden por ID de pago de MercadoPago
// Recuperación automática: Si no existe en DB pero sí en MP, la crea.
export async function GET(req, { params }) {
    try {
        await dbConnect();

        const { paymentId: rawPaymentId } = await params;

        if (!rawPaymentId) {
            return NextResponse.json({ error: 'paymentId es requerido' }, { status: 400 });
        }

        // Sanitizar entrada
        const paymentId = sanitizePaymentId(rawPaymentId);
        if (!paymentId) {
            return NextResponse.json({ error: 'Formato de paymentId inválido' }, { status: 400 });
        }

        // 1. Intentar buscar en DB Local
        let order = await Order.findOne({ mercadoPagoId: paymentId });

        // 2. Si existe, retornarla
        if (order) {
            return NextResponse.json({
                orderNumber: order.orderNumber,
                orderId: order._id,
                status: order.status,
                locationId: order.location?.locationId
            });
        }

        // 3. FALLBACK: Si no existe, podría ser que el webhook falló (ej: localhost).
        // Consultamos directo a Mercado Pago.
        console.log(`[RECOVERY] Orden no encontrada para pago ${paymentId}. Consultando MP...`);

        const credentials = await getMPCredentials();
        if (!credentials) {
            return NextResponse.json({ error: 'Pedido no encontrado y MP no configurado' }, { status: 404 });
        }

        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const paymentClient = new Payment(client);

        let paymentInfo;
        try {
            paymentInfo = await paymentClient.get({ id: paymentId });
        } catch (mpError) {
            console.error('[RECOVERY] Error consultando MP:', mpError.message);
            return NextResponse.json({ error: 'Pedido no encontrado y error en MP' }, { status: 404 });
        }

        // 4. Si el pago existe y está aprobado, CREAR LA ORDEN AHORA
        if (paymentInfo && paymentInfo.status === 'approved') {
            console.log(`[RECOVERY] Pago ${paymentId} está APROBADO en MP. Recuperando orden...`);
            try {
                // Usamos el servicio compartido para crear la orden
                order = await createOrderFromPayment(paymentInfo);

                return NextResponse.json({
                    orderNumber: order.orderNumber,
                    orderId: order._id,
                    status: order.status,
                    locationId: order.location?.locationId,
                    recovered: true
                });
            } catch (createError) {
                console.error('[RECOVERY] Error creando orden recuperada:', createError);
                return NextResponse.json({ error: 'Error al recuperar la orden' }, { status: 500 });
            }
        }

        // Si no está aprobado o no existe
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    } catch (error) {
        console.error('Error fetching order by payment:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
