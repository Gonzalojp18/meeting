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
            status: { $in: ['completed', 'ready', 'preparing', 'confirmed'] },
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
                    // diferencia en minutos (con redondeo a 1 decimal)
                    prepMinutes: {
                        $divide: [
                            { $subtract: ['$readyAt', '$confirmedAt'] },
                            60000 // ms → minutos
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

        // Promedio global de la plataforma
        const platformAvgMinutes = avgPreparationByLocation.length > 0
            ? parseFloat(
                (avgPreparationByLocation.reduce((acc, l) => acc + l.avgMinutes, 0) /
                    avgPreparationByLocation.length).toFixed(1)
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
