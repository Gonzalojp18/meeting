import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { validateApiKey } from '@/lib/auth/api-key';
import { decrypt } from '@/utils/encryption';

// GET /api/integrations/n8n/orders
// ?status=active  → pedidos en curso (pending, confirmed, preparing)
// ?period=today   → todos los pedidos del día + summary
export async function GET(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const period = searchParams.get('period');
        const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 30);

        let query = { isDeleted: { $ne: true } };

        if (status === 'active') {
            query.status = { $in: ['pending', 'confirmed', 'preparing'] };
        } else if (period === 'today') {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const rawOrders = await Order.find(query).sort({ createdAt: -1 }).limit(limit).lean();

        const orders = rawOrders.map(o => {
            let customerName = 'N/A';
            try { customerName = decrypt(o.customer?.name) || 'N/A'; } catch {}

            return {
                orderId: o._id.toString(),
                orderNumber: o.orderNumber,
                customerName,
                status: o.status,
                total: o.total,
                items: o.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || '',
                itemCount: o.items?.length || 0,
                deliveryMethod: o.deliveryMethod,
                paymentStatus: o.paymentStatus,
                createdAt: o.createdAt,
            };
        });

        let summary = null;
        if (period === 'today') {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const stats = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start },
                        canBeCounted: true,
                        status: { $nin: ['cancelled'] },
                        isDeleted: { $ne: true }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$total' },
                        totalOrders: { $sum: 1 },
                        avgTicket: { $avg: '$total' }
                    }
                }
            ]);
            summary = stats[0] || { totalRevenue: 0, totalOrders: 0, avgTicket: 0 };
        }

        return NextResponse.json({ orders, summary });
    } catch (error) {
        console.error('Error in n8n orders GET:', error);
        return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }
}

// PATCH /api/integrations/n8n/orders - Update order status
export async function PATCH(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();

        const body = await req.json();
        const { orderId, orderNumber, status, adminNotes } = body;

        const validStatuses = ['confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json(
                { error: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        if (!orderId && !orderNumber) {
            return NextResponse.json({ error: 'Se requiere orderId o orderNumber' }, { status: 400 });
        }

        const query = orderId ? { _id: orderId } : { orderNumber };
        const order = await Order.findOne(query);
        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        order.status = status;
        if (adminNotes !== undefined) order.adminNotes = adminNotes;

        const now = new Date();
        if (status === 'confirmed' && !order.confirmedAt) order.confirmedAt = now;
        if (status === 'ready') order.readyAt = now;
        if (status === 'delivered') order.deliveredAt = now;
        if (status === 'completed') order.completedAt = now;
        if (status === 'cancelled') { order.cancelledAt = now; order.canBeCounted = false; }

        await order.save();

        let customerName = 'N/A';
        try { customerName = decrypt(order.customer?.name) || 'N/A'; } catch {}

        return NextResponse.json({
            msg: `Pedido #${order.orderNumber} actualizado a "${status}"`,
            order: {
                orderNumber: order.orderNumber,
                customerName,
                status: order.status,
                total: order.total,
            }
        });
    } catch (error) {
        console.error('Error in n8n orders PATCH:', error);
        return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 });
    }
}
