import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import { activateScheduledOrders } from '@/lib/scheduled-orders';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { activated, expired } = await activateScheduledOrders();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      activated,
      expired,
    });
  } catch (error) {
    console.error('[Cron:activate-scheduled-orders] Error:', error);
    return NextResponse.json(
      { error: 'Error ejecutando cron job', details: String(error) },
      { status: 500 }
    );
  }
}
