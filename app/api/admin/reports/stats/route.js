import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { auth } from '@/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const session = await auth();

        const ALLOWED_ROLES = ['admin', 'superadmin'];
        if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const locationId = searchParams.get('locationId');

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate y endDate son requeridos' },
                { status: 400 }
            );
        }

        const start = new Date(startDate);
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

        const matchQuery = {
            createdAt: { $gte: start, $lte: end },
            canBeCounted: true, // ⬅️ Solo pedidos válidos (excluye cancelados/reembolsados)
            status: { $nin: ['cancelled'] } // Seguridad adicional
        };

        if (locationId) {
            matchQuery['location.locationId'] = locationId;
        }

        // 1. Métricas generales (Ventas, Cantidad, Promedio)
        const generalStats = await Order.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    avgTicket: { $avg: '$total' }
                }
            }
        ]);

        // 2. Platos más vendidos
        const topDishes = await Order.aggregate([
            { $match: matchQuery },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { quantity: -1 } },
            { $limit: 10 }
        ]);

        // 3. Ventas por método de entrega
        const deliveryStats = await Order.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$deliveryMethod',
                    count: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }
            }
        ])

        // 4. Estadísticas de cancelaciones (nuevas métricas)
        const cancellationQuery = {
            createdAt: { $gte: start, $lte: end },
            status: 'cancelled'
        };

        if (locationId) {
            cancellationQuery['location.locationId'] = locationId;
        }

        const cancellationStats = await Order.aggregate([
            { $match: cancellationQuery },
            {
                $group: {
                    _id: null,
                    cancelledCount: { $sum: 1 },
                    refundedAmount: { $sum: '$total' }
                }
            }
        ]);

        const cancellations = cancellationStats[0] || { cancelledCount: 0, refundedAmount: 0 };

        // Calcular tasa de cancelación
        const totalOrdersIncludingCancelled = (generalStats[0]?.orderCount || 0) + cancellations.cancelledCount;
        const cancellationRate = totalOrdersIncludingCancelled > 0
            ? ((cancellations.cancelledCount / totalOrdersIncludingCancelled) * 100).toFixed(2)
            : '0.00';

        return NextResponse.json({
            summary: {
                ...(generalStats[0] || { totalRevenue: 0, orderCount: 0, avgTicket: 0 }),
                cancelledOrders: cancellations.cancelledCount,
                refundedAmount: cancellations.refundedAmount,
                cancellationRate: `${cancellationRate}%`
            },
            topDishes,
            deliveryStats
        });
    } catch (error) {
        console.error('Error in stats API:', error);
        return NextResponse.json({ error: 'Error al generar estadísticas' }, { status: 500 });
    }
}
