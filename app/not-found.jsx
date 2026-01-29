import { FullScreenError } from '../components/Error'

export default function NotFoundPage() {
  return <FullScreenError message='404 - Página no encontrada' buttonText='Regresar al inicio' href='/' />
}