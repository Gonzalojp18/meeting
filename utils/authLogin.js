import dbConnect from '@/utils/dbConnect'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_EXPIRES_IN = '8h'

export async function validateCredentials(credentials) {
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

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno')
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
}
