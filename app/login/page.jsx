import Login from '../../components/Login'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user?.role) {
    redirect('/')
  }
  return <Login />
}
