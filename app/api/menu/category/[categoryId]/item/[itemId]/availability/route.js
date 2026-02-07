import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';

// Roles permitidos para cambiar disponibilidad
const ALLOWED_ROLES = ['admin', 'manager', 'staff'];

// @desc Toggle Item Availability
// @route PATCH /api/menu/category/:categoryId/item/:itemId/availability
// @access Private (admin, manager, staff)
export async function PATCH(req, { params }) {
    try {
        // Verificar autenticación
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer')) {
            return NextResponse.json({ error: 'No autorizado, token faltante' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        // Verificar rol
        if (!ALLOWED_ROLES.includes(decoded.role)) {
            return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 });
        }

        await dbConnect();

        const { categoryId, itemId } = await params;
        const { isAvailable } = await req.json();

        // Validar que isAvailable sea booleano
        if (typeof isAvailable !== 'boolean') {
            return NextResponse.json({ error: 'isAvailable debe ser true o false' }, { status: 400 });
        }

        const menu = await Menu.findOne();

        if (!menu) {
            return NextResponse.json({ error: 'Menú no encontrado' }, { status: 404 });
        }

        const category = menu.categories.id(categoryId);

        if (!category) {
            return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
        }

        const item = category.items.id(itemId);

        if (!item) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        // Solo actualizar isAvailable
        item.isAvailable = isAvailable;
        await menu.save();

        console.log(`[AVAILABILITY] Usuario ${decoded.id} (${decoded.role}) cambió "${item.name}" a ${isAvailable ? 'disponible' : 'no disponible'}`);

        return NextResponse.json({
            success: true,
            message: `${item.name} ahora está ${isAvailable ? 'disponible' : 'no disponible'}`,
            item: {
                _id: item._id,
                name: item.name,
                isAvailable: item.isAvailable
            }
        });
    } catch (error) {
        console.error('PATCH /api/menu/category/[categoryId]/item/[itemId]/availability error:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
