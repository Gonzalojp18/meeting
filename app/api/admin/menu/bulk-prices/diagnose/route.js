import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';

/**
 * GET /api/admin/menu/bulk-prices/diagnose?type=executive
 * Devuelve un reporte de todos los items y sus precios por sede.
 * Útil para detectar precios corruptos (null/0) luego de un bulk update fallido.
 */
export async function GET(req) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'manager'].includes(session.user.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const type = url.searchParams.get('type') || 'executive';

        const query = type === 'standard'
            ? { $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] }
            : { menuType: type };

        const menu = await Menu.findOne(query).lean();
        if (!menu) {
            return NextResponse.json({ error: `Menú "${type}" no encontrado` }, { status: 404 });
        }

        const PRICE_KEYS = ['location1', 'location2', 'location3'];
        const report = [];

        for (const cat of menu.categories || []) {
            for (const item of cat.items || []) {
                const priceReport = {};
                let hasIssue = false;

                for (const key of PRICE_KEYS) {
                    const val = item.prices?.[key];
                    priceReport[key] = val;
                    // Detectar precio problemático: null, 0, o NaN
                    if (val === null || val === 0 || (val !== undefined && isNaN(val))) {
                        hasIssue = true;
                    }
                }

                report.push({
                    category: cat.name,
                    item: item.name,
                    itemId: item._id?.toString(),
                    prices: priceReport,
                    hasIssue,
                });
            }
        }

        const issuesOnly = report.filter(r => r.hasIssue);

        return NextResponse.json({
            menuType: type,
            totalItems: report.length,
            issuesFound: issuesOnly.length,
            issues: issuesOnly,
            all: report,
        });

    } catch (error) {
        console.error('[Bulk Prices Diagnose] Error:', error);
        return NextResponse.json({ error: 'Error al diagnosticar' }, { status: 500 });
    }
}
