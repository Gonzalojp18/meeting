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
    const { locationId, config } = body;

    if (!locationId || !config) {
      return NextResponse.json({ error: 'locationId and config are required' }, { status: 400 });
    }

    const menus = await Menu.find({ 'locations.nameId': locationId });
    if (menus.length === 0) {
      console.error('[admin/scheduled-orders-config] No menu found with locationId:', locationId);
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    console.log(`[admin/scheduled-orders-config] Found ${menus.length} menu(s) with location ${locationId}`);

    for (const menu of menus) {
      const location = menu.locations.find(l => l.nameId === locationId);
      if (!location) continue;

      console.log(`[admin/scheduled-orders-config] Updating menu: ${menu.menuType || 'standard'}, location: ${location.name}`);

      location.scheduledOrdersConfig = {
        enabled: config.enabled ?? false,
        maxAdvanceHours: config.maxAdvanceHours ?? 24,
        minAdvanceMinutes: config.minAdvanceMinutes ?? 30,
        slotDurationMinutes: config.slotDurationMinutes ?? 15,
        maxOrdersPerSlot: config.maxOrdersPerSlot ?? 10,
        gracePeriodMinutes: config.gracePeriodMinutes ?? 15,
      };

      menu.markModified('locations');
      await menu.save();
    }

    return NextResponse.json({ success: true, config: menus[0].locations.find(l => l.nameId === locationId).scheduledOrdersConfig, menusUpdated: menus.length });
  } catch (error) {
    console.error('[admin/scheduled-orders-config] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
