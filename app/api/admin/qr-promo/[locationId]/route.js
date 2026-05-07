import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import { auth } from '@/auth';

const standardQuery = {
  $or: [
    { menuType: 'standard' },
    { menuType: { $exists: false } },
    { menuType: null }
  ]
};

export async function GET(req, { params }) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'superadmin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { locationId } = await params;
    await dbConnect();

    const menu = await Menu.findOne(standardQuery).select('locations').lean();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const location = menu.locations.find(loc => loc.nameId === locationId);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

        return NextResponse.json({
            qrPromo: location.qrPromo || {
                isEnabled: false,
                type: 'discount',
                discountPercentage: 15,
                frequency: 'once',
                title: 'Primera vez por QR!',
                subtitle: 'Obten {discount}% OFF en tu primer pedido takeaway',
                buttonText: 'Ver menu',
                termsText: 'Valido solo para pedidos takeaway. No acumulable con otras promociones.',
            },
            affiliateClub: location.affiliateClub || {
                isEnabled: false,
                discountPercentage: 10,
            },
            locations: menu.locations.map(loc => ({ nameId: loc.nameId, name: loc.name })),
        });
  } catch (error) {
    console.error('Admin QR Promo GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'superadmin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { locationId } = await params;
    const body = await req.json();

    await dbConnect();

    const menu = await Menu.findOne(standardQuery);

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const locationIndex = menu.locations.findIndex(loc => loc.nameId === locationId);
    if (locationIndex === -1) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

        // Handle both qrPromo and affiliateClub fields
        if (body.qrPromo) {
            menu.locations[locationIndex].qrPromo = body.qrPromo;
        }
        if (body.affiliateClub) {
            menu.locations[locationIndex].affiliateClub = body.affiliateClub;
        }
        await menu.save();

    return NextResponse.json({ success: true, qrPromo: menu.locations[locationIndex].qrPromo });
  } catch (error) {
    console.error('Admin QR Promo PUT error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
