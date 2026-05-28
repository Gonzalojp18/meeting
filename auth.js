import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import dbConnect from '@/utils/dbConnect'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const isProduction = process.env.NODE_ENV === 'production'

const JWT_EXPIRES_IN = '8h'

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
          const { email, password } = credentials

          if (!email || !password) {
            throw new Error('Por favor complete todos los campos')
          }

          await dbConnect()

          const normalizedEmail = email.toLowerCase().trim()
          const user = await User.findOne({ email: normalizedEmail })

          if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new Error('Credenciales inválidas')
          }

          if (user.isActive === false) {
            throw new Error('Cuenta desactivada. Contacta al administrador.')
          }

          const token = jwt.sign(
            { userId: user._id, role: user.role, assignedLocations: user.assignedLocations },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          )

          return {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            assignedLocations: user.assignedLocations,
            token
          }
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