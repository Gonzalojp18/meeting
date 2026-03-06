import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminPanel from '@/components/AdminPanel';

const ADMIN_ROLES = ['admin', 'manager', 'superadmin'];

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Staff (caja) no tiene acceso al panel admin — los mandamos a su panel
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect('/caja');
  }

  return <AdminPanel />;
}
