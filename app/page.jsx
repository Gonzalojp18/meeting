import AdminPanel from '../components/AdminPanel'
import PublicHomePage from '../components/home/PublicHomePage'
import { auth } from '../auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth()

  const userRole = session?.user?.role

  if (userRole === 'superadmin') {
    redirect('/superadmin')
  }

  // Admin, manager y staff van al panel de administración
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'staff') {
    return <AdminPanel />
  }

  // Para todos los demás (incluyendo usuarios no autenticados), mostrar landing pública
  return <PublicHomePage />
}