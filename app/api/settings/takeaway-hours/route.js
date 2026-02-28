import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';
import jwt from 'jsonwebtoken';
import { DEFAULT_TAKEAWAY_HOURS } from '@/utils/constants';

// @desc Obtener horarios de takeaway
// @route GET /api/settings/takeaway-hours
// @access Public
export async function GET() {
  try {
    await dbConnect();

    const hours = await Settings.getValue('takeawayHours');

    return NextResponse.json(hours || DEFAULT_TAKEAWAY_HOURS);
  } catch (error) {
    console.error('GET /api/settings/takeaway-hours error:', error);
    return NextResponse.json(DEFAULT_TAKEAWAY_HOURS);
  }
}

// @desc Actualizar horarios de takeaway
// @route PUT /api/settings/takeaway-hours
// @access Admin only
export async function PUT(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!['admin', 'superadmin'].includes(decoded.role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const { open, close } = await req.json();

    if (!open || !close) {
      return NextResponse.json(
        { error: 'Se requieren horario de apertura y cierre' },
        { status: 400 }
      );
    }

    // Validar formato HH:MM
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(open) || !timeRegex.test(close)) {
      return NextResponse.json(
        { error: 'Formato de hora inválido. Use HH:MM (ej: 08:30)' },
        { status: 400 }
      );
    }

    await Settings.setValue('takeawayHours', { open, close });

    return NextResponse.json({
      message: 'Horarios actualizados correctamente',
      open,
      close
    });
  } catch (error) {
    console.error('PUT /api/settings/takeaway-hours error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
