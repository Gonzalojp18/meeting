import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { auth } from '@/auth';
import { executePrintSaga } from '@/lib/print/saga';

export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { orderId } = await params;

        // Validar orderId
        if (!/^[a-f\d]{24}$/i.test(orderId)) {
            return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
        }

        const updates = await req.json();

        // Validar valores permitidos de status
        const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
        if (updates.status && !VALID_STATUSES.includes(updates.status)) {
            return NextResponse.json({ error: 'Estado de pedido inválido' }, { status: 400 });
        }

        // Validar valores permitidos de paymentStatus
        const VALID_PAYMENT_STATUSES = ['pending', 'approved', 'rejected', 'refunded', 'cancelled', 'in_process'];
        if (updates.paymentStatus && !VALID_PAYMENT_STATUSES.includes(updates.paymentStatus)) {
            return NextResponse.json({ error: 'Estado de pago inválido' }, { status: 400 });
        }

        // Validar longitud de adminNotes
        if (updates.adminNotes !== undefined) {
            if (typeof updates.adminNotes !== 'string' || updates.adminNotes.length > 500) {
                return NextResponse.json({ error: 'Las notas no pueden superar 500 caracteres' }, { status: 400 });
            }
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        // Check permissions
        const locationId = order.location.locationId;
        const isOwner = session.user.role === 'admin';
        const isStaffForLocation = session.user.role === 'staff' && session.user.assignedLocations?.includes(locationId);

        if (!isOwner && !isStaffForLocation) {
            return NextResponse.json({ error: 'No tienes permiso para actualizar este pedido' }, { status: 403 });
        }

        // Update fields
        const previousStatus = order.status;

        const updateQuery = { $set: {} };
        if (updates.status) updateQuery.$set.status = updates.status;
        if (updates.paymentStatus) updateQuery.$set.paymentStatus = updates.paymentStatus;
        if (updates.adminNotes !== undefined) updateQuery.$set.adminNotes = updates.adminNotes.trim();

        // Auto-set timestamps operativos según transición de estado
        if (updates.status === 'confirmed' && !order.confirmedAt) updateQuery.$set.confirmedAt = new Date();
        if (updates.status === 'ready' && !order.readyAt) updateQuery.$set.readyAt = new Date();
        if (updates.status === 'completed' && !order.deliveredAt) updateQuery.$set.deliveredAt = new Date();
        if (updates.status === 'completed') updateQuery.$set.completedAt = new Date();
        if (updates.status === 'cancelled') updateQuery.$set.cancelledAt = new Date();

        // Update usando updateOne para bypassar los hooks de Mongoose ('a is not a function')
        await Order.updateOne({ _id: order._id }, updateQuery);

        // Reflejar cambios en la memoria local para retornar un objeto completo
        Object.assign(order, updateQuery.$set);

        // Trigger kitchen printing automatically ONLY when status changes to 'preparing'
        if (
            updates.status === 'preparing' &&
            previousStatus !== 'preparing'
        ) {
            console.log(`[ORDER-PATCH] Triggering Kitchen Print for ${order._id} (Status: ${previousStatus} -> ${updates.status})`);

            executePrintSaga(order._id, { type: 'kitchen', template: 'ORDER_TICKET', force: true })
                .catch(err => console.error('[ORDER-PATCH] Error in kitchen printing:', err));
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('[ORDER UPDATE ERROR]:', error.message, error.stack);
        const detail = error.errors
            ? Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`).join(', ')
            : error.message;

        return NextResponse.json(
            { error: 'Error del servidor al actualizar estado', detail },
            { status: 500 }
        );
    }
}

