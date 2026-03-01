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

        // Filtro por usuario — validar ObjectId para prevenir NoSQL injection
        const userId = searchParams.get('userId');
        if (userId) {
            if (!/^[a-f\d]{24}$/i.test(userId)) {
                return NextResponse.json({ error: 'userId inválido' }, { status: 400 });
            }
            filters['performedBy.userId'] = userId;
        }

        // Filtro por acción — solo letras mayúsculas y guión bajo
        const VALID_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'REFUND', 'PRINT', 'CANCEL', 'RESTORE', 'EXPORT'];
        const action = searchParams.get('action');
        if (action) {
            const normalizedAction = action.toUpperCase().replace(/[^A-Z_]/g, '');
            if (!VALID_ACTIONS.includes(normalizedAction)) {
                return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
            }
            filters.action = normalizedAction;
        }

        // Filtro por entidad — solo letras minúsculas
        const entity = searchParams.get('entity');
        if (entity) {
            const sanitizedEntity = entity.toLowerCase().replace(/[^a-z_]/g, '');
            if (!sanitizedEntity || sanitizedEntity.length > 30) {
                return NextResponse.json({ error: 'Entidad inválida' }, { status: 400 });
            }
            filters.entity = sanitizedEntity;
        }

        // Filtro por rango de fechas — validar que sean fechas reales
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) {
                const parsedStart = new Date(startDate);
                if (isNaN(parsedStart.getTime())) {
                    return NextResponse.json({ error: 'startDate inválida' }, { status: 400 });
                }
                filters.createdAt.$gte = parsedStart;
            }
            if (endDate) {
                const end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    return NextResponse.json({ error: 'endDate inválida' }, { status: 400 });
                }
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
