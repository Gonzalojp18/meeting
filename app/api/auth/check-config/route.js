import { NextResponse } from 'next/server'

/**
 * Diagnóstico público (solo flags booleanos, sin valores secretos).
 * Usar tras deploy: GET /api/auth/check-config
 */
export async function GET() {
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

  return NextResponse.json({
    ok: Boolean(authSecret && process.env.JWT_SECRET && process.env.MONGODB_URI),
    checks: {
      hasAuthSecret: Boolean(authSecret),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasMongoUri: Boolean(process.env.MONGODB_URI),
      authTrustHost: process.env.AUTH_TRUST_HOST === 'true',
      authUrlSet: Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL),
      nextPublicUrlSet: Boolean(process.env.NEXT_PUBLIC_URL),
      secretsMatch:
        !process.env.AUTH_SECRET ||
        !process.env.NEXTAUTH_SECRET ||
        process.env.AUTH_SECRET === process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
    },
    hint: !authSecret
      ? 'Falta AUTH_SECRET o NEXTAUTH_SECRET en Vercel (Production).'
      : !process.env.JWT_SECRET
        ? 'Falta JWT_SECRET en Vercel.'
        : !process.env.MONGODB_URI
          ? 'Falta MONGODB_URI en Vercel.'
          : 'Variables base presentes. Si login falla, revisa logs de Vercel en /api/auth/callback/credentials.',
  })
}
