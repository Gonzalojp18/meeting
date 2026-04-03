import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { validateApiKey } from '@/lib/auth/api-key';

export async function GET(req) {
    try {
        // Validación de Seguridad usando nuestro nuevo middleware
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        let startDateStr = searchParams.get('startDate');
        let endDateStr = searchParams.get('endDate');
        let period = searchParams.get('period'); // today, week, month

        let targetDateStart = new Date();
        let targetDateEnd = new Date();
        targetDateStart.setHours(0, 0, 0, 0);
        targetDateEnd.setHours(23, 59, 59, 999);

        if (period === 'week') {
            const day = targetDateStart.getDay();
            const diff = targetDateStart.getDate() - day + (day === 0 ? -6 : 1);
            targetDateStart.setDate(diff);
        } else if (period === 'month') {
            targetDateStart.setDate(1);
        } else if (startDateStr) {
            targetDateStart = new Date(startDateStr);
            targetDateStart.setHours(0, 0, 0, 0);
        }

        if (endDateStr) {
            targetDateEnd = new Date(endDateStr);
            targetDateEnd.setHours(23, 59, 59, 999);
        }

        const matchQuery = {
            createdAt: { $gte: targetDateStart, $lte: targetDateEnd },
            canBeCounted: true,
            status: { $nin: ['cancelled'] }
        };

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
            { $limit: 3 } // Solo los 3 mejores para no saturar Telegram
        ]);

        const summary = generalStats[0] || { totalRevenue: 0, orderCount: 0, avgTicket: 0 };

        return NextResponse.json({
            dateRange: { start: targetDateStart, end: targetDateEnd },
            summary: {
                totalRevenue: summary.totalRevenue,
                orderCount: summary.orderCount,
                avgTicket: summary.avgTicket
            },
            topDishes
        });
    } catch (error) {
        console.error('Error in n8n metrics API:', error);
        return NextResponse.json({ error: 'Error al generar métricas' }, { status: 500 });
    }
}
