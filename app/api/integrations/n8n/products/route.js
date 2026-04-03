import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import { validateApiKey } from '@/lib/auth/api-key';

export async function GET(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ products: [] });
        }

        // Mapear sedes: location1, location2… → nameId + nombre legible
        const locationMap = (menu.locations || []).reduce((acc, loc, index) => {
            acc[`location${index + 1}`] = { nameId: loc.nameId, name: loc.name };
            return acc;
        }, {});

        let products = [];
        const lowerQuery = query ? query.toLowerCase() : '';

        for (const category of menu.categories) {
            for (const item of category.items) {
                if (!lowerQuery || item.name.toLowerCase().includes(lowerQuery)) {
                    // Retornar todos los precios con clave y nombre de sede
                    const prices = {};
                    const pricesLabeled = {};
                    if (item.prices) {
                        const raw = item.prices.toObject ? item.prices.toObject() : { ...item.prices };
                        for (const [key, val] of Object.entries(raw)) {
                            if (typeof val === 'number') {
                                prices[key] = val;
                                const locInfo = locationMap[key];
                                if (locInfo) pricesLabeled[locInfo.name || key] = { key, price: val };
                            }
                        }
                    }
                    products.push({
                        categoryId:   category._id.toString(),
                        itemId:       item._id.toString(),
                        categoryName: category.name,
                        name:         item.name,
                        prices,         // { location1: 2500, location2: 2700 }
                        pricesLabeled,  // { "Centro": { key: "location1", price: 2500 }, … }
                        isAvailable:  item.isAvailable,
                        description:  item.description,
                    });
                }
            }
        }

        // Devolver un array corto para no saturar el contexto de la IA en n8n
        return NextResponse.json({
            products: products.slice(0, 10),
            locationMap,
        });
    } catch (error) {
        console.error('Error in n8n products API GET:', error);
        return NextResponse.json({ error: 'Error al buscar productos' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { categoryId, itemId, price, isAvailable, name, description } = body;

        if (!categoryId || !itemId) {
            return NextResponse.json({ error: 'categoryId e itemId son requeridos en el JSON body' }, { status: 400 });
        }

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
        }

        const category = menu.categories.id(categoryId);
        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        const item = category.items.id(itemId);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Aplicamos mutaciones según lo que haya enviado n8n (Gemini AI)
        if (name !== undefined) item.name = name;
        if (description !== undefined) item.description = description;
        if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);

        if (price !== undefined) {
            const numericPrice = Number(price);
            if (item.prices) {
                item.prices.location1 = numericPrice;
                // Opcional: replicar a otras ubicaciones si el bot actúa globalmente
                if (item.prices.location2 !== undefined) item.prices.location2 = numericPrice;
                if (item.prices.location3 !== undefined) item.prices.location3 = numericPrice;
            } else {
                item.prices = { location1: numericPrice };
            }
        }

        await menu.save();

        return NextResponse.json({
            msg: 'Producto actualizado con éxito',
            product: {
                name: item.name,
                price: item.prices?.location1,
                isAvailable: item.isAvailable
            }
        });
    } catch (error) {
        console.error('Error in n8n products API PUT:', error);
        return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
    }
}

// PATCH /api/integrations/n8n/products - Update product by name (for n8n/AI use)
export async function PATCH(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        // prices: objeto por sede { location1: 2500, location2: 2700 } (nuevo, recomendado)
        // price: número (legacy - aplica a todas las sedes)
        const { name, price, prices, isAvailable, newName, description } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'El campo "name" es requerido para identificar el producto' }, { status: 400 });
        }

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
        }

        let foundItem = null;
        let foundCategory = null;
        const lowerName = name.trim().toLowerCase();

        for (const category of menu.categories) {
            const item = category.items.find(i => i.name.toLowerCase() === lowerName);
            if (item) { foundItem = item; foundCategory = category; break; }
        }

        if (!foundItem) {
            return NextResponse.json({ error: `Producto "${name}" no encontrado` }, { status: 404 });
        }

        if (newName !== undefined)    foundItem.name        = newName.trim();
        if (description !== undefined) foundItem.description = description.trim();
        if (isAvailable !== undefined) foundItem.isAvailable = Boolean(isAvailable);

        if (prices && typeof prices === 'object') {
            // Actualización por sede: solo modifica las claves provistas
            if (!foundItem.prices) foundItem.prices = {};
            for (const [key, val] of Object.entries(prices)) {
                if (typeof val === 'number' && val >= 0) {
                    foundItem.prices[key] = val;
                }
            }
        } else if (price !== undefined) {
            // Legacy: aplica el mismo precio a todas las sedes existentes
            const numericPrice = Number(price);
            if (!foundItem.prices) {
                foundItem.prices = { location1: numericPrice };
            } else {
                const raw = foundItem.prices.toObject ? foundItem.prices.toObject() : { ...foundItem.prices };
                for (const key of Object.keys(raw)) {
                    foundItem.prices[key] = numericPrice;
                }
            }
        }

        await menu.save();

        const updatedPrices = foundItem.prices?.toObject
            ? foundItem.prices.toObject()
            : { ...foundItem.prices };

        return NextResponse.json({
            msg: `Producto actualizado con éxito`,
            product: {
                itemId:       foundItem._id.toString(),
                categoryId:   foundCategory._id.toString(),
                name:         foundItem.name,
                prices:       updatedPrices,
                isAvailable:  foundItem.isAvailable,
                categoryName: foundCategory.name,
            },
        });
    } catch (error) {
        console.error('Error in n8n products API PATCH:', error);
        return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
    }
}

// POST /api/integrations/n8n/products - Create product in a category (by category name)
export async function POST(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { categoryName, name, price, description, isAvailable } = body;

        if (!categoryName?.trim() || !name?.trim() || price === undefined) {
            return NextResponse.json({ error: 'categoryName, name y price son requeridos' }, { status: 400 });
        }

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
        }

        const category = menu.categories.find(c => c.name.toLowerCase() === categoryName.trim().toLowerCase());
        if (!category) {
            return NextResponse.json({ error: `Categoría "${categoryName}" no encontrada` }, { status: 404 });
        }

        category.items.push({
            name: name.trim(),
            description: description?.trim() || '',
            prices: { location1: Number(price) },
            isAvailable: isAvailable !== false,
        });

        await menu.save();

        const created = category.items[category.items.length - 1];

        return NextResponse.json({
            msg: `Producto "${created.name}" creado con éxito`,
            product: {
                itemId: created._id.toString(),
                categoryId: category._id.toString(),
                name: created.name,
                price: created.prices?.location1,
                categoryName: category.name,
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Error in n8n products API POST:', error);
        return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
    }
}

// DELETE /api/integrations/n8n/products?name=producto - Delete product by name
export async function DELETE(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const name = searchParams.get('name');

        if (!name?.trim()) {
            return NextResponse.json({ error: 'El parámetro "name" es requerido' }, { status: 400 });
        }

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
        }

        let deleted = null;
        const lowerName = name.trim().toLowerCase();

        for (const category of menu.categories) {
            const idx = category.items.findIndex(i => i.name.toLowerCase() === lowerName);
            if (idx !== -1) {
                deleted = { name: category.items[idx].name, categoryName: category.name };
                category.items.splice(idx, 1);
                break;
            }
        }

        if (!deleted) {
            return NextResponse.json({ error: `Producto "${name}" no encontrado` }, { status: 404 });
        }

        await menu.save();

        return NextResponse.json({ msg: `Producto "${deleted.name}" eliminado de "${deleted.categoryName}"` });
    } catch (error) {
        console.error('Error in n8n products API DELETE:', error);
        return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
    }
}
