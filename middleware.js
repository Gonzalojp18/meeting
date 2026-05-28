import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

// Rutas que requieren autenticación de ADMIN
const ADMIN_ROUTES = [
    '/admin',
    '/caja',
    '/superadmin',
];

// APIs que requieren autenticación
const PROTECTED_API_ROUTES = [
    '/api/admin',
    '/api/orders',
    '/api/settings',
    '/api/upload',
    '/api/superadmin',
];

// APIs públicas (no requieren autenticación)
const PUBLIC_API_ROUTES = [
    '/api/payments/webhook',
    '/api/payments/create-preference',
    '/api/orders/by-number',
    '/api/orders/by-payment',
    '/api/auth',
    '/api/print-jobs',
    '/api/health',
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

export default auth(async function middleware(request) {
    const session = request.auth;
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
    const isPublicOrderAction =
        /\/api\/orders\/[^/]+\/cancel$/.test(pathname) ||
        /\/api\/orders\/[^/]+\/customer-pickup$/.test(pathname);

    // Si es ruta completamente pública, permitir acceso
    if (isPublicRoute || isPublicApiRoute || isPublicOrderAction) {
        return NextResponse.next();
    }

    // Rutas de menú: GET es público, otros métodos requieren autenticación
    const isMenuApiRoute = MENU_API_ROUTES.some(route => pathname.startsWith(route));
    if (isMenuApiRoute && request.method === 'GET') {
        return NextResponse.next();
    }

    // Verificar si requiere autenticación
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
    const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
    const isMenuWriteRoute = isMenuApiRoute && request.method !== 'GET';

    if (isAdminRoute || isProtectedApiRoute || isMenuWriteRoute) {
        if (!session) {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { error: 'No autorizado. Inicia sesión.' },
                    { status: 401 }
                );
            }
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Verificar rol para rutas de admin
        if (isAdminRoute) {
            const role = session.user?.role;
            const allowedRoles = ['admin', 'staff', 'manager', 'superadmin'];

            if (!allowedRoles.includes(role)) {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json(
                        { error: 'No tienes permisos para esta acción.' },
                        { status: 403 }
                    );
                }
                return NextResponse.redirect(new URL('/', request.url));
            }

            // Protección extra: /superadmin y /api/superadmin solo para superadmin
            const isSuperAdminRoute =
                pathname.startsWith('/superadmin') ||
                pathname.startsWith('/api/superadmin');

            if (isSuperAdminRoute && role !== 'superadmin') {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json(
                        { error: 'Acceso exclusivo para superadmin.' },
                        { status: 403 }
                    );
                }
                return NextResponse.redirect(new URL('/admin', request.url));
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
    }

    // Ruta raíz
    if (pathname === '/') {
        return NextResponse.next();
    }

    // Redirigir /login si ya está autenticado
    if (pathname === '/login' && session) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
