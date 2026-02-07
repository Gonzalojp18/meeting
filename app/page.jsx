import AdminPanel from '../components/AdminPanel'
import PublicHomePage from '../components/home/PublicHomePage'
import { auth } from '../auth'

export default async function HomePage() {
  const session = await auth()

  // Si no hay sesión o el usuario no es admin/manager/staff, mostrar página pública
  const userRole = session?.user?.role

  // Admin, manager y staff van al panel de administración
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'staff') {
    return <AdminPanel />
  }

  // Para todos los demás (incluyendo usuarios no autenticados), mostrar landing pública
  return <PublicHomePage />
}