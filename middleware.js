import { NextResponse } from 'next/server';
import { auth } from './auth';

/**
 * MIDDLEWARE DE SEGURIDAD GLOBAL
 *
 * Este archivo DEBE llamarse middleware.js (o middleware.ts)
 * para que Next.js lo reconozca y ejecute en cada request.
 *
 * Protege:
 * - Rutas de administración (/admin, /caja)
 * - APIs privadas (/api/admin/*, /api/orders/*, /api/settings/*)
 * - Rutas de autenticación
 */

// Rutas que requieren autenticación de ADMIN
const ADMIN_ROUTES = [
    '/admin',
    '/caja',
];

// APIs que requieren autenticación
const PROTECTED_API_ROUTES = [
    '/api/admin',
    '/api/orders',
    '/api/settings',
    '/api/upload',
];

// APIs públicas (no requieren autenticación)
const PUBLIC_API_ROUTES = [
    '/api/payments/webhook',
    '/api/payments/create-preference',
    '/api/orders/by-number',
    '/api/orders/by-payment',
    '/api/auth',
    '/api/print-jobs',
];

// APIs de menú: GET es público, POST/PUT/DELETE requiere auth
const MENU_API_ROUTES = [
    '/api/menu',
];

// Rutas completamente públicas
const PUBLIC_ROUTES = [
    '/login',
    '/register',
    '/menu',
    '/checkout',
    '/tracking',
];

export default async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Ignorar archivos estáticos y assets
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/assets') ||
        pathname.startsWith('/icons') ||
        pathname === '/favicon.ico' ||
        pathname === '/manifest.json' ||
        pathname === '/sw.js' ||
        pathname.startsWith('/workbox-')
    ) {
        return NextResponse.next();
    }

    // Verificar si es una ruta pública
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));

    // Excepciones para acciones públicas de órdenes (cancelar y confirmar retiro)
    // Permite /api/orders/:id/cancel y /api/orders/:id/customer-pickup
    const isPublicOrderAction =
        /\/api\/orders\/[^/]+\/cancel$/.test(pathname) ||
        /\/api\/orders\/[^/]+\/customer-pickup$/.test(pathname);

    // Si es ruta completamente pública, permitir acceso
    if (isPublicRoute || isPublicApiRoute || isPublicOrderAction) {
        return NextResponse.next();
    }

    // Rutas de menú: GET es público, otros métodos requieren autenticación
    const isMenuApiRoute = MENU_API_ROUTES.some(route => pathname.startsWith(route));
    if (isMenuApiRoute) {
        const method = request.method;
        // Solo GET es público para las APIs de menú
        if (method === 'GET') {
            return NextResponse.next();
        }
        // POST, PUT, DELETE requieren autenticación (se maneja abajo como protegida)
    }

    // Verificar si requiere autenticación
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
    const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
    // Rutas de menú con método de escritura también requieren auth
    const isMenuWriteRoute = isMenuApiRoute && request.method !== 'GET';

    // Si requiere autenticación, verificar sesión
    if (isAdminRoute || isProtectedApiRoute || isMenuWriteRoute) {
        try {
            const session = await auth();

            if (!session) {
                // Para APIs, retornar 401
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json(
                        { error: 'No autorizado. Inicia sesión.' },
                        { status: 401 }
                    );
                }
                // Para páginas, redirigir a login
                const loginUrl = new URL('/login', request.url);
                loginUrl.searchParams.set('callbackUrl', pathname);
                return NextResponse.redirect(loginUrl);
            }

            // Verificar rol para rutas de admin
            if (isAdminRoute) {
                const allowedRoles = ['admin', 'staff', 'manager'];
                if (!allowedRoles.includes(session.user?.role)) {
                    // Usuario autenticado pero sin permisos
                    if (pathname.startsWith('/api/')) {
                        return NextResponse.json(
                            { error: 'No tienes permisos para esta acción.' },
                            { status: 403 }
                        );
                    }
                    return NextResponse.redirect(new URL('/', request.url));
                }
            }

            // Añadir información del usuario a los headers para las APIs
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-user-id', session.user?.id || '');
            requestHeaders.set('x-user-role', session.user?.role || '');

            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });

        } catch (error) {
            console.error('Middleware auth error:', error);
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { error: 'Error de autenticación' },
                    { status: 500 }
                );
            }
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // Ruta raíz - dejar que app/page.jsx maneje la lógica
    // (muestra AdminPanel para staff/admin/manager, PublicHomePage para el resto)
    if (pathname === '/') {
        return NextResponse.next();
    }

    // Redirigir /login si ya está autenticado
    if (pathname === '/login') {
        try {
            const session = await auth();
            if (session) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        } catch {
            // Ignorar error, dejar continuar al login
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
