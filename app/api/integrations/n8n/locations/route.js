import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import { validateApiKey } from '@/lib/auth/api-key';

/**
 * GET /api/integrations/n8n/locations
 * Lista las sedes del restaurante con su clave de precio correspondiente.
 * Esencial para que el agente AI sepa qué key (location1, location2…) corresponde
 * a cada sede al momento de consultar o cambiar precios.
 */
export async function GET(req) {
    if (!validateApiKey(req)) {
        return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
    }

    try {
        await dbConnect();

        const menu = await Menu.findOne().lean();

        if (!menu?.locations?.length) {
            return NextResponse.json({ locations: [] });
        }

        // Las claves de precio (location1, location2…) son posicionales:
        // index 0 → location1, index 1 → location2, etc.
        const locations = menu.locations.map((loc, index) => ({
            priceKey: `location${index + 1}`,
            nameId:   loc.nameId,
            name:     loc.name,
            isActive: loc.isActive,
        }));

        return NextResponse.json({ locations });

    } catch (error) {
        console.error('[n8n Locations] Error:', error);
        return NextResponse.json({ error: 'Error al obtener sedes' }, { status: 500 });
    }
}
