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
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'standard';
    const query = type === 'standard' 
      ? { $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] } 
      : { menuType: type };
      
    let menu = await Menu.findOne(query).select('-_id -createdAt -updatedAt -__v').lean();

    if (!menu) {
      if (type !== 'standard') {
        const standardMenu = await Menu.findOne({ $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] }).lean();
        if (standardMenu) {
          const newMenuDoc = await Menu.create({
            menuType: type,
            categories: [],
            locations: standardMenu.locations || []
          });
          menu = newMenuDoc.toObject();
        } else {
          return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
      }
    }

    // Normalizar datos para evitar undefined en campos nuevos
    const normalizedMenu = {
      ...menu,
      categories: (menu.categories || []).map(category => ({
        ...category,
        locations: category.locations || [],
        isActive: category.isActive !== false,
        style: category.style || 'default',
        image: category.image || {},
        order: category.order || 0,
        items: (category.items || []).map(item => ({
          ...item,
          order: item.order || 0
        })).sort((a, b) => a.order - b.order)
      })).sort((a, b) => a.order - b.order)
    };

    return NextResponse.json(normalizedMenu);
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
    if (!body.menuType) {
      body.menuType = 'standard';
    }
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
