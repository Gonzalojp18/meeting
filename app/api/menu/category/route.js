import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';
import { logAuditFromJWT } from '@/utils/auditLoggerJWT';

// @desc Create Category
// @route POST /api/menu/category
// @access Private
export async function POST(req) {
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

    const newCategory = await req.json();

    const menu = await Menu.findOne();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    // Calcular siguiente orden
    const maxOrder = menu.categories.reduce((max, cat) => Math.max(max, cat.order || 0), -1);

    // Agregar la nueva categoría al array con estructura correcta
    menu.categories.push({
      name: newCategory.name,
      subtitle: newCategory.subtitle || '',
      style: newCategory.style || 'default',
      image: newCategory.image || {},
      locations: newCategory.locations || [],
      items: [],
      isActive: true,
      printRole: newCategory.printRole || 'kitchen',
      schedule: newCategory.schedule || {
        availableFrom: null,
        availableTo: null
      },
      order: maxOrder + 1
    });

    await menu.save();

    const createdCategory = menu.categories[menu.categories.length - 1];

    // Registrar en audit log
    await logAuditFromJWT(req, {
      action: 'CREATE',
      entity: 'category',
      entityId: createdCategory._id?.toString(),
      entityName: newCategory.name,
      details: `Creó la categoría "${newCategory.name}"`
    });

    return NextResponse.json({
      message: 'Category created successfully',
      data: menu.categories[menu.categories.length - 1]
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/menu/category error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}