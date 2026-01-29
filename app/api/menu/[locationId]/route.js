import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';

// @desc Get Menu by Location
// @route GET /api/menu/:locationId
// @access Public
export async function GET(req, { params }) {
  try {
    await dbConnect();

    const { locationId } = await params;
    const menu = await Menu.findOne().lean();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const location = menu.locations.find(loc => loc.nameId === locationId);

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const filterItemsByLocation = (category, locId) => {
      return category.items
        .filter(item => item.prices[locId] !== undefined)
        .map(item => ({
          ...item,
          prices: item.prices[locId]
        }));
    };

    const filteredMenu = {
      categories: menu.categories.map(category => ({
        ...category,
        items: filterItemsByLocation(category, locationId)
      })),
      locations: location
    };

    return NextResponse.json(filteredMenu);
  } catch (error) {
    console.error('GET /api/menu/[locationId] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
