import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';

// GET /api/orders/by-payment/[paymentId]
// Endpoint público para buscar orden por ID de pago de MercadoPago
// Usado después de que el cliente retorna de MP para obtener el orderNumber
export async function GET(req, { params }) {
    try {
        await dbConnect();

        const { paymentId } = await params;

        if (!paymentId) {
            return NextResponse.json({ error: 'paymentId es requerido' }, { status: 400 });
        }

        // Buscar la orden por mercadoPagoId
        const order = await Order.findOne({ mercadoPagoId: paymentId });

        if (!order) {
            // Si no existe aún, el webhook probablemente no ha procesado el pago
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        // Retornar solo los datos básicos necesarios para redirigir al tracking
        return NextResponse.json({
            orderNumber: order.orderNumber,
            orderId: order._id,
            status: order.status,
            locationId: order.location?.locationId
        });
    } catch (error) {
        console.error('Error fetching order by payment:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
