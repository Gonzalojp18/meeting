import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import jwt from 'jsonwebtoken';

export async function PUT(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { locationId, config, menuType } = body;

    if (!locationId || !config) {
      return NextResponse.json({ error: 'locationId and config are required' }, { status: 400 });
    }

    const type = menuType || 'standard';
    const query = type === 'standard'
      ? { $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] }
      : { menuType: type };

    const menu = await Menu.findOne(query);
    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const location = menu.locations.find(l => l.nameId === locationId);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    location.scheduledOrdersConfig = {
      enabled: config.enabled ?? false,
      maxAdvanceHours: config.maxAdvanceHours ?? 24,
      minAdvanceMinutes: config.minAdvanceMinutes ?? 30,
      slotDurationMinutes: config.slotDurationMinutes ?? 15,
      maxOrdersPerSlot: config.maxOrdersPerSlot ?? 10,
      gracePeriodMinutes: config.gracePeriodMinutes ?? 15,
    };

    await menu.save();

    return NextResponse.json({ success: true, config: location.scheduledOrdersConfig });
  } catch (error) {
    console.error('[admin/scheduled-orders-config] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
