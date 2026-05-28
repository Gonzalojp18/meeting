import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const { validateCredentials } = await import('@/utils/authLogin')
          return await validateCredentials(credentials)
        } catch (error) {
          console.error('[authorize] Error:', error.message)
          throw new Error(error.message || 'Error de autenticación')
        }
      }
    })
  ]
})