import { NextResponse } from 'next/server'
import { auth } from './auth'

export default async function proxy(request) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Rutas protegidas que requieren autenticación
  const protectedRoutes = ['/']

  // Rutas públicas
  const publicRoutes = ['/login', '/register', '/menu/', '/checkout/']

  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Verificar si la ruta actual está protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Si el usuario no está autenticado y trata de acceder a una ruta protegida
  if (!session && isProtectedRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si el usuario está autenticado y trata de acceder a login, redirigir al home
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets|manifest\\.json|sw\\.js|workbox-.*\\.js|icons/|_offline).*)',
  ],
}
