import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Customer from '@/models/Customer';

// GET: Stats de clientes
export async function GET(request) {
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total de clientes únicos
        const totalCustomers = await Customer.countDocuments();

        // Nuevos clientes (últimos 7 días)
        const newCustomers7d = await Customer.countDocuments({
            firstOrderDate: { $gte: sevenDaysAgo }
        });

        // Nuevos clientes (últimos 30 días)
        const newCustomers30d = await Customer.countDocuments({
            firstOrderDate: { $gte: thirtyDaysAgo }
        });

        // Clientes recurrentes (más de 1 orden)
        const returningCustomers = await Customer.countDocuments({
            totalOrders: { $gt: 1 }
        });

        // Promedio de órdenes por cliente
        const avgOrdersAgg = await Customer.aggregate([
            { $group: { _id: null, avg: { $avg: '$totalOrders' } } }
        ]);
        const avgOrdersPerCustomer = avgOrdersAgg[0]?.avg || 0;

        // Promedio de gasto por cliente
        const avgSpentAgg = await Customer.aggregate([
            { $group: { _id: null, avg: { $avg: '$totalSpent' } } }
        ]);
        const avgSpentPerCustomer = avgSpentAgg[0]?.avg || 0;

        // Top clientes
        const topCustomers = await Customer.find()
            .sort({ totalSpent: -1 })
            .limit(10)
            .lean();

        return NextResponse.json({
            success: true,
            stats: {
                totalCustomers,
                newCustomers7d,
                newCustomers30d,
                returningCustomers,
                oneTimeCustomers: totalCustomers - returningCustomers,
                avgOrdersPerCustomer: Math.round(avgOrdersPerCustomer * 100) / 100,
                avgSpentPerCustomer: Math.round(avgSpentPerCustomer),
                topCustomers
            }
        });
    } catch (error) {
        console.error('[SuperAdmin Customer Stats] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener stats' },
            { status: 500 }
        );
    }
}
