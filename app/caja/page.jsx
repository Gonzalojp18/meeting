import CashierPanel from '../../components/cashier/CashierPanel'
import { auth } from '../../auth'
import { redirect } from 'next/navigation'

export default async function CajaPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Solo staff y admin pueden acceder
  if (session.user.role !== 'staff' && session.user.role !== 'admin') {
    redirect('/login')
  }

  return <CashierPanel />
}
