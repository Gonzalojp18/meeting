import AdminPanel from '../components/AdminPanel'
import { auth } from '../auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Redireccionar según el rol
  const userRole = session.user?.role

  // Admin, manager y staff van al panel de administración
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'staff') {
    return <AdminPanel />
  }

  // Otros roles sin acceso al panel
  redirect('/login')
}