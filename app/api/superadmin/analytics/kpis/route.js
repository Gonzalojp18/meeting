import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';

/**
 * GET /api/superadmin/analytics/kpis
 *
 * KPIs exclusivos del superadmin:
 * - GMV total (órdenes con paymentStatus approved)
 * - Proyección hipotética de comisión al 10% del GMV
 * - Tasa de pago exitoso
 * - Tasa de cancelación
 * - Tiempo promedio de preparación por sede
 * - Órdenes por hora
 * - Recurrencia de clientes
 * - Retención por red (cliente en más de 1 sede)
 *
 * Query params opcionales:
 * - from: ISO date string
 * - to:   ISO date string
 *
 * Acceso: SOLO superadmin
 */

const HYPOTHETICAL_COMMISSION_RATE = 0.10;

export async function GET(request) {
    // 1. Seguridad: solo superadmin
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        // Construcción del filtro de fechas (opcional)
        const dateFilter = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);
        const createdAtFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

        // ─── 1. GMV — Gross Merchandise Value (solo pagos aprobados) ──────────
        const gmvResult = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'approved',
                    isDeleted: false,
                    ...createdAtFilter,
                }
            },
            { $group: { _id: null, gmv: { $sum: '$total' } } }
        ]);
        const gmv = gmvResult[0]?.gmv || 0;

        // Proyección hipotética: si la plataforma cobrara 10% por ticket
        const hypotheticalCommission = Math.round(gmv * HYPOTHETICAL_COMMISSION_RATE);

        // ─── 2. Tasa de pago exitoso ──────────────────────────────────────────
        const [approvedCount, rejectedCount] = await Promise.all([
            Order.countDocuments({ paymentStatus: 'approved', isDeleted: false, ...createdAtFilter }),
            Order.countDocuments({ paymentStatus: 'rejected', isDeleted: false, ...createdAtFilter }),
        ]);
        const totalPaymentAttempts = approvedCount + rejectedCount;
        const paymentSuccessRate = totalPaymentAttempts > 0
            ? parseFloat(((approvedCount / totalPaymentAttempts) * 100).toFixed(1))
            : null;

        // ─── 3. Tasa de cancelación ───────────────────────────────────────────
        const [cancelledCount, totalOrders] = await Promise.all([
            Order.countDocuments({ status: 'cancelled', isDeleted: false, ...createdAtFilter }),
            Order.countDocuments({ isDeleted: false, ...createdAtFilter }),
        ]);
        const cancellationRate = totalOrders > 0
            ? parseFloat(((cancelledCount / totalOrders) * 100).toFixed(1))
            : null;

        // ─── 4. Recurrencia de clientes (por teléfono) ───────────────────────
        const recurrenceResult = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'approved',
                    isDeleted: false,
                    ...createdAtFilter,
                }
            },
            {
                $group: {
                    _id: '$customer.phone',
                    orderCount: { $sum: 1 },
                }
            },
            {
                $group: {
                    _id: null,
                    uniqueCustomers: { $sum: 1 },
                    recurringCustomers: {
                        $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] }
                    },
                }
            }
        ]);
        const recurrence = recurrenceResult[0] || { uniqueCustomers: 0, recurringCustomers: 0 };
        const recurrenceRate = recurrence.uniqueCustomers > 0
            ? parseFloat(((recurrence.recurringCustomers / recurrence.uniqueCustomers) * 100).toFixed(1))
            : null;

        // ─── 5. Retención por red (cliente en más de 1 sede) ─────────────────
        const networkRetentionResult = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'approved',
                    isDeleted: false,
                    ...createdAtFilter,
                }
            },
            {
                $group: {
                    _id: '$customer.phone',
                    locations: { $addToSet: '$location.locationId' },
                }
            },
            {
                $match: { 'locations.1': { $exists: true } } // al menos 2 sedes distintas
            },
            { $count: 'count' }
        ]);
        const networkRetentionCount = networkRetentionResult[0]?.count || 0;

        // ─── Respuesta ────────────────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            data: {
                gmv: Math.round(gmv),
                hypotheticalCommission,
                hypotheticalCommissionRate: HYPOTHETICAL_COMMISSION_RATE,
                paymentSuccessRate,
                cancellationRate,
                recurrence: {
                    uniqueCustomers: recurrence.uniqueCustomers,
                    recurringCustomers: recurrence.recurringCustomers,
                    recurrenceRate,
                },
                networkRetention: {
                    customersInMultipleLocations: networkRetentionCount,
                },
            },
        });

    } catch (error) {
        console.error('[SuperAdmin KPIs] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener KPIs' },
            { status: 500 }
        );
    }
}
