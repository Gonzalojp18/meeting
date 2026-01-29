import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';

// @desc Update Category
// @route PUT /api/menu/category/:categoryId
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

    const { categoryId } = await params;
    const updatedData = await req.json();

    const menu = await Menu.findOne();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const category = menu.categories.id(categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Actualizar solo los campos permitidos
    if (updatedData.name !== undefined) category.name = updatedData.name;
    if (updatedData.subtitle !== undefined) category.subtitle = updatedData.subtitle;
    if (updatedData.style !== undefined) category.style = updatedData.style;
    if (updatedData.image !== undefined) category.image = updatedData.image;
    if (updatedData.locations !== undefined) category.locations = updatedData.locations;
    if (updatedData.isActive !== undefined) category.isActive = updatedData.isActive;

    await menu.save();

    return NextResponse.json({ 
      message: 'Category updated successfully',
      data: category 
    });
  } catch (error) {
    console.error('PUT /api/menu/category/[categoryId] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// @desc Delete Category (Soft Delete)
// @route DELETE /api/menu/category/:categoryId
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

    const { categoryId } = await params;

    const menu = await Menu.findOne();

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const category = menu.categories.id(categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Soft delete: marcar como inactiva
    category.isActive = false;

    await menu.save();

    return NextResponse.json({ 
      message: 'Category deactivated successfully'
    });
  } catch (error) {
    console.error('DELETE /api/menu/category/[categoryId] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}