import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { getMPCredentials } from '@/utils/getMPCredentials';

export async function POST(req) {
    try {
        // Leer el body como texto primero para manejar health checks
        const text = await req.text();

        // Si está vacío, devolver OK (MP hace health checks)
        if (!text || text.trim() === '') {
            return NextResponse.json({ received: true });
        }

        const body = JSON.parse(text);

        // Solo procesar notificaciones de pagos
        if (body.type !== 'payment') {
            return NextResponse.json({ received: true });
        }

        const paymentId = body.data?.id;

        if (!paymentId) {
            return NextResponse.json({ received: true });
        }

        // Obtener credenciales dinámicas desde la DB
        const credentials = await getMPCredentials();
        if (!credentials) {
            console.error('Webhook: Credenciales de MP no configuradas');
            return NextResponse.json({ error: 'MP not configured' }, { status: 503 });
        }

        const client = new MercadoPagoConfig({
            accessToken: credentials.accessToken
        });

        // Obtener detalles del pago
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        console.log('Info del pago:', {
            id: paymentInfo.id,
            status: paymentInfo.status,
            status_detail: paymentInfo.status_detail,
            transaction_amount: paymentInfo.transaction_amount
        });

        // Solo crear pedido si el pago fue aprobado
        if (paymentInfo.status !== 'approved') {
            return NextResponse.json({ received: true });
        }

        await dbConnect();

        // Verificar si ya existe un pedido con este payment_id
        const existingOrder = await Order.findOne({
            mercadoPagoId: paymentId.toString()
        });

        if (existingOrder) {
            return NextResponse.json({
                received: true,
                order: existingOrder.orderNumber
            });
        }

        // Extraer metadata (MP convierte camelCase a snake_case)
        const customerData = JSON.parse(paymentInfo.metadata.customer_data);
        const items = JSON.parse(paymentInfo.metadata.items);
        const total = paymentInfo.metadata.total;
        const locationId = paymentInfo.metadata.location_id;

        // Generar número de orden
        const orderCount = await Order.countDocuments();
        const orderNumber = `ORD-${String(orderCount + 1).padStart(4, '0')}`;

        // Crear la orden
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
                locationName: locationId
            },
            deliveryMethod: customerData.deliveryMethod || 'Retiro en Sucursal',
            deliveryAddress: customerData.deliveryAddress || '',
            paymentMethod: 'Mercado Pago',
            paymentStatus: 'approved',
            mercadoPagoId: paymentId.toString(),
            status: 'pending',
            subtotal: total,
            total,
            notes: customerData.notes || ''
        });

        await newOrder.save();
        console.log('Pedido creado:', orderNumber);

        return NextResponse.json({
            received: true,
            order: orderNumber
        });

    } catch (error) {
        console.error('Error en webhook:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// MercadoPago también puede enviar GET para verificar el endpoint
export async function GET() {
    return NextResponse.json({ status: 'Webhook endpoint active' });
}

export const dynamic = 'force-dynamic';
