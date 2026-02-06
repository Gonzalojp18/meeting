import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';

// Sanitizar entrada para prevenir inyección NoSQL
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    // Solo permitir caracteres alfanuméricos y guiones
    return input.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 50);
}

// GET /api/orders/by-number/[orderNumber]
// Endpoint público para que el cliente pueda ver su pedido
export async function GET(req, { params }) {
    try {
        await dbConnect();

        const { orderNumber: rawOrderNumber } = await params;

        if (!rawOrderNumber) {
            return NextResponse.json({ error: 'orderNumber es requerido' }, { status: 400 });
        }

        // Sanitizar entrada
        const orderNumber = sanitizeInput(rawOrderNumber);
        if (!orderNumber) {
            return NextResponse.json({ error: 'Formato de número de pedido inválido' }, { status: 400 });
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
