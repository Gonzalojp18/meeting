import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * Middleware de seguridad para rutas accesibles por Admin o Superadmin.
 *
 * SEGURIDAD:
 * - Requiere sesión válida
 * - Permite acceso a roles: 'admin', 'manager', 'superadmin'
 * - Retorna la sesión para que el handler pueda filtrar por locationId si es admin
 *
 * Uso:
 * ```
 * const authResult = await requireAdmin(request);
 * if (authResult.error) return authResult.response;
 * const { session } = authResult;
 * ```
 */
const ALLOWED_ROLES = new Set(['admin', 'manager', 'superadmin']);

export async function requireAdmin(request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            console.warn('[requireAdmin] Intento de acceso sin sesión');
            return {
                error: 'No autenticado',
                response: NextResponse.json(
                    { success: false, error: 'No autenticado' },
                    { status: 401 }
                )
            };
        }

        if (!ALLOWED_ROLES.has(session.user.role)) {
            console.warn(`[requireAdmin] Acceso denegado para rol: ${session.user.role} (email: ${session.user.email})`);
            return {
                error: 'Permisos insuficientes',
                response: NextResponse.json(
                    { success: false, error: 'Acceso denegado' },
                    { status: 403 }
                )
            };
        }

        return {
            error: null,
            session
        };
    } catch (error) {
        console.error('[requireAdmin] Error:', error);
        return {
            error: 'Error de autenticación',
            response: NextResponse.json(
                { success: false, error: 'Error de autenticación' },
                { status: 500 }
            )
        };
    }
}
