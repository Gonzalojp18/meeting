import NextAuth, { CredentialsSignin } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'

const CONFIG_ERROR_PATTERNS = [
  'JWT_SECRET',
  'MONGODB_URI',
  'AUTH_SECRET',
  'NEXTAUTH_SECRET',
]

function isServerConfigError(message = '') {
  return CONFIG_ERROR_PATTERNS.some((p) => message.includes(p))
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  debug: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          console.log('[authorize] Attempting login with:', credentials.email)
          console.log('[authorize] NODE_ENV:', process.env.NODE_ENV)
          console.log('[authorize] NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
          const { validateCredentials } = await import('@/utils/authLogin')
          const user = await validateCredentials(credentials)
          console.log('[authorize] OK:', user.email, 'role:', user.role)
          return user
        } catch (error) {
          const message = error?.message || 'Error de autenticación'
          console.error('[authorize] Failed:', message, error?.stack)

          // Errores de env/servidor → Auth.js muestra error=Configuration (revisar Vercel)
          if (isServerConfigError(message)) {
            throw error
          }

          // Credenciales, cuenta inactiva, etc. → CredentialsSignin (no Configuration)
          const signInError = new CredentialsSignin()
          signInError.code = 'credentials'
          throw signInError
        }
      }
    })
  ]
})