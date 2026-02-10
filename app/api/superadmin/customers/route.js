import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Customer from '@/models/Customer';

// GET: Listar clientes únicos
export async function GET(request) {
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const skip = parseInt(searchParams.get('skip') || '0');
        const sort = searchParams.get('sort') || 'lastOrderDate';
        const order = searchParams.get('order') || 'desc';

        const sortOption = { [sort]: order === 'desc' ? -1 : 1 };

        const [customers, total] = await Promise.all([
            Customer.find()
                .sort(sortOption)
                .limit(limit)
                .skip(skip)
                .lean(),
            Customer.countDocuments()
        ]);

        return NextResponse.json({
            success: true,
            customers,
            pagination: {
                total,
                limit,
                skip,
                hasMore: skip + customers.length < total
            }
        });
    } catch (error) {
        console.error('[SuperAdmin Customers GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener clientes' },
            { status: 500 }
        );
    }
}
