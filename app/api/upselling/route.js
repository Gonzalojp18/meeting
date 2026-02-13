import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Upselling from "@/models/Upselling";
import Menu from "@/models/Menu";
import { getAuthToken, requireAdminOrManager } from "@/utils/authHelper";

/**
 * GET /api/upselling
 * 
 * Para admin: Devuelve todos los upsellings con filtros opcionales
 * Para público: Devuelve solo upsellings activos para una ubicación de display
 * 
 * Query params:
 * - displayIn: 'menu' | 'checkout' | 'cart' (para público)
 * - locationId: string (para filtrar por ubicación del restaurante)
 * - category: string (para filtrar por categoría)
 * - type: string (para filtrar por tipo)
 * - isActive: boolean (solo admin)
 */
export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const displayIn = searchParams.get('displayIn');
        const locationId = searchParams.get('locationId');
        const category = searchParams.get('category');
        const type = searchParams.get('type');
        const timing = searchParams.get('timing');
        const isActiveParam = searchParams.get('isActive');

        // Verificar si es admin
        const token = await getAuthToken(request);
        const isAdmin = token?.role === 'admin' || token?.role === 'manager';

        // Construir query
        const query = {};

        // Para público, solo activos
        if (!isAdmin) {
            query.isActive = true;
        } else if (isActiveParam !== null) {
            query.isActive = isActiveParam === 'true';
        }

        // Filtro por ubicación de display
        if (displayIn === 'menu') {
            query['displayLocations.inMenu'] = true;
        } else if (displayIn === 'checkout') {
            query['displayLocations.inCheckout'] = true;
        } else if (displayIn === 'cart') {
            query['displayLocations.inCart'] = true;
        }

        // Filtros opcionales
        if (category) query.category = category;
        if (type) query.type = type;
        if (timing) query.timing = timing;
        if (locationId) {
            query.$or = [
                { locationId: locationId },
                { locationId: null }
            ];
        }

        const upsellings = await Upselling.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .lean();

        // Si es admin, incluir métricas adicionales
        if (isAdmin) {
            // Calcular tasa de conversión para cada upselling
            const enrichedUpsellings = upsellings.map(u => ({
                ...u,
                conversionRate: u.metrics?.impressions?.total > 0
                    ? ((u.metrics.clicks.total / u.metrics.impressions.total) * 100).toFixed(2)
                    : 0
            }));

            return NextResponse.json({
                success: true,
                data: enrichedUpsellings,
                total: enrichedUpsellings.length
            });
        }

        return NextResponse.json({
            success: true,
            data: upsellings
        });

    } catch (error) {
        console.error("Error fetching upsellings:", error);
        return NextResponse.json(
            { success: false, error: "Error al obtener upsellings" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/upselling
 * 
 * Crea un nuevo upselling (solo admin)
 */
export async function POST(request) {
    try {
        const { authorized, error } = await requireAdminOrManager(request);

        if (!authorized) {
            return NextResponse.json(
                { success: false, error: error || "No autorizado" },
                { status: 401 }
            );
        }

        await dbConnect();

        const body = await request.json();

        // Validaciones básicas
        if (!body.name || !body.type || !body.category || !body.copyText) {
            return NextResponse.json(
                { success: false, error: "Faltan campos requeridos: name, type, category, copyText" },
                { status: 400 }
            );
        }

        if (!body.suggestedItems || body.suggestedItems.length === 0) {
            return NextResponse.json(
                { success: false, error: "Debe incluir al menos un producto sugerido" },
                { status: 400 }
            );
        }

        // Crear upselling - Sanitizado (Security: prevent mass-assignment)
        const upselling = await Upselling.create({
            name: body.name,
            type: body.type,
            category: body.category,
            triggerItemId: body.triggerItemId,
            triggerItemName: body.triggerItemName,
            triggerCategoryId: body.triggerCategoryId,
            triggerCategoryName: body.triggerCategoryName,
            suggestedItems: body.suggestedItems,
            copyText: body.copyText,
            description: body.description,
            ticketLevel: body.ticketLevel,
            timing: body.timing,
            daysActive: body.daysActive,
            displayLocations: body.displayLocations,
            isActive: body.isActive !== undefined ? body.isActive : true,
            priority: body.priority || 0,
            displayLimit: body.displayLimit || 3,
            locationId: body.locationId,
            metrics: {
                impressions: { total: 0, inMenu: 0, inCheckout: 0, inCart: 0 },
                clicks: { total: 0, inMenu: 0, inCheckout: 0, inCart: 0 }
            }
        });

        return NextResponse.json({
            success: true,
            data: upselling,
            message: "Upselling creado exitosamente"
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating upselling:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Error al crear upselling" },
            { status: 500 }
        );
    }
}
