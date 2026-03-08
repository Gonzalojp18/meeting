import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import Menu from '@/models/Menu';

export async function GET(request) {
    // Verificar autenticación superadmin
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();

        // Obtener fechas para rango
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total de órdenes
        const totalOrders = await Order.countDocuments({
            paymentStatus: 'approved', isDeleted: { $ne: true }
        });

        // Revenue total
        const revenueAgg = await Order.aggregate([
            { $match: { paymentStatus: 'approved', isDeleted: { $ne: true } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        // Total de clientes únicos
        const activeCustomers = await Customer.countDocuments();

        // Ticket promedio
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Revenue por locación
        const revenueByLocationAgg = await Order.aggregate([
            { $match: { paymentStatus: 'approved', isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: '$location.locationId',
                    revenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    locationName: { $first: '$location.locationName' }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        const revenueByLocation = revenueByLocationAgg.map(loc => ({
            locationId: loc._id,
            name: loc.locationName,
            revenue: loc.revenue,
            orderCount: loc.orderCount
        }));

        // Órdenes de hoy
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const ordersToday = await Order.countDocuments({
            createdAt: { $gte: todayStart },
            paymentStatus: 'approved', isDeleted: { $ne: true }
        });

        // Revenue trend (últimos 30 días)
        const revenueTrendAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                    paymentStatus: 'approved', isDeleted: { $ne: true }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const revenueTrend = revenueTrendAgg.map(day => ({
            date: day._id,
            revenue: day.revenue,
            orders: day.orders
        }));

        return NextResponse.json({
            success: true,
            data: {
                totalRevenue: Math.round(totalRevenue),
                totalOrders,
                activeCustomers,
                averageOrderValue: Math.round(averageOrderValue),
                revenueByLocation,
                ordersToday,
                revenueTrend
            }
        });
    } catch (error) {
        console.error('[SuperAdmin Overview] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener métricas' },
            { status: 500 }
        );
    }
}
