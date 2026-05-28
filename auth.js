import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  debug: process.env.NODE_ENV === 'development',
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
          const { validateCredentials } = await import('@/utils/authLogin')
          const user = await validateCredentials(credentials)
          console.log('[authorize] Login successful for:', user.email, 'role:', user.role)
          return user
        } catch (error) {
          console.error('[authorize] Error:', error.message)
          throw new Error(error.message || 'Error de autenticación')
        }
      }
    })
  ]
})