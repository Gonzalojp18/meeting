import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import { validateApiKey } from '@/lib/auth/api-key';

// GET /api/integrations/n8n/categories - List all categories
export async function GET(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ categories: [] });
        }

        const categories = menu.categories.map(cat => ({
            _id: cat._id.toString(),
            name: cat.name,
            isActive: cat.isActive,
            itemCount: cat.items.length,
            printRole: cat.printRole,
        }));

        return NextResponse.json({ categories });
    } catch (error) {
        console.error('Error in n8n categories GET:', error);
        return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 });
    }
}

// POST /api/integrations/n8n/categories - Create a new category
export async function POST(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();

        const body = await req.json();
        const { name } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'El nombre de la categoría es requerido' }, { status: 400 });
        }

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
        }

        const existing = menu.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
        if (existing) {
            return NextResponse.json({ error: `La categoría "${name}" ya existe` }, { status: 409 });
        }

        menu.categories.push({ name: name.trim() });
        await menu.save();

        const created = menu.categories[menu.categories.length - 1];

        return NextResponse.json({
            msg: `Categoría "${created.name}" creada con éxito`,
            category: { _id: created._id.toString(), name: created.name }
        }, { status: 201 });
    } catch (error) {
        console.error('Error in n8n categories POST:', error);
        return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
    }
}

// PUT /api/integrations/n8n/categories - Update category by current name
export async function PUT(req) {
    try {
        if (!validateApiKey(req)) {
            return NextResponse.json({ error: 'No autorizado / Token inválido' }, { status: 401 });
        }

        await dbConnect();

        const body = await req.json();
        const { name, newName, isActive } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'El campo "name" es requerido para identificar la categoría' }, { status: 400 });
        }

        const menu = await Menu.findOne();
        if (!menu) {
            return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
        }

        const category = menu.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
        if (!category) {
            return NextResponse.json({ error: `Categoría "${name}" no encontrada` }, { status: 404 });
        }

        if (newName !== undefined) category.name = newName.trim();
        if (isActive !== undefined) category.isActive = Boolean(isActive);

        await menu.save();

        return NextResponse.json({
            msg: `Categoría actualizada con éxito`,
            category: { _id: category._id.toString(), name: category.name, isActive: category.isActive }
        });
    } catch (error) {
        console.error('Error in n8n categories PUT:', error);
        return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
    }
}

// DELETE /api/integrations/n8n/categories?name=categoria - Delete category by name
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

        const index = menu.categories.findIndex(c => c.name.toLowerCase() === name.trim().toLowerCase());
        if (index === -1) {
            return NextResponse.json({ error: `Categoría "${name}" no encontrada` }, { status: 404 });
        }

        const deletedName = menu.categories[index].name;
        const itemCount = menu.categories[index].items.length;
        menu.categories.splice(index, 1);
        await menu.save();

        return NextResponse.json({
            msg: `Categoría "${deletedName}" eliminada (${itemCount} producto${itemCount !== 1 ? 's' : ''} eliminado${itemCount !== 1 ? 's' : ''})`
        });
    } catch (error) {
        console.error('Error in n8n categories DELETE:', error);
        return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
    }
}
