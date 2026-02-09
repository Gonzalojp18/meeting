import { auth } from '@/auth';
import { getToken } from 'next-auth/jwt';

/**
 * Helper de autenticación para API routes.
 * 
 * Intenta obtener el token/sesión de múltiples formas para máxima compatibilidad.
 * 
 * @param {Request} request - El request de Next.js
 * @returns {Object|null} - Token con id, role, etc. o null si no autenticado
 */
export async function getAuthToken(request) {
    // Método 1: Usar auth() de NextAuth v5 (Auth.js)
    try {
        const session = await auth();
        if (session?.user) {
            console.log('[getAuthToken] Got session via auth():', session.user.role);
            return {
                id: session.user.id,
                role: session.user.role,
                token: session.user.token,
                assignedLocations: session.user.assignedLocations
            };
        }
    } catch (e) {
        console.log('[getAuthToken] auth() failed:', e.message);
    }

    // Método 2: getToken con AUTH_SECRET
    try {
        const token = await getToken({
            req: request,
            secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
        });
        if (token?.role) {
            console.log('[getAuthToken] Got token via getToken:', token.role);
            return token;
        }
    } catch (e) {
        console.log('[getAuthToken] getToken failed:', e.message);
    }

    // Método 3: Intentar con cookie name explícito para Auth.js v5
    try {
        const token = await getToken({
            req: request,
            secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
            cookieName: process.env.NODE_ENV === 'production'
                ? '__Secure-authjs.session-token'
                : 'authjs.session-token'
        });
        if (token?.role) {
            console.log('[getAuthToken] Got token via getToken with explicit cookie:', token.role);
            return token;
        }
    } catch (e) {
        console.log('[getAuthToken] getToken with cookie name failed:', e.message);
    }

    console.log('[getAuthToken] No valid authentication found');
    return null;
}

/**
 * Verifica si el usuario tiene rol admin o manager.
 * 
 * @param {Request} request - El request de Next.js
 * @returns {Object} - { authorized: boolean, token: Object|null, error?: string }
 */
export async function requireAdminOrManager(request) {
    const token = await getAuthToken(request);

    if (!token) {
        return { authorized: false, token: null, error: 'No autorizado' };
    }

    if (token.role !== 'admin' && token.role !== 'manager') {
        return { authorized: false, token, error: 'Permisos insuficientes' };
    }

    return { authorized: true, token };
}
