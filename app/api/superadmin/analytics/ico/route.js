import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';

/**
 * GET /api/superadmin/analytics/ico
 *
 * Índice de Consistencia Operativa (ICO)
 * Score 0–100 que mide la salud estructural de cada sede.
 *
 * Dimensiones y pesos:
 *   1. Cumplimiento de tiempos     30%  — % órdenes completadas en ≤ 20 min
 *   2. Consistencia (σ tiempos)    25%  — inverso de la desviación estándar de prep times
 *   3. Baja tasa de cancelación    20%  — (1 - tasaCancelación) × 100
 *   4. Actividad sostenida         15%  — días activos / días del período
 *   5. Estabilidad horaria         10%  — inverso del coeficiente de variación horario
 *
 * Umbral estadístico: mínimo 30 órdenes con timestamps para calcular score.
 * Con menos datos, retorna { hasEnoughData: false, samplesNeeded: N }.
 *
 * Acceso: solo superadmin (requireSuperAdmin middleware).
 */
export async function GET(request) {
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        // Período por defecto: últimos 30 días
        const endDate = to ? new Date(to) : new Date();
        const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Días totales del período (para actividad sostenida)
        const totalDays = Math.max(
            1,
            Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))
        );

        // ─── 1. Base de órdenes no eliminadas del período ─────────────────────
        const baseMatch = {
            isDeleted: false,
            createdAt: { $gte: startDate, $lte: endDate },
        };

        // ─── 2. Datos de preparación por sede (para dimensiones 1, 2) ─────────
        const prepData = await Order.aggregate([
            {
                $match: {
                    ...baseMatch,
                    confirmedAt: { $exists: true, $ne: null },
                    readyAt: { $exists: true, $ne: null },
                    status: { $in: ['completed', 'ready'] },
                }
            },
            {
                $project: {
                    locationId: '$location.locationId',
                    locationName: '$location.locationName',
                    prepMinutes: {
                        $divide: [{ $subtract: ['$readyAt', '$confirmedAt'] }, 60000]
                    },
                }
            },
            {
                $group: {
                    _id: '$locationId',
                    locationName: { $first: '$locationName' },
                    prepTimes: { $push: '$prepMinutes' },
                    count: { $sum: 1 },
                    avgPrep: { $avg: '$prepMinutes' },
                }
            }
        ]);

        // ─── 3. Órdenes totales, canceladas y días activos por sede ──────────
        const activityData = await Order.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: '$location.locationId',
                    locationName: { $first: '$location.locationName' },
                    total: { $sum: 1 },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    },
                    activeDays: {
                        $addToSet: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt',
                                timezone: 'America/Argentina/Buenos_Aires'
                            }
                        }
                    },
                    hourBuckets: {
                        $push: {
                            $hour: { date: '$createdAt', timezone: 'America/Argentina/Buenos_Aires' }
                        }
                    }
                }
            }
        ]);

        // ─── 4. Combinar y calcular ICO por sede ──────────────────────────────

        // Mapas para acceso rápido
        const prepMap = new Map(prepData.map(d => [d._id, d]));
        const activityMap = new Map(activityData.map(d => [d._id, d]));

        // Unión de todas las sedes
        const allLocationIds = new Set([
            ...prepMap.keys(),
            ...activityMap.keys(),
        ]);

        const MIN_SAMPLES = 30; // Umbral estadístico mínimo

        const locations = Array.from(allLocationIds).map(locationId => {
            const prep = prepMap.get(locationId);
            const activity = activityMap.get(locationId);
            const name = prep?.locationName || activity?.locationName || locationId;

            const totalOrders = activity?.total || 0;
            const cancelledCount = activity?.cancelled || 0;
            const activeDays = activity?.activeDays?.length || 0;
            const hourBuckets = activity?.hourBuckets || [];
            const prepTimes = prep?.prepTimes || [];
            const sampleCount = prep?.count || 0;

            // ── ¿Hay suficientes datos? ──────────────────────────────────────
            if (sampleCount < MIN_SAMPLES) {
                return {
                    locationId,
                    locationName: name,
                    hasEnoughData: false,
                    samplesCollected: sampleCount,
                    samplesNeeded: MIN_SAMPLES - sampleCount,
                    totalOrders,
                };
            }

            // ─── Dimensión 1: Cumplimiento de tiempos (30%) ───────────────────
            // % de órdenes completadas en ≤ 20 minutos
            const TARGET_MINUTES = 20;
            const onTimeCount = prepTimes.filter(t => t <= TARGET_MINUTES).length;
            const d1_compliance = (onTimeCount / sampleCount) * 100;

            // ─── Dimensión 2: Consistencia / σ (25%) ──────────────────────────
            // Desviación estándar de los tiempos — menos σ = más consistente
            const mean = prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length;
            const variance = prepTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prepTimes.length;
            const stdDev = Math.sqrt(variance);
            // Normalizar: σ=0 → 100 pts; σ=10min → 0 pts (penalidad lineal)
            const SIGMA_MAX = 10;
            const d2_consistency = Math.max(0, 100 - (stdDev / SIGMA_MAX) * 100);

            // ─── Dimensión 3: Tasa de cancelación (20%) ───────────────────────
            const cancellationRate = totalOrders > 0 ? cancelledCount / totalOrders : 0;
            const d3_cancellation = (1 - cancellationRate) * 100;

            // ─── Dimensión 4: Actividad sostenida (15%) ───────────────────────
            const d4_activity = Math.min(100, (activeDays / totalDays) * 100);

            // ─── Dimensión 5: Estabilidad horaria (10%) ───────────────────────
            // Coeficiente de variación (CV) de la distribución horaria
            // CV bajo → distribución predecible → score alto
            const hourCounts = new Array(24).fill(0);
            hourBuckets.forEach(h => { if (h >= 0 && h < 24) hourCounts[h]++; });
            const activeHours = hourCounts.filter(c => c > 0);
            const hourMean = activeHours.length > 0
                ? activeHours.reduce((a, b) => a + b, 0) / activeHours.length
                : 0;
            const hourVariance = activeHours.length > 1
                ? activeHours.reduce((a, b) => a + Math.pow(b - hourMean, 2), 0) / activeHours.length
                : 0;
            const hourStdDev = Math.sqrt(hourVariance);
            const cv = hourMean > 0 ? (hourStdDev / hourMean) : 1;
            // CV = 1 → score 0, CV = 0 → score 100. Normalizar entre 0 y 1.
            const d5_hourStability = Math.max(0, (1 - Math.min(cv, 1)) * 100);

            // ─── Score final ponderado ─────────────────────────────────────────
            const score = Math.round(
                d1_compliance * 0.30 +
                d2_consistency * 0.25 +
                d3_cancellation * 0.20 +
                d4_activity * 0.15 +
                d5_hourStability * 0.10
            );

            // ─── Estado cualitativo ───────────────────────────────────────────
            let status, statusColor;
            if (score >= 91) { status = 'Alta consistencia operativa'; statusColor = 'emerald'; }
            else if (score >= 76) { status = 'Operación estable'; statusColor = 'blue'; }
            else if (score >= 51) { status = 'Operación en consolidación'; statusColor = 'amber'; }
            else { status = 'Ajustes necesarios'; statusColor = 'red'; }

            return {
                locationId,
                locationName: name,
                hasEnoughData: true,
                score,
                status,
                statusColor,
                totalOrders,
                sampleCount,
                dimensions: {
                    compliance: { score: Math.round(d1_compliance), label: 'Cumplimiento de tiempos', weight: 30, detail: `${onTimeCount} de ${sampleCount} órdenes ≤ ${TARGET_MINUTES} min` },
                    consistency: { score: Math.round(d2_consistency), label: 'Consistencia de tiempos', weight: 25, detail: `σ = ${stdDev.toFixed(1)} min · Promedio: ${mean.toFixed(1)} min` },
                    cancellation: { score: Math.round(d3_cancellation), label: 'Control de cancelaciones', weight: 20, detail: `${cancelledCount} cancelaciones de ${totalOrders} órdenes` },
                    activity: { score: Math.round(d4_activity), label: 'Actividad sostenida', weight: 15, detail: `${activeDays} días activos de ${totalDays} en el período` },
                    hourStability: { score: Math.round(d5_hourStability), label: 'Estabilidad horaria', weight: 10, detail: `CV horario: ${(cv * 100).toFixed(0)}%` },
                },
            };
        });

        // Ordenar: primero los que tienen score, después los sin datos suficientes
        locations.sort((a, b) => {
            if (a.hasEnoughData && !b.hasEnoughData) return -1;
            if (!a.hasEnoughData && b.hasEnoughData) return 1;
            return (b.score || 0) - (a.score || 0);
        });

        // ─── ICO global de la plataforma (promedio ponderado por órdenes) ─────
        const locationsWithScore = locations.filter(l => l.hasEnoughData);
        let platformICO = null;
        if (locationsWithScore.length > 0) {
            const totalSamples = locationsWithScore.reduce((a, l) => a + l.sampleCount, 0);
            const weightedScore = locationsWithScore.reduce(
                (a, l) => a + l.score * l.sampleCount, 0
            );
            const platformScore = Math.round(weightedScore / totalSamples);
            let platformStatus, platformColor;
            if (platformScore >= 91) { platformStatus = 'Alta consistencia operativa'; platformColor = 'emerald'; }
            else if (platformScore >= 76) { platformStatus = 'Operación estable'; platformColor = 'blue'; }
            else if (platformScore >= 51) { platformStatus = 'Operación en consolidación'; platformColor = 'amber'; }
            else { platformStatus = 'Ajustes necesarios'; platformColor = 'red'; }

            platformICO = {
                score: platformScore,
                status: platformStatus,
                statusColor: platformColor,
                locationsEvaluated: locationsWithScore.length,
                locationsPending: locations.length - locationsWithScore.length,
            };
        }

        return NextResponse.json({
            success: true,
            data: {
                period: {
                    from: startDate.toISOString(),
                    to: endDate.toISOString(),
                    totalDays,
                },
                platformICO,
                locations,
                minSamplesRequired: MIN_SAMPLES,
            }
        });

    } catch (error) {
        console.error('[ICO] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al calcular el ICO' },
            { status: 500 }
        );
    }
}
