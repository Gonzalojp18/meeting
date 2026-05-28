import { NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * Diagnóstico de auth solo en desarrollo. No usar en producción.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await auth()
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)
  const hasJwtSecret = Boolean(process.env.JWT_SECRET)
  const secretsMatch =
    !process.env.AUTH_SECRET ||
    !process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET === process.env.NEXTAUTH_SECRET

  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasAuthSecret,
      hasJwtSecret,
      authAndNextAuthSecretsMatch: secretsMatch,
      hasMongoUri: Boolean(process.env.MONGODB_URI),
      superadminEmailsConfigured: Boolean(process.env.SUPERADMIN_EMAILS),
    },
    session: session
      ? {
          hasUser: Boolean(session.user),
          email: session.user?.email ?? null,
          role: session.user?.role ?? null,
          hasApiToken: Boolean(session.user?.token),
        }
      : null,
  })
}
