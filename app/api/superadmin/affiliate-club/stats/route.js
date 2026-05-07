import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AffiliateProspect from '@/models/AffiliateProspect';
import Menu from '@/models/Menu';
import { requireSuperAdmin } from '@/middleware/superadmin';

export async function GET(req) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.error) return authResult.response;

  try {
    await dbConnect();

    const totalProspects = await AffiliateProspect.countDocuments();
    const byStatus = await AffiliateProspect.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byLocation = await AffiliateProspect.aggregate([
      { $group: { _id: '$locationId', count: { $sum: 1 } } }
    ]);

    const convertedCount = await AffiliateProspect.countDocuments({ status: 'converted' });
    const conversionRate = totalProspects > 0 ? (convertedCount / totalProspects * 100).toFixed(2) : 0;

    const usedDiscounts = await AffiliateProspect.countDocuments({ discountUsed: true });
    const totalDiscountGiven = await AffiliateProspect.aggregate([
      { $match: { discountUsed: true } },
      { $group: { _id: null, total: { $sum: '$discountPercentage' } } }
    ]);

    const menu = await Menu.findOne().lean();
    const locationNames = {};
    if (menu) {
      menu.locations.forEach(loc => {
        locationNames[loc.nameId] = loc.name;
      });
    }

    const locationStats = byLocation.map(item => ({
      locationId: item._id,
      locationName: locationNames[item._id] || item._id,
      count: item.count
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total: totalProspects,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byLocation: locationStats,
        converted: convertedCount,
        conversionRate: parseFloat(conversionRate),
        usedDiscounts,
        totalDiscountGiven: totalDiscountGiven[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('GET stats error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
