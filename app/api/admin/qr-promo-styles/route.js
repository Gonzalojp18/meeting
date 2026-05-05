import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'superadmin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const styles = await Settings.getValue('qrPromoStyles');

    return NextResponse.json({
      qrPromoStyles: styles || {
        primaryColor: '#F74211',
        backgroundColor: '#FFF5F0',
        badgeColor: '#F74211',
        borderRadius: '24px',
        buttonColor: '#F74211',
      }
    });
  } catch (error) {
    console.error('QR Promo Styles GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'superadmin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();

    await dbConnect();

    const settings = await Settings.setValue('qrPromoStyles', body);

    return NextResponse.json({ success: true, qrPromoStyles: settings.value });
  } catch (error) {
    console.error('QR Promo Styles PUT error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
