import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import { validateApiKey } from '@/lib/auth/api-key';

/**
 * POST /api/integrations/n8n/products/bulk
 * Actualiza precios de TODOS los productos de una categoría.
 * Soporta cambio por porcentaje (aumento/descuento) o valor fijo.
 *
 * Body:
 *   categoryName  {string}  — nombre exacto de la categoría
 *   changeType    {string}  — "percentage" | "fixed"
 *   changeValue   {number}  — valor del cambio (ej: 10 para 10% ó 1500 para precio fijo)
 *   direction     {string}  — "increase" | "decrease" (solo aplica a changeType=percentage)
 *   locationKey   {string?} — "location1" | "location2"… null/omitido = todas las sedes
 *
 * Retorna:
 *   updated  {number}  — cantidad de productos actualizados
 *   results  {array}   — detalle por producto: nombre, precios anteriores y nuevos
 */
export async function POST(req) {
    if (!validateApiKey(req)) {
        return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
    }

    try {
        await dbConnect();

        const body = await req.json();
        const { categoryName, changeType, changeValue, direction, locationKey } = body;

        // ── Validaciones ────────────────────────────────────────────────────
        if (!categoryName?.trim()) {
            return NextResponse.json({ error: 'categoryName es requerido' }, { status: 400 });
        }
        if (!['percentage', 'fixed'].includes(changeType)) {
            return NextResponse.json({ error: 'changeType debe ser "percentage" o "fixed"' }, { status: 400 });
        }
        if (typeof changeValue !== 'number' || changeValue <= 0) {
            return NextResponse.json({ error: 'changeValue debe ser un número positivo' }, { status: 400 });
        }
        if (changeType === 'percentage' && !['increase', 'decrease'].includes(direction)) {
            return NextResponse.json({ error: 'direction debe ser "increase" o "decrease" para changeType=percentage' }, { status: 400 });
        }

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ error: 'Menú no encontrado' }, { status: 404 });
        }

        const category = menu.categories.find(
            c => c.name.toLowerCase() === categoryName.trim().toLowerCase()
        );
        if (!category) {
            return NextResponse.json(
                { error: `Categoría "${categoryName}" no encontrada` },
                { status: 404 }
            );
        }

        if (!category.items.length) {
            return NextResponse.json({ error: `La categoría "${categoryName}" no tiene productos` }, { status: 400 });
        }

        // ── Aplicar cambio ──────────────────────────────────────────────────
        const results = [];

        for (const item of category.items) {
            if (!item.prices) continue;

            const oldPrices = { ...item.prices.toObject?.() ?? item.prices };
            const newPrices = {};

            for (const [key, currentPrice] of Object.entries(oldPrices)) {
                // Filtrar por sede si se especificó locationKey
                if (locationKey && key !== locationKey) {
                    newPrices[key] = currentPrice;
                    continue;
                }

                if (typeof currentPrice !== 'number') {
                    newPrices[key] = currentPrice;
                    continue;
                }

                if (changeType === 'percentage') {
                    const multiplier = direction === 'increase'
                        ? (1 + changeValue / 100)
                        : (1 - changeValue / 100);
                    newPrices[key] = Math.max(0, Math.round(currentPrice * multiplier));
                } else {
                    // fixed: todos los productos de la categoría pasan al mismo precio
                    newPrices[key] = changeValue;
                }
            }

            // Aplicar nuevos precios
            for (const [key, val] of Object.entries(newPrices)) {
                item.prices[key] = val;
            }

            results.push({
                product:   item.name,
                oldPrices,
                newPrices,
            });
        }

        await menu.save();

        return NextResponse.json({
            success: true,
            categoryName: category.name,
            changeType,
            changeValue,
            direction: changeType === 'percentage' ? direction : null,
            locationKey: locationKey || 'all',
            updated: results.length,
            results,
        });

    } catch (error) {
        console.error('[n8n Products Bulk] Error:', error);
        return NextResponse.json({ error: 'Error en actualización masiva' }, { status: 500 });
    }
}
