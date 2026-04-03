import mongoose from 'mongoose';

/**
 * AUDIT LOG MODEL
 * 
 * Modelo para registrar actividades de usuarios en el sistema.
 * Solo lectura - no se deben modificar ni eliminar registros.
 * Acceso exclusivo para administradores.
 */

const auditLogSchema = new mongoose.Schema(
    {
        // Usuario que realizó la acción
        performedBy: {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: false // Opcional para eventos del sistema
            },
            userName: {
                type: String,
                required: true
            },
            userRole: {
                type: String,
                enum: ['admin', 'manager', 'staff', 'user', 'system'], // Añadido 'system'
                required: true
            }
        },

        // Tipo de acción realizada
        action: {
            type: String,
            enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE'],
            required: true
        },

        // Entidad/recurso afectado
        entity: {
            type: String,
            enum: ['user', 'menu', 'dish', 'category', 'order', 'settings', 'printer', 'session'],
            required: true
        },

        // ID del recurso afectado (opcional para algunas acciones como LOGIN)
        entityId: {
            type: String,
            default: null
        },

        // Nombre/identificador legible del recurso
        entityName: {
            type: String,
            default: null
        },

        // Descripción detallada de la acción
        details: {
            type: String,
            required: true
        },

        // Metadatos adicionales (IP, user agent, datos anteriores, etc.)
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Solo createdAt, no se editan
        collection: 'audit_logs'
    }
);

// Índices para búsquedas eficientes
auditLogSchema.index({ createdAt: -1 }); // Ordenar por fecha descendente
auditLogSchema.index({ 'performedBy.userId': 1, createdAt: -1 }); // Por usuario
auditLogSchema.index({ action: 1, createdAt: -1 }); // Por tipo de acción
auditLogSchema.index({ entity: 1, createdAt: -1 }); // Por entidad
auditLogSchema.index({ entityId: 1 }); // Por ID de recurso

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
