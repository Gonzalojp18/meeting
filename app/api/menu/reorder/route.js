import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';
import { logAuditFromJWT } from '@/utils/auditLoggerJWT';

// @desc Reorder categories or items within a category
// @route PUT /api/menu/reorder
// @access Private
export async function PUT(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return NextResponse.json({ error: 'Not authorized, no token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'admin' && decoded.role !== 'manager') {
        return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    await dbConnect();

    const { type, categoryId, orderedIds } = await req.json();

    if (!type || !orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (type === 'items' && !categoryId) {
      return NextResponse.json({ error: 'categoryId is required for item reordering' }, { status: 400 });
    }

    // Utilizar el categoryId (si type=items) o el primer category id de orderedIds (si type=categories) para ubicar el menú correcto
    const lookupCatId = type === 'items' ? categoryId : orderedIds[0];
    const menu = await Menu.findOne({ 'categories._id': lookupCatId });
    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    if (type === 'categories') {
      // Validate all IDs exist
      const existingIds = menu.categories.map(c => c._id.toString());
      const allExist = orderedIds.every(id => existingIds.includes(id));
      if (!allExist) {
        return NextResponse.json({ error: 'One or more category IDs not found' }, { status: 400 });
      }

      // Set order field based on position in orderedIds
      orderedIds.forEach((id, index) => {
        const cat = menu.categories.id(id);
        if (cat) cat.order = index;
      });

      // Also physically reorder the array to match
      menu.categories.sort((a, b) => a.order - b.order);

    } else if (type === 'items') {
      const category = menu.categories.id(categoryId);
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }

      const existingIds = category.items.map(i => i._id.toString());
      const allExist = orderedIds.every(id => existingIds.includes(id));
      if (!allExist) {
        return NextResponse.json({ error: 'One or more item IDs not found' }, { status: 400 });
      }

      orderedIds.forEach((id, index) => {
        const item = category.items.id(id);
        if (item) item.order = index;
      });

      category.items.sort((a, b) => a.order - b.order);

    } else {
      return NextResponse.json({ error: 'Invalid type. Use "categories" or "items"' }, { status: 400 });
    }

    await menu.save();

    // Audit log
    await logAuditFromJWT(req, {
      action: 'UPDATE',
      entity: type === 'categories' ? 'menu' : 'category',
      entityId: type === 'categories' ? 'menu' : categoryId,
      entityName: type === 'categories' ? 'Orden de categorías' : 'Orden de items',
      details: type === 'categories'
        ? `Reordenó ${orderedIds.length} categorías`
        : `Reordenó ${orderedIds.length} items en categoría`
    });

    return NextResponse.json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('PUT /api/menu/reorder error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
