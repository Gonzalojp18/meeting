import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import QrPromoView from '@/models/QrPromoView';
import Order from '@/models/Order';
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

    const menu = await Menu.findOne(standardQuery).lean();
    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const location = menu.locations.find(loc => loc.nameId === locationId);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const promo = location.qrPromo || {};

    const [totalViewsResult, ordersResult] = await Promise.all([
      QrPromoView.aggregate([
        { $match: { locationId } },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            avgDiscount: { $avg: '$discountPercentage' }
          }
        }
      ]),
      Order.aggregate([
        {
          $match: {
            'location.locationId': locationId,
            qrPromoDiscount: { $exists: true, $gt: 0 },
            paymentStatus: 'paid',
            canBeCounted: true
          }
        },
        {
          $group: {
            _id: '$qrPromoSource',
            count: { $sum: 1 },
            totalDiscount: { $sum: '$qrPromoDiscountAmount' }
          }
        }
      ])
    ]);

    const bySource = {};
    for (const item of totalViewsResult) {
      bySource[item._id] = {
        views: item.count,
        orders: 0,
        avgDiscount: Math.round(item.avgDiscount || 0)
      };
    }

    for (const item of ordersResult) {
      if (bySource[item._id]) {
        bySource[item._id].orders = item.count;
      } else {
        bySource[item._id] = {
          views: 0,
          orders: item.count,
          avgDiscount: 0
        };
      }
    }

    const totalViews = Object.values(bySource).reduce((sum, s) => sum + s.views, 0);
    const totalOrders = Object.values(bySource).reduce((sum, s) => sum + s.orders, 0);
    const allAvgDiscount = totalViewsResult.reduce((sum, s) => sum + s.avgDiscount, 0) / (totalViewsResult.length || 1);

    return NextResponse.json({
      totalViews,
      totalOrders,
      avgDiscount: Math.round(allAvgDiscount || 0),
      bySource,
      promoEnabled: promo.isEnabled,
      promoType: promo.type,
      discountPercentage: promo.discountPercentage,
    });
  } catch (error) {
    console.error('QR Promo Stats GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
