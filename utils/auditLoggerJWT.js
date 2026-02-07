import jwt from 'jsonwebtoken';
import { logAudit } from './auditLogger';

/**
 * HELPER PARA AUDIT LOGGING CON JWT
 * 
 * Extrae información del usuario desde el JWT token para usar en audit logging
 * Usado en APIs que no usan NextAuth session sino JWT directamente
 */

/**
 * Extrae y registra una acción de auditoría desde un request con JWT
 * @param {Request} req - Request object de Next.js
 * @param {Object} logData - Datos del log
 * @param {string} logData.action - Acción realizada (CREATE, UPDATE, DELETE)
 * @param {string} logData.entity - Entidad afectada (dish, category, etc)
 * @param {string} [logData.entityId] - ID de la entidad
 * @param {string} [logData.entityName] - Nombre de la entidad
 * @param {string} logData.details - Descripción de la acción
 * @param {Object} [logData.metadata] - Metadatos adicionales
 * @returns {Promise<Object|null>} - El registro creado o null si hay error
 */
export async function logAuditFromJWT(req, logData) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer')) {
            console.warn('[AUDIT] No se pudo registrar: falta token de autorización');
            return null;
        }

        const token = authHeader.split(' ')[1];
        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.warn('[AUDIT] No se pudo registrar: token inválido');
            return null;
        }

        // Extraer información del usuario del token
        const userId = decoded.id || decoded.userId || decoded._id;
        const userName = decoded.name || decoded.userName || 'Usuario';
        const userRole = decoded.role || 'user';

        if (!userId) {
            console.warn('[AUDIT] No se pudo registrar: userId no encontrado en token');
            return null;
        }

        // Registrar en audit log
        return await logAudit({
            userId,
            userName,
            userRole,
            action: logData.action,
            entity: logData.entity,
            entityId: logData.entityId,
            entityName: logData.entityName,
            details: logData.details,
            metadata: logData.metadata || {}
        });
    } catch (error) {
        console.error('[AUDIT ERROR] Error al registrar desde JWT:', error);
        return null;
    }
}

export default logAuditFromJWT;
