import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { validateApiKey } from '@/lib/auth/api-key';

const HYPOTHETICAL_COMMISSION_RATE = 0.10;

/**
 * GET /api/integrations/n8n/kpis
 * Wrapper de KPIs para n8n — autenticación por API key (x-api-key)
 * Query params opcionales: from, to (ISO date strings o YYYY-MM-DD)
 * Retorna: GMV, comisión hipotética, tasa de pago exitoso, cancelación, recurrencia, retención en red
 */
export async function GET(req) {
    if (!validateApiKey(req)) {
        return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
    }

    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const from = searchParams.get('from');
        const to   = searchParams.get('to');

        const dateFilter = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to)   dateFilter.$lte = new Date(to);
        const createdAtFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

        // ── GMV ───────────────────────────────────────────────────────────────
        const gmvResult = await Order.aggregate([
            { $match: { paymentStatus: 'approved', isDeleted: false, ...createdAtFilter } },
            { $group: { _id: null, gmv: { $sum: '$total' } } }
        ]);
        const gmv = gmvResult[0]?.gmv || 0;

        // ── Tasa de pago ──────────────────────────────────────────────────────
        const [approvedCount, rejectedCount] = await Promise.all([
            Order.countDocuments({ paymentStatus: 'approved', isDeleted: false, ...createdAtFilter }),
            Order.countDocuments({ paymentStatus: 'rejected', isDeleted: false, ...createdAtFilter }),
        ]);
        const totalAttempts = approvedCount + rejectedCount;
        const paymentSuccessRate = totalAttempts > 0
            ? parseFloat(((approvedCount / totalAttempts) * 100).toFixed(1)) : null;

        // ── Cancelación ───────────────────────────────────────────────────────
        const [cancelledCount, totalOrders] = await Promise.all([
            Order.countDocuments({ status: 'cancelled', isDeleted: false, ...createdAtFilter }),
            Order.countDocuments({ isDeleted: false, ...createdAtFilter }),
        ]);
        const cancellationRate = totalOrders > 0
            ? parseFloat(((cancelledCount / totalOrders) * 100).toFixed(1)) : null;

        // ── Recurrencia ───────────────────────────────────────────────────────
        const recurrenceResult = await Order.aggregate([
            { $match: { paymentStatus: 'approved', isDeleted: false, ...createdAtFilter } },
            { $group: { _id: '$customer.phoneHash', orderCount: { $sum: 1 } } },
            { $group: {
                _id: null,
                uniqueCustomers: { $sum: 1 },
                recurringCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } },
            }},
        ]);
        const rec = recurrenceResult[0] || { uniqueCustomers: 0, recurringCustomers: 0 };
        const recurrenceRate = rec.uniqueCustomers > 0
            ? parseFloat(((rec.recurringCustomers / rec.uniqueCustomers) * 100).toFixed(1)) : null;

        // ── Retención en red ──────────────────────────────────────────────────
        const networkResult = await Order.aggregate([
            { $match: { paymentStatus: 'approved', isDeleted: false, ...createdAtFilter } },
            { $group: { _id: '$customer.phoneHash', locations: { $addToSet: '$location.locationId' } } },
            { $match: { 'locations.1': { $exists: true } } },
            { $count: 'count' },
        ]);
        const networkRetentionCount = networkResult[0]?.count || 0;

        return NextResponse.json({
            success: true,
            period: { from: from || null, to: to || null },
            data: {
                gmv: Math.round(gmv),
                hypotheticalCommission: Math.round(gmv * HYPOTHETICAL_COMMISSION_RATE),
                hypotheticalCommissionRate: HYPOTHETICAL_COMMISSION_RATE,
                paymentSuccessRate,
                cancellationRate,
                recurrence: {
                    uniqueCustomers: rec.uniqueCustomers,
                    recurringCustomers: rec.recurringCustomers,
                    recurrenceRate,
                },
                networkRetention: {
                    customersInMultipleLocations: networkRetentionCount,
                },
            },
        });

    } catch (error) {
        console.error('[n8n KPIs] Error:', error);
        return NextResponse.json({ error: 'Error al obtener KPIs' }, { status: 500 });
    }
}
