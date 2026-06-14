import { Suspense } from 'react'
import MenuDisplay from '../../../components/MenuDisplay'

export const revalidate = 300

export default async function MenuPage({ params }) {
  const { locationId } = await params
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MenuDisplay locationId={locationId} />
    </Suspense>
  )
}