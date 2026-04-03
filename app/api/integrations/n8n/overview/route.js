import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import { validateApiKey } from '@/lib/auth/api-key';

/**
 * GET /api/integrations/n8n/overview
 * Wrapper del overview global para n8n — autenticación por API key (x-api-key)
 * Retorna: revenue total, pedidos totales, clientes activos, ticket promedio,
 *          breakdown por sede, pedidos de hoy, tendencia últimos 30 días.
 */
export async function GET(req) {
    if (!validateApiKey(req)) {
        return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
    }

    try {
        await dbConnect();

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [totalOrders, revenueAgg, activeCustomers] = await Promise.all([
            Order.countDocuments({ paymentStatus: 'approved', isDeleted: { $ne: true } }),
            Order.aggregate([
                { $match: { paymentStatus: 'approved', isDeleted: { $ne: true } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            Customer.countDocuments(),
        ]);

        const totalRevenue = revenueAgg[0]?.total || 0;
        const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        // Revenue por sede
        const revenueByLocationAgg = await Order.aggregate([
            { $match: { paymentStatus: 'approved', isDeleted: { $ne: true } } },
            { $group: {
                _id: '$location.locationId',
                revenue: { $sum: '$total' },
                orderCount: { $sum: 1 },
                locationName: { $first: '$location.locationName' },
            }},
            { $sort: { revenue: -1 } },
        ]);

        // Pedidos de hoy
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const ordersToday = await Order.countDocuments({
            createdAt: { $gte: todayStart },
            paymentStatus: 'approved',
            isDeleted: { $ne: true },
        });

        // Tendencia 30 días
        const revenueTrendAgg = await Order.aggregate([
            { $match: {
                createdAt: { $gte: thirtyDaysAgo },
                paymentStatus: 'approved',
                isDeleted: { $ne: true },
            }},
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                revenue: { $sum: '$total' },
                orders: { $sum: 1 },
            }},
            { $sort: { _id: 1 } },
        ]);

        return NextResponse.json({
            success: true,
            data: {
                totalRevenue: Math.round(totalRevenue),
                totalOrders,
                activeCustomers,
                averageOrderValue,
                revenueByLocation: revenueByLocationAgg.map(l => ({
                    locationId: l._id,
                    name: l.locationName,
                    revenue: l.revenue,
                    orderCount: l.orderCount,
                })),
                ordersToday,
                revenueTrend: revenueTrendAgg.map(d => ({
                    date: d._id,
                    revenue: d.revenue,
                    orders: d.orders,
                })),
            },
        });

    } catch (error) {
        console.error('[n8n Overview] Error:', error);
        return NextResponse.json({ error: 'Error al obtener overview' }, { status: 500 });
    }
}
