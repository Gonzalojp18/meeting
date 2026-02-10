import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Whitelist de emails autorizados como superadmin (desde ENV)
const SUPERADMIN_WHITELIST = process.env.SUPERADMIN_EMAILS?.split(',').map(e => e.trim()) || [];

/**
 * Verifica si un email está en la whitelist de superadmins
 */
function isSuperAdminEmail(email) {
    if (!email) return false;
    return SUPERADMIN_WHITELIST.includes(email.toLowerCase());
}

/**
 * Middleware de seguridad mejorado para SuperAdmin
 * 
 * SEGURIDAD:
 * - No confía solo en el rol de la DB (puede ser manipulado)
 * - Verifica contra whitelist en ENV (SUPERADMIN_EMAILS)
 * - Requiere autenticación válida
 * 
 * Uso:
 * ```
 * const authResult = await requireSuperAdmin(request);
 * if (authResult.error) return authResult.response;
 * ```
 */
export async function requireSuperAdmin(request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            console.warn('[SuperAdmin] Intento de acceso sin sesión');
            return {
                error: 'No autenticado',
                response: NextResponse.json(
                    { success: false, error: 'No autenticado' },
                    { status: 401 }
                )
            };
        }

        const userEmail = session.user.email?.toLowerCase();

        // CRITICAL SECURITY CHECK: Verificar contra whitelist, NO contra DB
        if (!isSuperAdminEmail(userEmail)) {
            console.warn(`[SuperAdmin] Acceso denegado para email no autorizado: ${userEmail}`);
            return {
                error: 'Permisos insuficientes',
                response: NextResponse.json(
                    { success: false, error: 'Acceso denegado' },
                    { status: 403 }
                )
            };
        }

        // Verificación adicional: el rol en DB debe ser admin, manager o superadmin
        const allowedRoles = ['admin', 'manager', 'superadmin'];
        if (!allowedRoles.includes(session.user.role)) {
            console.warn(`[SuperAdmin] Email en whitelist pero rol inválido: ${session.user.role}`);
            return {
                error: 'Rol inválido',
                response: NextResponse.json(
                    { success: false, error: 'Acceso denegado' },
                    { status: 403 }
                )
            };
        }

        console.log(`[SuperAdmin] Acceso autorizado: ${userEmail}`);
        return {
            error: null,
            session
        };
    } catch (error) {
        console.error('[requireSuperAdmin] Error:', error);
        return {
            error: 'Error de autenticación',
            response: NextResponse.json(
                { success: false, error: 'Error de autenticación' },
                { status: 500 }
            )
        };
    }
}

/**
 * Verifica si el usuario actual de la sesión es superadmin
 * (para uso en componentes de servidor)
 */
export async function isSuperAdmin(session) {
    if (!session || !session.user || !session.user.email) {
        return false;
    }
    return isSuperAdminEmail(session.user.email);
}
