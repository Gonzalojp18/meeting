import dbConnect from './dbConnect';
import AuditLog from '@/models/AuditLog';

/**
 * AUDIT LOGGER UTILITY
 * 
 * Helper para registrar acciones de usuarios en el sistema.
 * Uso:
 * 
 * await logAudit({
 *     userId: session.user.id,
 *     userName: session.user.name,
 *     userRole: session.user.role,
 *     action: 'CREATE',
 *     entity: 'user',
 *     entityId: newUser._id.toString(),
 *     entityName: newUser.name,
 *     details: 'Creó usuario "John Doe" con rol staff'
 * });
 */

/**
 * Registra una acción en el audit log
 * @param {Object} params - Parámetros del log
 * @param {string} params.userId - ID del usuario que realiza la acción
 * @param {string} params.userName - Nombre del usuario
 * @param {string} params.userRole - Rol del usuario (admin, manager, staff, user)
 * @param {string} params.action - Tipo de acción (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, STATUS_CHANGE)
 * @param {string} params.entity - Entidad afectada (user, menu, dish, category, order, settings, printer, session)
 * @param {string} [params.entityId] - ID de la entidad afectada
 * @param {string} [params.entityName] - Nombre legible de la entidad
 * @param {string} params.details - Descripción detallada de la acción
 * @param {Object} [params.metadata] - Metadatos adicionales (IP, cambios anteriores, etc.)
 * @returns {Promise<Object|null>} - El registro creado o null si hay error
 */
export async function logAudit({
    userId,
    userName,
    userRole,
    action,
    entity,
    entityId = null,
    entityName = null,
    details,
    metadata = {}
}) {
    try {
        await dbConnect();

        const auditEntry = await AuditLog.create({
            performedBy: {
                userId,
                userName,
                userRole
            },
            action,
            entity,
            entityId,
            entityName,
            details,
            metadata
        });

        // Log para debugging en desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AUDIT] ${userRole} "${userName}" - ${action} ${entity}: ${details}`);
        }

        return auditEntry;
    } catch (error) {
        // No lanzar error para no interrumpir operaciones principales
        console.error('[AUDIT ERROR] Error al registrar audit log:', error);
        return null;
    }
}

/**
 * Helpers para acciones comunes
 */

export async function logUserCreated(session, newUser) {
    return logAudit({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: 'CREATE',
        entity: 'user',
        entityId: newUser._id?.toString(),
        entityName: newUser.name,
        details: `Creó usuario "${newUser.name}" con rol ${newUser.role}`
    });
}

export async function logUserUpdated(session, user, changes) {
    return logAudit({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: 'UPDATE',
        entity: 'user',
        entityId: user._id?.toString(),
        entityName: user.name,
        details: `Actualizó usuario "${user.name}"`,
        metadata: { changes }
    });
}

export async function logUserDeleted(session, user) {
    return logAudit({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: 'DELETE',
        entity: 'user',
        entityId: user._id?.toString(),
        entityName: user.name,
        details: `Eliminó usuario "${user.name}" (${user.email})`
    });
}

export async function logLogin(user) {
    return logAudit({
        userId: user.id || user._id?.toString(),
        userName: user.name,
        userRole: user.role,
        action: 'LOGIN',
        entity: 'session',
        details: `Inició sesión`
    });
}

export async function logOrderStatusChange(session, order, oldStatus, newStatus) {
    return logAudit({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: 'STATUS_CHANGE',
        entity: 'order',
        entityId: order._id?.toString() || order.orderNumber,
        entityName: `Pedido #${order.orderNumber}`,
        details: `Cambió estado de "${oldStatus}" a "${newStatus}"`,
        metadata: { oldStatus, newStatus }
    });
}

export default logAudit;
