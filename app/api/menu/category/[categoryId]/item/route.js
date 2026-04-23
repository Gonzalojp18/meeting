import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';
import { logAuditFromJWT } from '@/utils/auditLoggerJWT';

// @desc Add Item to Category
// @route POST /api/menu/category/:categoryId/item
// @access Private
export async function POST(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return NextResponse.json({ error: 'Not authorized, no token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    await dbConnect();

    const { categoryId } = await params;
    const newItem = await req.json();

    const menu = await Menu.findOne({ 'categories._id': categoryId });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const category = menu.categories.id(categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Calcular siguiente orden para el nuevo item
    const maxItemOrder = category.items.reduce((max, item) => Math.max(max, item.order || 0), -1);
    newItem.order = maxItemOrder + 1;

    // Ensure newItem has proper prices structure
    if (newItem.prices && typeof newItem.prices === 'object') {
      // Convert flat prices structure to nested if needed
      if (newItem.prices.location1 !== undefined ||
          newItem.prices.location2 !== undefined ||
          newItem.prices.location3 !== undefined) {
        // Already in correct format
        category.items.push(newItem);
      } else {
        // Convert from flat structure to location-based structure
        const convertedItem = {
          ...newItem,
          prices: {
            location1: newItem.prices,
            location2: newItem.prices,
            location3: newItem.prices
          }
        };
        category.items.push(convertedItem);
      }
    } else {
      // Handle items with no prices or invalid structure
      category.items.push({
        ...newItem,
        prices: {
          location1: 0,
          location2: 0,
          location3: 0
        }
      });
    }
    
    await menu.save();

    // Registrar en audit log
    const createdItem = category.items[category.items.length - 1];
    await logAuditFromJWT(req, {
      action: 'CREATE',
      entity: 'dish',
      entityId: createdItem._id?.toString(),
      entityName: newItem.name,
      details: `Creó el plato "${newItem.name}" en la categoría "${category.name}"`
    });

    return NextResponse.json({ data: newItem }, { status: 201 });
  } catch (error) {
    console.error('POST /api/menu/category/[categoryId]/item error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
