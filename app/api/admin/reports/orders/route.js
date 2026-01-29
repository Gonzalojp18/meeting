import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { auth } from '@/auth';

export async function GET(req) {
    try {
        await dbConnect();
        const session = await auth();

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const locationId = searchParams.get('locationId');

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate y endDate son requeridos' },
                { status: 400 }
            );
        }

        const query = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            }
        };

        if (locationId) {
            query['location.locationId'] = locationId;
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(5000)
            .lean();

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching report orders:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
