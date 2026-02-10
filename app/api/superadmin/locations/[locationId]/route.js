import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/middleware/superadmin';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';

// PATCH: Actualizar configuración de una locación
export async function PATCH(request, { params }) {
    const authResult = await requireSuperAdmin(request);
    if (authResult.error) return authResult.response;

    try {
        await dbConnect();
        // Next.js 15: params es una Promise que debe ser unwrapped
        const { locationId } = await params;
        const body = await request.json();

        // Encontrar el menú
        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json(
                { success: false, error: 'Menú no encontrado' },
                { status: 404 }
            );
        }

        // Encontrar la locación
        const locationIndex = menu.locations.findIndex(
            loc => loc.nameId === locationId
        );

        if (locationIndex === -1) {
            return NextResponse.json(
                { success: false, error: 'Locación no encontrada' },
                { status: 404 }
            );
        }

        // Actualizar campos permitidos
        const location = menu.locations[locationIndex];

        if ('isActive' in body) {
            location.isActive = body.isActive;
            // Actualizar metadata
            if (body.isActive) {
                location.metadata = location.metadata || {};
                location.metadata.activatedAt = new Date();
                location.metadata.deactivatedAt = null;
            } else {
                location.metadata = location.metadata || {};
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

        return NextResponse.json({
            success: true,
            location: menu.locations[locationIndex]
        });
    } catch (error) {
        console.error('[SuperAdmin Location PATCH] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error al actualizar locación' },
            { status: 500 }
        );
    }
}
