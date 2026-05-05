import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import QrPromoView from '@/models/QrPromoView';
import Order from '@/models/Order';

export async function GET(request) {
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();

        const menu = await Menu.findOne().lean();
        if (!menu || !menu.locations) {
            return NextResponse.json({ success: true, locations: [], global: {} });
        }

        const [globalViews, globalOrders] = await Promise.all([
            QrPromoView.aggregate([
                {
                    $group: {
                        _id: '$locationId',
                        views: { $sum: 1 },
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        qrPromoDiscount: { $exists: true, $gt: 0 },
                        paymentStatus: 'paid',
                        canBeCounted: true
                    }
                },
                {
                    $group: {
                        _id: '$location.locationId',
                        orders: { $sum: 1 },
                        totalDiscountAmount: { $sum: '$qrPromoDiscountAmount' }
                    }
                }
            ])
        ]);

        const viewsMap = {};
        globalViews.forEach(v => { viewsMap[v._id] = v.views; });

        const ordersMap = {};
        globalOrders.forEach(o => { ordersMap[o._id] = { orders: o.orders, discountAmount: o.totalDiscountAmount }; });

        const locations = menu.locations.map(loc => ({
            nameId: loc.nameId,
            name: loc.name,
            isActive: loc.isActive,
            qrPromo: loc.qrPromo || {},
            stats: {
                views: viewsMap[loc.nameId] || 0,
                orders: ordersMap[loc.nameId]?.orders || 0,
                discountGiven: ordersMap[loc.nameId]?.discountAmount || 0,
            }
        }));

        const totalViews = locations.reduce((sum, l) => sum + l.stats.views, 0);
        const totalOrders = locations.reduce((sum, l) => sum + l.stats.orders, 0);
        const totalDiscountGiven = locations.reduce((sum, l) => sum + l.stats.discountGiven, 0);

        return NextResponse.json({
            success: true,
            locations,
            global: { totalViews, totalOrders, totalDiscountGiven }
        });
    } catch (error) {
        console.error('[SuperAdmin QR Stats] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener estadisticas QR' },
            { status: 500 }
        );
    }
}
