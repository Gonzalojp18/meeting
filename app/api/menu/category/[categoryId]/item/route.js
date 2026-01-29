import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';

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

    const menu = await Menu.findOne();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const category = menu.categories.id(categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    category.items.push(newItem);
    await menu.save();

    return NextResponse.json({ data: newItem }, { status: 201 });
  } catch (error) {
    console.error('POST /api/menu/category/[categoryId]/item error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
