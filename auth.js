import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'
import API_URI from './utils/getApiUri'

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
          const res = await axios.post(`${API_URI}/api/auth/login`, {
            email: credentials.email,
            password: credentials.password
          })

          if (res.data.token) {
            return {
              ...res.data.user,
              token: res.data.token
            }
          }
          return null
        } catch (error) {
          throw new Error(error.response?.data?.error?.message || 'Error de autenticación')
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user._id // Add user ID to token
        token.token = user.token
        token.role = user.role
        token.assignedLocations = user.assignedLocations
      }
      return token
    },
    async session({ session, token }) {
      if (token.token) {
        session.user.id = token.id // Add user ID to session
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