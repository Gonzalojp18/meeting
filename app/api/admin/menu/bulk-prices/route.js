import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';

export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'manager'].includes(session.user.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        await dbConnect();

        const body = await req.json();
        const { menuType, categoryId, percentage, locationKeys } = body;

        if (!menuType || !['standard', 'executive'].includes(menuType)) {
            return NextResponse.json({ error: 'menuType debe ser "standard" o "executive"' }, { status: 400 });
        }
        if (!categoryId?.trim()) {
            return NextResponse.json({ error: 'categoryId es requerido' }, { status: 400 });
        }
        if (typeof percentage !== 'number' || percentage === 0 || percentage < -100) {
            return NextResponse.json({ error: 'percentage debe ser un número mayor a -100 y distinto de 0' }, { status: 400 });
        }

        const query = menuType === 'standard'
            ? { $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] }
            : { menuType: 'executive' };

        const menu = await Menu.findOne(query);
        if (!menu) {
            return NextResponse.json({ error: `Menú ${menuType} no encontrado` }, { status: 404 });
        }

        const category = menu.categories.id(categoryId);
        if (!category) {
            return NextResponse.json({ error: 'Categoría no encontrada en el menú' }, { status: 404 });
        }

        if (!category.items?.length) {
            return NextResponse.json({ error: 'La categoría no tiene productos' }, { status: 400 });
        }

        const multiplier = 1 + percentage / 100;
        const locationsToApply = locationKeys && locationKeys.length > 0
            ? locationKeys
            : null;

        // Claves conocidas del schema de precios (nunca iterar el subdocumento Mongoose directamente)
        const PRICE_KEYS = ['location1', 'location2', 'location3'];

        const preview = [];

        for (const item of category.items) {
            if (!item.prices) continue;

            // BUG FIX: Usar toObject() para obtener un plain object seguro del subdocumento Mongoose.
            // Hacer spread de un subdocumento Mongoose puede incluir internals ($__, $isNew, etc.)
            // y propagar `undefined` explícitamente a campos sin precio, que se persisten como null
            // y son luego filtrados por la API pública (price > 0), ocultando los items.
            const rawPrices = item.prices.toObject ? item.prices.toObject() : item.prices;

            // Solo operar sobre claves conocidas del schema
            const oldPrices = {};
            for (const key of PRICE_KEYS) {
                if (rawPrices[key] !== undefined && rawPrices[key] !== null) {
                    oldPrices[key] = rawPrices[key];
                }
            }

            const newPrices = { ...oldPrices }; // Partir de copia limpia sin undefined
            let changed = false;

            for (const [key, currentPrice] of Object.entries(oldPrices)) {
                // location3 nunca se modifica (solo visual)
                if (key === 'location3') continue;

                // Si se especificaron sedes concretas y esta no está incluida, no tocar
                if (locationsToApply && !locationsToApply.includes(key)) continue;

                // Solo aplicar si el precio es un número válido y > 0
                if (typeof currentPrice !== 'number' || currentPrice <= 0) continue;

                newPrices[key] = Math.max(1, Math.round(currentPrice * multiplier));
                changed = true;
            }

            if (changed) {
                // Solo escribir claves que existen en oldPrices para no crear campos null
                for (const [key, val] of Object.entries(newPrices)) {
                    item.prices[key] = val;
                }
            }

            preview.push({
                itemId: item._id.toString(),
                name: item.name,
                oldPrices,
                newPrices,
            });
        }

        // BUG FIX: markModified es necesario para que Mongoose detecte cambios
        // en subdocumentos anidados dentro de arrays (categories > items > prices)
        menu.markModified('categories');
        await menu.save();

        return NextResponse.json({
            success: true,
            menuType,
            categoryName: category.name,
            percentage,
            updated: preview.length,
            preview,
        });

    } catch (error) {
        console.error('[Bulk Prices] Error:', error);
        return NextResponse.json({ error: 'Error en actualización masiva de precios' }, { status: 500 });
    }
}
