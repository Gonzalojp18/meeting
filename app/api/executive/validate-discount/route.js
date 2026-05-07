import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AffiliateProspect from '@/models/AffiliateProspect';

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { discountCode, locationId } = body;

    if (!discountCode) {
      return NextResponse.json(
        { success: false, error: 'Código de descuento requerido' },
        { status: 400 }
      );
    }

    const prospect = await AffiliateProspect.findOne({ discountCode });

    if (!prospect) {
      return NextResponse.json(
        { success: false, error: 'Código no válido' },
        { status: 404 }
      );
    }

    if (prospect.discountUsed) {
      return NextResponse.json(
        { success: false, error: 'Este código ya fue utilizado' },
        { status: 400 }
      );
    }

    if (locationId && prospect.locationId !== locationId) {
      return NextResponse.json(
        { success: false, error: 'Este código no es válido para esta sede' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      discountPercentage: prospect.discountPercentage,
      prospectName: prospect.name,
      company: prospect.company,
      message: `Descuento de ${prospect.discountPercentage}% aplicado`
    });

  } catch (error) {
    console.error('Validate discount error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
