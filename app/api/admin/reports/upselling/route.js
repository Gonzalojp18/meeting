import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { requireAdminOrManager } from '@/utils/authHelper';
import mongoose from 'mongoose';

/**
 * GET /api/admin/reports/upselling
 *
 * Métricas reales de upselling basadas exclusivamente en órdenes pagadas.
 * No usa clicks, impresiones ni datos del carrito. Solo ventas cerradas.
 *
 * Query params:
 * - startDate: ISO string (opcional, default: 30 días atrás)
 * - endDate: ISO string (opcional, default: ahora)
 *
 * Métricas retornadas:
 * A) Ingresos totales generados por upselling
 * B) Pedidos con upselling (cantidad y porcentaje)
 * C) Incremento promedio por pedido con upselling
 * D) Ticket promedio SIN upselling
 * E) Ticket promedio CON upselling
 * F) Top 5 upsells por ingresos generados
 */
export async function GET(req) {
    // Auth: solo admin o manager
    const authResult = await requireAdminOrManager(req);
    if (!authResult.authorized) {
        return NextResponse.json({ error: authResult.error || 'No autorizado' }, { status: 401 });
    }

    try {
        await dbConnect();

        const url = new URL(req.url);
        const startDateParam = url.searchParams.get('startDate');
        const endDateParam = url.searchParams.get('endDate');

        // Defaults: últimos 30 días
        const endDate = endDateParam ? new Date(endDateParam) : new Date();
        const startDate = startDateParam
            ? new Date(startDateParam)
            : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Filtro base: órdenes pagadas, no canceladas, dentro del rango
        const baseMatch = {
            paymentStatus: 'approved',
            status: { $nin: ['cancelled'] },
            canBeCounted: true,
            isDeleted: { $ne: true },
            createdAt: { $gte: startDate, $lte: endDate }
        };

        // Pipeline 1: Métricas generales (un solo aggregate eficiente)
        const [metrics] = await Order.aggregate([
            { $match: baseMatch },
            {
                $facet: {
                    // Total de órdenes pagadas en el rango
                    totalOrders: [
                        { $count: 'count' }
                    ],

                    // Órdenes CON al menos un item upsell
                    ordersWithUpsell: [
                        { $match: { 'items.origin': 'upsell' } },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                totalRevenue: { $sum: '$total' }
                            }
                        }
                    ],

                    // Órdenes SIN ningún item upsell
                    ordersWithoutUpsell: [
                        {
                            $match: {
                                $nor: [{ 'items.origin': 'upsell' }]
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                totalRevenue: { $sum: '$total' }
                            }
                        }
                    ],

                    // Ingresos generados por items de upselling
                    upsellRevenue: [
                        { $unwind: '$items' },
                        { $match: { 'items.origin': 'upsell' } },
                        {
                            $group: {
                                _id: null,
                                totalUpsellRevenue: {
                                    $sum: { $multiply: ['$items.price', '$items.quantity'] }
                                },
                                totalUpsellItems: { $sum: '$items.quantity' }
                            }
                        }
                    ],

                    // Top 5 upsells por ingresos
                    topUpsells: [
                        { $unwind: '$items' },
                        { $match: { 'items.origin': 'upsell', 'items.upsellId': { $ne: null } } },
                        {
                            $group: {
                                _id: '$items.upsellId',
                                itemName: { $first: '$items.name' },
                                totalRevenue: {
                                    $sum: { $multiply: ['$items.price', '$items.quantity'] }
                                },
                                totalQuantity: { $sum: '$items.quantity' },
                                orderCount: { $addToSet: '$_id' }
                            }
                        },
                        {
                            $addFields: {
                                orderCount: { $size: '$orderCount' }
                            }
                        },
                        { $sort: { totalRevenue: -1 } },
                        { $limit: 5 }
                    ]
                }
            }
        ]);

        // Extraer resultados con defaults seguros (nunca null)
        const totalOrders = metrics.totalOrders[0]?.count || 0;

        const withUpsell = metrics.ordersWithUpsell[0] || { count: 0, totalRevenue: 0 };
        const withoutUpsell = metrics.ordersWithoutUpsell[0] || { count: 0, totalRevenue: 0 };
        const upsellRev = metrics.upsellRevenue[0] || { totalUpsellRevenue: 0, totalUpsellItems: 0 };

        // A) Ingresos generados por upselling
        const upsellTotalRevenue = upsellRev.totalUpsellRevenue;

        // B) Pedidos con upselling
        const ordersWithUpsellCount = withUpsell.count;
        const ordersWithUpsellPercent = totalOrders > 0
            ? Math.round((ordersWithUpsellCount / totalOrders) * 10000) / 100
            : 0;

        // C) Incremento promedio por pedido con upselling
        const avgUpsellIncrement = ordersWithUpsellCount > 0
            ? Math.round(upsellTotalRevenue / ordersWithUpsellCount)
            : 0;

        // D) Ticket promedio SIN upselling
        const avgTicketWithout = withoutUpsell.count > 0
            ? Math.round(withoutUpsell.totalRevenue / withoutUpsell.count)
            : 0;

        // E) Ticket promedio CON upselling
        const avgTicketWith = withUpsell.count > 0
            ? Math.round(withUpsell.totalRevenue / withUpsell.count)
            : 0;

        // F) Top 5 upsells — enriquecer con nombre del upselling
        let topUpsells = metrics.topUpsells.map(u => ({
            upsellId: u._id,
            itemName: u.itemName,
            totalRevenue: u.totalRevenue,
            totalQuantity: u.totalQuantity,
            orderCount: u.orderCount
        }));

        // Intentar enriquecer con nombre del upselling desde la colección
        try {
            const Upselling = mongoose.models.Upselling || (await import('@/models/Upselling')).default;
            const upsellIds = topUpsells.map(u => u.upsellId).filter(Boolean);
            if (upsellIds.length > 0) {
                const upsellDocs = await Upselling.find(
                    { _id: { $in: upsellIds } },
                    { name: 1, type: 1, copyText: 1 }
                ).lean();
                const upsellMap = {};
                for (const doc of upsellDocs) {
                    upsellMap[doc._id.toString()] = doc;
                }
                topUpsells = topUpsells.map(u => ({
                    ...u,
                    upsellName: upsellMap[u.upsellId?.toString()]?.name || null,
                    upsellType: upsellMap[u.upsellId?.toString()]?.type || null,
                    copyText: upsellMap[u.upsellId?.toString()]?.copyText || null,
                }));
            }
        } catch {
            // Si falla el enriquecimiento, retornar sin nombres
        }

        return NextResponse.json({
            success: true,
            dateRange: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            },
            metrics: {
                // A) Ingresos por upselling
                upsellTotalRevenue,
                upsellTotalItems: upsellRev.totalUpsellItems,

                // B) Pedidos con upselling
                totalOrders,
                ordersWithUpsell: ordersWithUpsellCount,
                ordersWithUpsellPercent,

                // C) Incremento promedio
                avgUpsellIncrement,

                // D) Ticket promedio sin upsell
                avgTicketWithoutUpsell: avgTicketWithout,

                // E) Ticket promedio con upsell
                avgTicketWithUpsell: avgTicketWith,

                // Diferencia de tickets
                ticketDifference: avgTicketWith - avgTicketWithout,

                // F) Top 5 upsells
                topUpsells
            }
        });

    } catch (error) {
        console.error('GET /api/admin/reports/upselling error:', error);
        return NextResponse.json(
            { error: 'Error al obtener métricas de upselling' },
            { status: 500 }
        );
    }
}
