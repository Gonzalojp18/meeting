import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AuditLog from '@/models/AuditLog';
import { auth } from '@/auth';

/**
 * API: GET /api/admin/audit-logs
 * 
 * Endpoint exclusivo para administradores.
 * Retorna los registros de auditoría con soporte para filtros y paginación.
 * 
 * Query params:
 * - page: número de página (default: 1)
 * - limit: registros por página (default: 50, max: 100)
 * - userId: filtrar por ID de usuario
 * - action: filtrar por tipo de acción (CREATE, UPDATE, DELETE, etc.)
 * - entity: filtrar por entidad (user, menu, dish, order, etc.)
 * - startDate: fecha de inicio (ISO string)
 * - endDate: fecha de fin (ISO string)
 */

export async function GET(request) {
    try {
        await dbConnect();
        const session = await auth();

        // Solo admin/superadmin puede acceder
        const ALLOWED_ROLES = ['admin', 'superadmin'];
        if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
            return NextResponse.json(
                { error: 'No autorizado. Se requiere rol de administrador.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        // Paginación
        const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 50));
        const skip = (page - 1) * limit;

        // Construir filtros
        const filters = {};

        // Filtro por usuario
        const userId = searchParams.get('userId');
        if (userId) {
            filters['performedBy.userId'] = userId;
        }

        // Filtro por acción
        const action = searchParams.get('action');
        if (action) {
            filters.action = action.toUpperCase();
        }

        // Filtro por entidad
        const entity = searchParams.get('entity');
        if (entity) {
            filters.entity = entity.toLowerCase();
        }

        // Filtro por rango de fechas
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) {
                filters.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Añadir 1 día para incluir todo el día final
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                filters.createdAt.$lt = end;
            }
        }

        // Ejecutar queries en paralelo
        const [logs, totalCount] = await Promise.all([
            AuditLog.find(filters)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(filters)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({
            logs,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('[AUDIT LOGS API] Error:', error);
        return NextResponse.json(
            { error: 'Error al obtener los registros de auditoría' },
            { status: 500 }
        );
    }
}
