import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { auth } from '@/auth';

// @desc Get refund requests (cancelled orders pending refund)
// @route GET /api/admin/refunds
// @access Private (admin, manager)
export async function GET(req) {
    try {
        await dbConnect();
        const session = await auth();

        // Validar permisos
        const ALLOWED_ROLES = ['admin', 'manager'];
        if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
            return NextResponse.json(
                { error: 'No autorizado. Se requiere rol de admin o manager.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);

        // Parámetros de paginación
        const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 25));
        const skip = (page - 1) * limit;

        // Filtros
        const refundStatus = searchParams.get('status'); // pending, processing, completed, failed
        const locationId = searchParams.get('locationId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Construir query
        const query = {
            status: 'cancelled', // Solo pedidos cancelados
        };

        // Filtro de refund status
        if (refundStatus) {
            query['refund.status'] = refundStatus;
        } else {
            // Por defecto mostrar solo los pendientes y en proceso
            query['refund.status'] = { $in: ['pending', 'processing'] };
        }

        // Filtro por ubicación
        if (locationId) {
            query['location.locationId'] = locationId;
        }

        // Filtro por rango de fechas (cancelledAt)
        if (startDate || endDate) {
            query.cancelledAt = {};
            if (startDate) {
                query.cancelledAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.cancelledAt.$lte = end;
            }
        }

        // Ejecutar consultas en paralelo
        const [refunds, totalCount] = await Promise.all([
            Order.find(query)
                .sort({ cancelledAt: -1 }) // Más recientes primero
                .skip(skip)
                .limit(limit)
                .select([
                    'orderNumber',
                    'customer',
                    'items',
                    'location',
                    'total',
                    'createdAt',
                    'cancelledAt',
                    'cancellationReason',
                    'paymentStatus',
                    'mercadoPagoId',
                    'refund'
                ])
                .lean(),
            Order.countDocuments(query)
        ]);

        // Calcular estadísticas resumidas
        const stats = await Order.aggregate([
            { $match: { status: 'cancelled' } },
            {
                $group: {
                    _id: '$refund.status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$total' }
                }
            }
        ]);

        const summary = stats.reduce((acc, stat) => {
            acc[stat._id || 'none'] = {
                count: stat.count,
                totalAmount: stat.totalAmount
            };
            return acc;
        }, {});

        return NextResponse.json({
            refunds,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                limit,
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            },
            summary
        });

    } catch (error) {
        console.error('[REFUNDS API] Error:', error);
        return NextResponse.json(
            { error: 'Error al obtener solicitudes de reembolso' },
            { status: 500 }
        );
    }
}
