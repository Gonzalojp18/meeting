import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import QrPromoView from '@/models/QrPromoView';

const standardQuery = {
  $or: [
    { menuType: 'standard' },
    { menuType: { $exists: false } },
    { menuType: null }
  ]
};

export async function GET(req, { params }) {
  try {
    const { locationId } = await params;
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source') || '';

    if (!source.toLowerCase().includes('qr')) {
      return NextResponse.json({ show: false, reason: 'not_qr_source' });
    }

    await dbConnect();

    const menu = await Menu.findOne(standardQuery).lean();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const location = menu.locations.find(loc => loc.nameId === locationId);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const qrPromo = location.qrPromo || {};

    if (!qrPromo?.isEnabled) {
      return NextResponse.json({ show: false, reason: 'not_enabled' });
    }

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    if (qrPromo.frequency !== 'every_visit') {
      if (qrPromo.frequency === 'once') {
        const existingView = await QrPromoView.findOne({
          locationId,
          ip,
        });

        if (existingView) {
          return NextResponse.json({ show: false, reason: 'already_viewed' });
        }
      } else if (qrPromo.frequency === 'daily') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingView = await QrPromoView.findOne({
          locationId,
          ip,
          viewedAt: { $gte: today }
        });

        if (existingView) {
          return NextResponse.json({ show: false, reason: 'already_viewed_today' });
        }
      }
    }

    const subtitle = (qrPromo.subtitle || '').replace('{discount}', String(qrPromo.discountPercentage || 0));

    return NextResponse.json({
      show: true,
      promo: {
        ...qrPromo,
        subtitle,
        discountPercentage: qrPromo.discountPercentage || 0,
      },
      locationName: location.name,
    });
  } catch (error) {
    console.error('QR Promo GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { locationId } = await params;
    const body = await req.json();
    const { source, discountPercentage } = body;

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    await dbConnect();

    const menu = await Menu.findOne(standardQuery).select('locations');

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const location = menu.locations.find(loc => loc.nameId === locationId);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const qrPromo = location.qrPromo || {};

    if (qrPromo.frequency !== 'every_visit') {
      await QrPromoView.create({
        locationId,
        ip,
        userAgent,
        source,
        viewedAt: new Date(),
        discountPercentage: discountPercentage || qrPromo.discountPercentage || 0,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('QR Promo POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
