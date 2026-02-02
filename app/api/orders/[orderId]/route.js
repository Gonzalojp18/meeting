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
        const updates = await req.json();

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

        // Update fields
        if (updates.status) order.status = updates.status;
        if (updates.paymentStatus) order.paymentStatus = updates.paymentStatus;
        if (updates.adminNotes) order.adminNotes = updates.adminNotes;

        // Auto-set timestamps
        if (updates.status === 'completed') order.completedAt = new Date();
        if (updates.status === 'cancelled') order.cancelledAt = new Date();

        await order.save();

        // Trigger printing if status changes to confirmed or preparing
        // AND checks if status actually changed to avoid double clicking
        if (
            (updates.status === 'confirmed' || updates.status === 'preparing') &&
            updates.status !== previousStatus
        ) {
            console.log(`[ORDER-PATCH] Triggering Kitchen Print for ${order._id} (Status: ${previousStatus} -> ${updates.status})`);

            // Force print because 'printed' might be true from Cashier ticket
            // REMOVED: force: true to prevent duplicates on multiple clicks or refreshes
            executePrintSaga(order._id, { type: 'kitchen', template: 'ORDER_TICKET' })
                .catch(err => console.error('Error printing kitchen ticket on update:', err));
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
