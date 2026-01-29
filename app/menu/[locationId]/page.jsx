import MenuDisplay from '../../../components/MenuDisplay'

export default async function MenuPage({ params }) {
  const { locationId } = await params
  return <MenuDisplay locationId={locationId} />
}