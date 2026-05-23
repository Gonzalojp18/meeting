import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const isProduction = process.env.NODE_ENV === 'production'

const loginAttempts = new Map()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function checkRateLimitMemory(identifier) {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier) || []
  const recentAttempts = attempts.filter(t => now - t < WINDOW_MS)
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return { blocked: true }
  }
  recentAttempts.push(now)
  loginAttempts.set(identifier, recentAttempts)
  return { blocked: false }
}

async function checkRateLimit(identifier) {
  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      const rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        prefix: 'rl:auth:email',
      })
      const { success } = await rl.limit(identifier)
      if (!success) return { blocked: true }
      return { blocked: false }
    }
  } catch (_) { }
  return checkRateLimitMemory(identifier)
}

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
          const email = credentials.email.toLowerCase().trim()

          const rl = await checkRateLimit(email)
          if (rl.blocked) {
            throw new Error('Demasiados intentos. Intenta de nuevo en 15 minutos.')
          }

          const { default: dbConnect } = await import('./utils/dbConnect')
          const { default: User } = await import('./models/User')
          const { default: bcrypt } = await import('bcryptjs')

          await dbConnect()
          const user = await User.findOne({ email })

          if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
            return null
          }

          if (user.isActive === false) {
            return null
          }

          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedLocations: user.assignedLocations,
          }
        } catch (error) {
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
        token.role = user.role
        token.assignedLocations = user.assignedLocations
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
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