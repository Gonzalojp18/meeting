import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';

// @desc Update Item in Menu
// @route PUT /api/menu/category/:categoryId/item/:itemId
// @access Private
export async function PUT(req, { params }) {
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

    const { categoryId, itemId } = await params;
    const updatedItem = await req.json();

    const menu = await Menu.findOne();

    if (!menu) {
      return NextResponse.json({ msg: 'Menu not found' }, { status: 404 });
    }

    const category = menu.categories.id(categoryId);

    if (!category) {
      return NextResponse.json({ msg: 'Category not found' }, { status: 404 });
    }

    const item = category.items.id(itemId);

    if (!item) {
      return NextResponse.json({ msg: 'Item not found' }, { status: 404 });
    }

    Object.assign(item, updatedItem);
    await menu.save();

    return NextResponse.json({ msg: 'Item was successfully updated' });
  } catch (error) {
    console.error('PUT /api/menu/category/[categoryId]/item/[itemId] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// @desc Delete Item from Menu
// @route DELETE /api/menu/category/:categoryId/item/:itemId
// @access Private
export async function DELETE(req, { params }) {
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

    const { categoryId, itemId } = await params;

    const menu = await Menu.findOne();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const category = menu.categories.id(categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const itemIndex = category.items.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    category.items.splice(itemIndex, 1);
    await menu.save();

    return NextResponse.json({ msg: `Item with the id ${itemId} was successfully deleted` });
  } catch (error) {
    console.error('DELETE /api/menu/category/[categoryId]/item/[itemId] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
