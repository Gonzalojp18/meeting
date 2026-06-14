import { Suspense } from 'react'
import MenuDisplay from '../../../components/MenuDisplay'

export const revalidate = 300

// Meta tags para evitar indexación pública del Menú Ejecutivo
export const metadata = {
  title: 'Menú Ejecutivo B2B | Meeting Resto Bar',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function ExecutiveMenuPage({ params }) {
  const { locationId } = await params
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MenuDisplay locationId={locationId} menuType="executive" />
    </Suspense>
  )
}
