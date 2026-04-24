import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';

// @desc Update Global Default Customizations for a Menu
// @route PUT /api/menu/defaults?type=executive
// @access Private
export async function PUT(req) {
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
    const { customizations } = await req.json();
    
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'standard';
    
    const menu = await Menu.findOneAndUpdate(
      { menuType: type },
      { defaultCustomizations: customizations },
      { new: true }
    );

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Defaults updated successfully', data: menu.defaultCustomizations });
  } catch (error) {
    console.error('PUT /api/menu/defaults error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
