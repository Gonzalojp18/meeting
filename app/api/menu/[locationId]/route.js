import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import Settings from '@/models/Settings';
import { DEFAULT_TAKEAWAY_HOURS } from '@/utils/constants';
import { cacheHeaders } from '@/lib/cacheHeaders';

// @desc Get Menu by Location
// @route GET /api/menu/:locationId
// @access Public
export async function GET(req, { params }) {
  try {
    await dbConnect();

    const { locationId } = await params;
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'standard';
    
    const query = type === 'standard' 
      ? { $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] } 
      : { menuType: type };
      
    let menu = await Menu.findOne(query).lean();

    if (!menu) {
      if (type !== 'standard') {
        const standardMenu = await Menu.findOne({ $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] }).lean();
        if (standardMenu) {
          const newDoc = await Menu.create({
            menuType: type,
            categories: [],
            locations: standardMenu.locations || []
          });
          menu = newDoc.toObject();
        } else {
          return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
      }
    }

    const location = menu.locations.find(loc => loc.nameId === locationId);

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const filterItemsByLocation = (category, locId) => {
      return category.items
        .filter(item => {
          // Handle different price structures
          let price = null;

          if (item.prices && typeof item.prices === 'object') {
            // Nested structure: prices.location1
            price = item.prices[locId];
          } else if (typeof item.prices === 'number') {
            // Flat structure: just a number
            price = item.prices;
          }

          // Include item if it has a valid price > 0 or if we're in display mode (location3)
          return (price !== undefined && price !== null && price > 0) || locId === 'location3';
        })
        .map(item => {
          // Normalize price structure for frontend
          let price = 0;

          if (item.prices && typeof item.prices === 'object') {
            price = item.prices[locId] || 0;
          } else if (typeof item.prices === 'number') {
            price = item.prices;
          }

          return {
            ...item,
            prices: price, // Flatten to single number for frontend compatibility
            // Inyectar opciones globales si es menú ejecutivo y el plato no tiene las suyas propias (o queremos sumarlas)
            customizations: type === 'executive' 
              ? [...(menu.defaultCustomizations || []), ...(item.customizations || [])]
              : (item.customizations || [])
          };
        });
    };

    const takeawayHours = await Settings.getValue('takeawayHours') || DEFAULT_TAKEAWAY_HOURS;

    const filteredMenu = {
      categories: (menu.categories || []).map(category => ({
        ...category,
        // Normalizar campos para evitar undefined (datos viejos sin estos campos)
        locations: category.locations || [],
        isActive: category.isActive !== false, // default true si no existe
        items: filterItemsByLocation(category, locationId)
          .sort((a, b) => (a.order || 0) - (b.order || 0)),
        style: category.style || 'default',
        image: category.image || {},
        schedule: category.schedule || {}
      })).sort((a, b) => (a.order || 0) - (b.order || 0)),
      locations: location,
      takeawayHours,
      currentLocation: {
        nameId: location.nameId,
        name: location.name,
        isActive: location.isActive ?? true,
        features: location.features || { takeawayEnabled: true, localEnabled: true }
      }
    };

    return NextResponse.json(filteredMenu, { headers: cacheHeaders(300) });
  } catch (error) {
    console.error('GET /api/menu/[locationId] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
