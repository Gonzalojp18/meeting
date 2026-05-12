import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AffiliateProspect from '@/models/AffiliateProspect';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🔒 Rate limiting para evitar brute-force de códigos
const ratelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  }),
  limiter: Ratelimit.slidingWindow(5, '5 m'),
  analytics: true,
});

export async function POST(req) {
  try {
    // 🔒 Rate Limiting Check
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const ip = req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        '127.0.0.1';

      const identifier = `discount_validate_${ip}`;
      const { success } = await ratelimit.limit(identifier);

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Demasiados intentos. Por favor, espera un momento.' },
          { status: 429 }
        );
      }
    }

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
