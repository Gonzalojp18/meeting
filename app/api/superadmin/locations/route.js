import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';

// GET: Listar todas las locaciones
export async function GET(request) {
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();

        const menu = await Menu.findOne().lean();

        if (!menu || !menu.locations) {
            return NextResponse.json({
                success: true,
                locations: []
            });
        }

        return NextResponse.json({
            success: true,
            locations: menu.locations
        });
    } catch (error) {
        console.error('[SuperAdmin Locations GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener locaciones' },
            { status: 500 }
        );
    }
}
