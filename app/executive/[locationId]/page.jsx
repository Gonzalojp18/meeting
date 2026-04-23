import MenuDisplay from '../../../components/MenuDisplay'

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
  return <MenuDisplay locationId={locationId} menuType="executive" />
}
