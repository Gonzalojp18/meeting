import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';

// @desc Get Menu (Admin)
// @route GET /api/menu
// @access Private
export async function GET(req) {
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
    const menu = await Menu.findOne().select('-_id -createdAt -updatedAt -__v');

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json(menu);
  } catch (error) {
    console.error('GET /api/menu error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// @desc Create Menu
// @route POST /api/menu
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
    const body = await req.json();
    const menu = await Menu.create(body);

    if (menu) {
      return NextResponse.json(menu, { status: 201 });
    }

    return NextResponse.json({ error: 'Something went wrong while trying to create the Menu' }, { status: 500 });
  } catch (error) {
    console.error('POST /api/menu error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
