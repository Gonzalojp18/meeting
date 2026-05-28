import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const isProduction = process.env.NODE_ENV === 'production'

export const { handlers, signIn, signOut, auth } = NextAuth({
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
  ],
  session: {
    strategy: 'jwt'
  },
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      }
    },
    callbackUrl: {
      name: isProduction ? '__Secure-authjs.callback-url' : 'authjs.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      }
    },
    csrfToken: {
      name: isProduction ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user._id
        token.email = user.email
        token.token = user.token
        token.role = user.role
        token.assignedLocations = user.assignedLocations
      }
      return token
    },
    async session({ session, token }) {
      if (token.token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.token = token.token
        session.user.role = token.role
        session.user.assignedLocations = token.assignedLocations
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
})