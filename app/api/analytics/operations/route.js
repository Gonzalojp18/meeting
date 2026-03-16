import { NextResponse } from 'next/server';
import { requireAdmin } from '@/middleware/admin';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';

/**
 * GET /api/analytics/operations
 *
 * KPIs operacionales accesibles por admin y superadmin:
 * - Órdenes agrupadas por hora del día (heatmap de horas pico)
 * - Tiempo promedio de preparación por sede (readyAt - confirmedAt)
 * - Tiempo de espera del cliente para retiro (deliveredAt - readyAt)
 * - Tiempo de ciclo completo del pedido (completedAt - createdAt)
 *
 * Comportamiento según rol:
 * - superadmin → datos de TODAS las sedes
 * - admin/manager → datos filtrados por sus locationIds asignados
 *
 * Query params opcionales:
 * - from: ISO date string
 * - to:   ISO date string
 *
 * Acceso: admin, manager, superadmin
 */
export async function GET(request) {
    // 1. Seguridad: admin o superior
    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.response;

    const { session } = authResult;

    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        // Filtro de fechas
        const dateFilter = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);
        const createdAtFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

        // Filtro por sede: superadmin ve todo, admin/manager ve solo sus sedes asignadas
        const isSuperAdmin = session.user.role === 'superadmin';
        const locationFilter = (!isSuperAdmin && session.user.assignedLocations?.length)
            ? { 'location.locationId': { $in: session.user.assignedLocations } }
            : {};

        const baseMatch = {
            status: { $in: ['completed', 'delivered', 'ready', 'preparing', 'confirmed'] },
            isDeleted: false,
            ...createdAtFilter,
            ...locationFilter,
        };

        // ─── 1. Órdenes por hora del día ──────────────────────────────────────
        const ordersByHourResult = await Order.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: { $hour: { date: '$createdAt', timezone: 'America/Argentina/Buenos_Aires' } },
                    count: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Normalizar: asegurar las 24 horas, aunque alguna tenga 0 órdenes
        const hourMap = new Map(ordersByHourResult.map(h => [h._id, h.count]));
        const ordersByHour = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            count: hourMap.get(hour) || 0,
        }));

        // ─── 2. Tiempo promedio de preparación ───────────────────────────────
        // Solo órdenes que llegaron al estado "ready" (tienen ambos timestamps)
        const prepTimeResult = await Order.aggregate([
            {
                $match: {
                    ...baseMatch,
                    confirmedAt: { $exists: true, $ne: null },
                    readyAt: { $exists: true, $ne: null },
                }
            },
            {
                $project: {
                    locationId: '$location.locationId',
                    locationName: '$location.locationName',
                    prepMinutes: {
                        $divide: [
                            { $subtract: ['$readyAt', '$confirmedAt'] },
                            60000
                        ]
                    },
                }
            },
            {
                $group: {
                    _id: '$locationId',
                    locationName: { $first: '$locationName' },
                    avgPrepMinutes: { $avg: '$prepMinutes' },
                    sampleCount: { $sum: 1 },
                }
            },
            { $sort: { avgPrepMinutes: -1 } }
        ]);

        const avgPreparationByLocation = prepTimeResult.map(loc => ({
            locationId: loc._id,
            locationName: loc.locationName,
            avgMinutes: parseFloat(loc.avgPrepMinutes.toFixed(1)),
            sampleCount: loc.sampleCount,
        }));

        const platformAvgMinutes = avgPreparationByLocation.length > 0
            ? parseFloat(
                (avgPreparationByLocation.reduce((acc, l) => acc + l.avgMinutes, 0) /
                    avgPreparationByLocation.length).toFixed(1)
            )
            : null;

        // ─── 3. Tiempo de espera del cliente (Pickup Wait) ────────────────────
        // deliveredAt - readyAt: cuánto tarda el cliente en retirar después de que está listo
        const pickupWaitResult = await Order.aggregate([
            {
                $match: {
                    ...baseMatch,
                    readyAt: { $exists: true, $ne: null },
                    deliveredAt: { $exists: true, $ne: null },
                }
            },
            {
                $project: {
                    locationId: '$location.locationId',
                    locationName: '$location.locationName',
                    waitMinutes: {
                        $divide: [
                            { $subtract: ['$deliveredAt', '$readyAt'] },
                            60000
                        ]
                    },
                }
            },
            {
                $group: {
                    _id: '$locationId',
                    locationName: { $first: '$locationName' },
                    avgWaitMinutes: { $avg: '$waitMinutes' },
                    sampleCount: { $sum: 1 },
                }
            },
            { $sort: { avgWaitMinutes: -1 } }
        ]);

        const pickupWaitByLocation = pickupWaitResult.map(loc => ({
            locationId: loc._id,
            locationName: loc.locationName,
            avgMinutes: parseFloat(loc.avgWaitMinutes.toFixed(1)),
            sampleCount: loc.sampleCount,
        }));

        const pickupWaitPlatformAvg = pickupWaitByLocation.length > 0
            ? parseFloat(
                (pickupWaitByLocation.reduce((acc, l) => acc + l.avgMinutes, 0) /
                    pickupWaitByLocation.length).toFixed(1)
            )
            : null;

        // ─── 4. Ciclo completo del pedido (Full Cycle) ────────────────────────
        // completedAt - createdAt: tiempo total desde que entró el pedido hasta cierre
        const fullCycleResult = await Order.aggregate([
            {
                $match: {
                    ...baseMatch,
                    status: 'completed',
                    completedAt: { $exists: true, $ne: null },
                }
            },
            {
                $project: {
                    locationId: '$location.locationId',
                    locationName: '$location.locationName',
                    cycleMinutes: {
                        $divide: [
                            { $subtract: ['$completedAt', '$createdAt'] },
                            60000
                        ]
                    },
                }
            },
            {
                $group: {
                    _id: '$locationId',
                    locationName: { $first: '$locationName' },
                    avgCycleMinutes: { $avg: '$cycleMinutes' },
                    sampleCount: { $sum: 1 },
                }
            },
            { $sort: { avgCycleMinutes: -1 } }
        ]);

        const fullCycleByLocation = fullCycleResult.map(loc => ({
            locationId: loc._id,
            locationName: loc.locationName,
            avgMinutes: parseFloat(loc.avgCycleMinutes.toFixed(1)),
            sampleCount: loc.sampleCount,
        }));

        const fullCyclePlatformAvg = fullCycleByLocation.length > 0
            ? parseFloat(
                (fullCycleByLocation.reduce((acc, l) => acc + l.avgMinutes, 0) /
                    fullCycleByLocation.length).toFixed(1)
            )
            : null;

        // ─── Respuesta ────────────────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            data: {
                ordersByHour,
                avgPreparation: {
                    platformAvgMinutes,
                    byLocation: avgPreparationByLocation,
                },
                pickupWait: {
                    platformAvgMinutes: pickupWaitPlatformAvg,
                    byLocation: pickupWaitByLocation,
                },
                fullCycle: {
                    platformAvgMinutes: fullCyclePlatformAvg,
                    byLocation: fullCycleByLocation,
                },
            },
        });

    } catch (error) {
        console.error('[Analytics Operations] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener métricas operacionales' },
            { status: 500 }
        );
    }
}
