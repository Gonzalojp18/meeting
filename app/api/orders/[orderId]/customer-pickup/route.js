import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { auth } from '@/auth';
import mongoose from 'mongoose';

// Validar formato de MongoDB ObjectId
function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) &&
        (new mongoose.Types.ObjectId(id)).toString() === id;
}

// PATCH /api/orders/[orderId]/customer-pickup
// Endpoint para confirmar que el pedido fue retirado
// Puede ser usado por:
// 1. El cliente (sin autenticación) cuando el pedido está en "ready"
// 2. El staff/admin (con autenticación) como override
export async function PATCH(req, { params }) {
    try {
        await dbConnect();

        const { orderId } = await params;
        const body = await req.json().catch(() => ({}));
        const forcedByStaff = body.forcedByStaff === true;

        if (!orderId) {
            return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 });
        }

        // Validar formato de ObjectId para prevenir inyección NoSQL
        if (!isValidObjectId(orderId)) {
            return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
        }

        // Si es override de staff, verificar autenticación
        if (forcedByStaff) {
            const session = await auth();
            if (!session) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            }
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        // Solo permitir confirmar retiro si el pedido está en estado "ready"
        if (order.status !== 'ready') {
            return NextResponse.json(
                { error: 'El pedido no está listo para retirar' },
                { status: 400 }
            );
        }

        // Verificar si ya fue confirmado
        if (order.customerPickupConfirmed) {
            return NextResponse.json(
                { error: 'El retiro ya fue confirmado' },
                { status: 400 }
            );
        }

        // Marcar como retirado bypassando hooks de Mongoose
        order.customerPickupConfirmed = true;
        order.customerPickupAt = new Date();

        await Order.updateOne(
            { _id: order._id },
            { $set: { customerPickupConfirmed: true, customerPickupAt: order.customerPickupAt } }
        );

        return NextResponse.json({
            success: true,
            message: forcedByStaff ? 'Retiro confirmado por staff' : 'Retiro confirmado exitosamente',
            orderNumber: order.orderNumber,
            customerPickupAt: order.customerPickupAt,
            forcedByStaff
        });
    } catch (error) {
        console.error('Error confirming customer pickup:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
