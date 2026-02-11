import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';
import jwt from 'jsonwebtoken';
import { DEFAULT_UPSELLING_CONFIG } from '@/utils/constants';

// @desc Obtener configuración de upselling
// @route GET /api/settings/upselling
// @access Public
export async function GET() {
    try {
        await dbConnect();

        const config = await Settings.getValue('upselling_config');

        return NextResponse.json(config || DEFAULT_UPSELLING_CONFIG);
    } catch (error) {
        console.error('GET /api/settings/upselling error:', error);
        return NextResponse.json(DEFAULT_UPSELLING_CONFIG);
    }
}

// @desc Actualizar configuración de upselling
// @route PUT /api/settings/upselling
// @access Admin only
export async function PUT(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role !== 'admin') {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            }
        } catch {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        await dbConnect();

        const body = await req.json();
        const { maxInMenu, maxInCheckout, maxInCart } = body;

        // Validar que los valores son números entre 1 y 10
        const fields = { maxInMenu, maxInCheckout, maxInCart };
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                if (typeof val !== 'number' || val < 1 || val > 10 || !Number.isInteger(val)) {
                    return NextResponse.json(
                        { error: `${key} debe ser un entero entre 1 y 10` },
                        { status: 400 }
                    );
                }
            }
        }

        // Merge parcial: solo actualizar los campos enviados
        const current = await Settings.getValue('upselling_config') || DEFAULT_UPSELLING_CONFIG;
        const updated = {
            ...current,
            ...(maxInMenu !== undefined && { maxInMenu }),
            ...(maxInCheckout !== undefined && { maxInCheckout }),
            ...(maxInCart !== undefined && { maxInCart })
        };

        await Settings.setValue('upselling_config', updated);

        return NextResponse.json({
            message: 'Configuración de upselling actualizada',
            ...updated
        });
    } catch (error) {
        console.error('PUT /api/settings/upselling error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
