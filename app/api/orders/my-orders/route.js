import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { auth } from '@/auth';

// @desc Get user's own orders
// @route GET /api/orders/my-orders
// @access Private (authenticated users)
export async function GET(req) {
    try {
        await dbConnect();
        const session = await auth();

        if (!session) {
            return NextResponse.json(
                { error: 'No autorizado. Debes iniciar sesión.' },
                { status: 401 }
            );
        }

        // Buscar pedidos por email o teléfono del usuario
        const userEmail = session.user?.email;
        const userName = session.user?.name;

        if (!userEmail && !userName) {
            return NextResponse.json(
                { error: 'No se pudo identificar al usuario' },
                { status: 400 }
            );
        }

        // Query: buscar por email del cliente
        const query = {};
        if (userEmail) {
            query['customer.email'] = { $regex: new RegExp(`^${userEmail}$`, 'i') };
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .select([
                'orderNumber',
                'status',
                'paymentStatus',
                'total',
                'items',
                'location',
                'createdAt',
                'deliveryMethod',
                'refund'
            ])
            .lean();

        return NextResponse.json({ orders });

    } catch (error) {
        console.error('[MY ORDERS API] Error:', error);
        return NextResponse.json(
            { error: 'Error al obtener tus pedidos' },
            { status: 500 }
        );
    }
}
