import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';

// PATCH: Actualizar configuración de una locación en TODOS los menús
export async function PATCH(request, { params }) {
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();
        const { locationId } = await params;
        const body = await request.json();

        // Actualizar TODOS los documentos de menú que contengan esta locación
        const menus = await Menu.find({ 'locations.nameId': locationId });

        if (menus.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Locación no encontrada en ningún menú' },
                { status: 404 }
            );
        }

        for (const menu of menus) {
            const locationIndex = menu.locations.findIndex(
                loc => loc.nameId === locationId
            );

            if (locationIndex === -1) continue;

            const location = menu.locations[locationIndex];

            if ('isActive' in body) {
                location.isActive = body.isActive;
                location.metadata = location.metadata || {};
                if (body.isActive) {
                    location.metadata.activatedAt = new Date();
                    location.metadata.deactivatedAt = null;
                } else {
                    location.metadata.deactivatedAt = new Date();
                }
            }

            if (body.features) {
                location.features = location.features || {};
                if ('takeawayEnabled' in body.features) {
                    location.features.takeawayEnabled = body.features.takeawayEnabled;
                }
                if ('localEnabled' in body.features) {
                    location.features.localEnabled = body.features.localEnabled;
                }
            }

            if (body.notes) {
                location.metadata = location.metadata || {};
                location.metadata.notes = body.notes;
            }

            menu.markModified('locations');
            await menu.save();
        }

        // Devolver la configuración actualizada del primer menú encontrado
        return NextResponse.json({
            success: true,
            location: menus[0].locations.find(loc => loc.nameId === locationId),
            menusUpdated: menus.length
        });
    } catch (error) {
        console.error('[SuperAdmin Location PATCH] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al actualizar locación' },
            { status: 500 }
        );
    }
}
