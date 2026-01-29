import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { auth } from '@/auth';

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
        if (updates.status) order.status = updates.status;
        if (updates.paymentStatus) order.paymentStatus = updates.paymentStatus;
        if (updates.adminNotes) order.adminNotes = updates.adminNotes;

        // Auto-set timestamps
        if (updates.status === 'completed') order.completedAt = new Date();
        if (updates.status === 'cancelled') order.cancelledAt = new Date();

        await order.save();

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
