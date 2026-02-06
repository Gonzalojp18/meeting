import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';

// GET /api/orders/by-number/[orderNumber]
// Endpoint público para que el cliente pueda ver su pedido
export async function GET(req, { params }) {
    try {
        await dbConnect();

        const { orderNumber } = await params;

        if (!orderNumber) {
            return NextResponse.json({ error: 'orderNumber es requerido' }, { status: 400 });
        }

        // Buscar la orden por número
        // Soporta tanto el formato completo "ORD-xxx" como solo "xxx"
        let order = await Order.findOne({ orderNumber: orderNumber });

        // Si no se encuentra, intentar con prefijo ORD-
        if (!order && !orderNumber.startsWith('ORD-')) {
            order = await Order.findOne({ orderNumber: `ORD-${orderNumber}` });
        }

        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        // Retornar solo los campos necesarios para el cliente (sin datos sensibles)
        return NextResponse.json({
            _id: order._id,
            orderNumber: order.orderNumber,
            customer: {
                name: order.customer.name,
                lastname: order.customer.lastname,
                phone: order.customer.phone,
                email: order.customer.email
            },
            items: order.items,
            location: order.location,
            deliveryMethod: order.deliveryMethod,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total: order.total,
            notes: order.notes,
            customerPickupConfirmed: order.customerPickupConfirmed,
            createdAt: order.createdAt
        });
    } catch (error) {
        console.error('Error fetching order by number:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
