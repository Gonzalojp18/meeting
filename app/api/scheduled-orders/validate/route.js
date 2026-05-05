import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';
import { validateScheduledPickupTime } from '@/lib/scheduled-orders';

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { locationId, scheduledPickupAt, itemIds } = body;

    if (!locationId || !scheduledPickupAt) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    let menuItems;
    if (itemIds && itemIds.length > 0) {
      const menu = await Menu.findOne().lean();
      if (menu) {
        menuItems = [];
        for (const category of menu.categories) {
          if (!category.isActive) continue;
          for (const item of category.items) {
            if (itemIds.includes(item._id.toString())) {
              menuItems.push({
                availabilityMode: item.availabilityMode,
                availabilitySchedule: item.availabilitySchedule,
              });
            }
          }
        }
      }
    }

    const result = await validateScheduledPickupTime(locationId, new Date(scheduledPickupAt), menuItems);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('[scheduled-orders/validate] Error:', error);
    return NextResponse.json({ error: 'Error al validar horario' }, { status: 500 });
  }
}
