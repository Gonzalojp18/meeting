import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import { getAvailableSlotsForDate } from '@/lib/scheduled-orders';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request, { params }) {
  try {
    const { locationId } = await params;
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');

    if (!dateStr || !DATE_REGEX.test(dateStr)) {
      return NextResponse.json({ error: 'Fecha inválida. Usar formato YYYY-MM-DD' }, { status: 400 });
    }

    const result = await getAvailableSlotsForDate(locationId, dateStr);

    return NextResponse.json({
      date: result.date,
      dayOpen: result.dayOpen,
      slots: result.slots,
    });
  } catch (error) {
    console.error('[scheduled-slots] Error:', error);
    return NextResponse.json({ error: 'Error al obtener franjas horarias' }, { status: 500 });
  }
}
