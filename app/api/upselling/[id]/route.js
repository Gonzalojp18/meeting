import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Upselling from "@/models/Upselling";
import { getToken } from "next-auth/jwt";

/**
 * GET /api/upselling/[id]
 * 
 * Obtener un upselling específico
 */
export async function GET(request, { params }) {
    try {
        await dbConnect();

        const { id } = await params;
        const upselling = await Upselling.findById(id).lean();

        if (!upselling) {
            return NextResponse.json(
                { success: false, error: "Upselling no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: upselling
        });

    } catch (error) {
        console.error("Error fetching upselling:", error);
        return NextResponse.json(
            { success: false, error: "Error al obtener upselling" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/upselling/[id]
 * 
 * Actualizar un upselling completo (solo admin)
 */
export async function PUT(request, { params }) {
    try {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

        if (!token || (token.role !== 'admin' && token.role !== 'manager')) {
            return NextResponse.json(
                { success: false, error: "No autorizado" },
                { status: 401 }
            );
        }

        await dbConnect();

        const { id } = await params;
        const body = await request.json();

        // No permitir modificar métricas directamente
        delete body.metrics;

        const upselling = await Upselling.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!upselling) {
            return NextResponse.json(
                { success: false, error: "Upselling no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: upselling,
            message: "Upselling actualizado"
        });

    } catch (error) {
        console.error("Error updating upselling:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Error al actualizar upselling" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/upselling/[id]
 * 
 * Actualización parcial (toggle isActive, actualizar métricas)
 */
export async function PATCH(request, { params }) {
    try {
        await dbConnect();

        const { id } = await params;
        const body = await request.json();

        // Si es toggle de isActive, requiere admin
        if (body.isActive !== undefined) {
            const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

            if (!token || (token.role !== 'admin' && token.role !== 'manager')) {
                return NextResponse.json(
                    { success: false, error: "No autorizado" },
                    { status: 401 }
                );
            }

            const upselling = await Upselling.findByIdAndUpdate(
                id,
                { $set: { isActive: body.isActive } },
                { new: true }
            );

            if (!upselling) {
                return NextResponse.json(
                    { success: false, error: "Upselling no encontrado" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: upselling,
                message: `Upselling ${body.isActive ? 'activado' : 'desactivado'}`
            });
        }

        // Tracking de impresiones (público)
        if (body.trackImpression) {
            const location = body.location || 'checkout'; // menu, checkout, cart

            const incFields = {
                'metrics.impressions.total': 1
            };

            if (location === 'menu') {
                incFields['metrics.impressions.inMenu'] = 1;
            } else if (location === 'checkout') {
                incFields['metrics.impressions.inCheckout'] = 1;
            } else if (location === 'cart') {
                incFields['metrics.impressions.inCart'] = 1;
            }

            await Upselling.findByIdAndUpdate(id, {
                $inc: incFields,
                $set: { 'metrics.lastImpressionAt': new Date() }
            });

            return NextResponse.json({ success: true });
        }

        // Tracking de clicks (público)
        if (body.trackClick) {
            const location = body.location || 'checkout';

            const incFields = {
                'metrics.clicks.total': 1
            };

            if (location === 'menu') {
                incFields['metrics.clicks.inMenu'] = 1;
            } else if (location === 'checkout') {
                incFields['metrics.clicks.inCheckout'] = 1;
            } else if (location === 'cart') {
                incFields['metrics.clicks.inCart'] = 1;
            }

            await Upselling.findByIdAndUpdate(id, {
                $inc: incFields,
                $set: { 'metrics.lastClickAt': new Date() }
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { success: false, error: "Operación no válida" },
            { status: 400 }
        );

    } catch (error) {
        console.error("Error patching upselling:", error);
        return NextResponse.json(
            { success: false, error: "Error al actualizar upselling" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/upselling/[id]
 * 
 * Eliminar un upselling (solo admin)
 */
export async function DELETE(request, { params }) {
    try {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

        if (!token || (token.role !== 'admin' && token.role !== 'manager')) {
            return NextResponse.json(
                { success: false, error: "No autorizado" },
                { status: 401 }
            );
        }

        await dbConnect();

        const { id } = await params;
        const upselling = await Upselling.findByIdAndDelete(id);

        if (!upselling) {
            return NextResponse.json(
                { success: false, error: "Upselling no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Upselling eliminado"
        });

    } catch (error) {
        console.error("Error deleting upselling:", error);
        return NextResponse.json(
            { success: false, error: "Error al eliminar upselling" },
            { status: 500 }
        );
    }
}
