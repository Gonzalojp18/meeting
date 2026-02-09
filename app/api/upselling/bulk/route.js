import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Upselling from "@/models/Upselling";
import { getToken } from "next-auth/jwt";

/**
 * PATCH /api/upselling/bulk
 * 
 * Acciones masivas sobre múltiples upsellings.
 * 
 * Body:
 * - ids: string[] - IDs de upsellings a modificar
 * - action: 'toggleActive' | 'toggleLocation'
 * - value: boolean - nuevo valor
 * - location: 'inMenu' | 'inCheckout' | 'inCart' (solo para toggleLocation)
 */
export async function PATCH(request) {
    try {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

        if (!token || (token.role !== 'admin' && token.role !== 'manager')) {
            return NextResponse.json(
                { success: false, error: "No autorizado" },
                { status: 401 }
            );
        }

        await dbConnect();

        const body = await request.json();
        const { ids, action, value, location } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, error: "Se requiere un array de IDs" },
                { status: 400 }
            );
        }

        if (!action || !['toggleActive', 'toggleLocation'].includes(action)) {
            return NextResponse.json(
                { success: false, error: "Acción no válida" },
                { status: 400 }
            );
        }

        let updateQuery = {};

        if (action === 'toggleActive') {
            updateQuery = { $set: { isActive: value } };
        } else if (action === 'toggleLocation') {
            if (!location || !['inMenu', 'inCheckout', 'inCart'].includes(location)) {
                return NextResponse.json(
                    { success: false, error: "Ubicación no válida" },
                    { status: 400 }
                );
            }
            updateQuery = { $set: { [`displayLocations.${location}`]: value } };
        }

        const result = await Upselling.updateMany(
            { _id: { $in: ids } },
            updateQuery
        );

        return NextResponse.json({
            success: true,
            message: `${result.modifiedCount} upsellings actualizados`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("Error bulk updating upsellings:", error);
        return NextResponse.json(
            { success: false, error: "Error al actualizar upsellings" },
            { status: 500 }
        );
    }
}
