const isProduction = process.env.NODE_ENV === 'production'
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

console.log('[authConfig] NODE_ENV:', process.env.NODE_ENV)
console.log('[authConfig] isProduction:', isProduction)
console.log('[authConfig] NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('[authConfig] AUTH_SECRET exists:', !!authSecret)

if (isProduction && !authSecret) {
  console.error(
    '[auth] AUTH_SECRET o NEXTAUTH_SECRET es obligatorio en producción. Login fallará con error=Configuration.'
  )
}

export const authConfig = {
  providers: [], // Empty to avoid importing non-Edge compatible adapters/providers
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
        secure: isProduction
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log('[jwt callback] token:', token, 'user:', user)
      if (user) {
        token.id = user._id
        token.email = user.email
        token.role = user.role
        token.assignedLocations = user.assignedLocations
        // Evitar colisión con el objeto `token` de Auth.js; compat con sesiones viejas en token.token
        token.apiAccessToken = user.token
        token.token = user.token
      }
      return token
    },
    async session({ session, token }) {
      console.log('[session callback] session:', session, 'token:', token)
      const apiAccessToken = token.apiAccessToken || token.token
      if (token?.role || token?.id) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.role = token.role
        session.user.assignedLocations = token.assignedLocations
        if (apiAccessToken) {
          session.user.token = apiAccessToken
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  trustHost: true,
  secret: authSecret
}
