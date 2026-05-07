import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AffiliateProspect from '@/models/AffiliateProspect';
import Menu from '@/models/Menu';
import { hashForSearch, encrypt } from '@/utils/encryption';


const standardQuery = {
  $or: [
    { menuType: 'standard' },
    { menuType: { $exists: false } },
    { menuType: null }
  ]
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, phone, company, position, locationId, discount } = body;

    if (!name || !phone || !company || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: name, phone, company, locationId' },
        { status: 400 }
      );
    }

    await dbConnect();

    const menu = await Menu.findOne(standardQuery).lean();
    if (!menu) {
      return NextResponse.json({ success: false, error: 'Menu no encontrado' }, { status: 404 });
    }

    const location = menu.locations.find(loc => loc.nameId === locationId);
    if (!location) {
      return NextResponse.json({ success: false, error: 'Location no encontrada' }, { status: 404 });
    }

    const discountPercentage = discount || location.affiliateClub?.discountPercentage || 10;

    const phoneHash = hashForSearch(phone);
    const existingByPhone = await AffiliateProspect.findOne({ phoneHash });
    if (existingByPhone) {
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        discountCode: existingByPhone.discountCode,
        discountPercentage: existingByPhone.discountPercentage
      });
    }

    // Generar hashes y encriptar antes de guardar (evita problemas con pre-validate)
    const nameHash = hashForSearch(name);
    const encryptedPhone = encrypt(phone);
    const encryptedName = encrypt(name);
    const encryptedCompany = encrypt(company);
    const encryptedEmail = email ? encrypt(email) : undefined;
    const encryptedPosition = position ? encrypt(position) : undefined;

    const discountCode = `B2B-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const prospect = new AffiliateProspect({
      phone: encryptedPhone,
      phoneHash,
      email: encryptedEmail,
      emailHash: email ? hashForSearch(email) : undefined,
      name: encryptedName,
      nameHash,
      company: encryptedCompany,
      position: encryptedPosition,
      locationId,
      source: 'qr',
      discountPercentage,
      status: 'new',
      discountCode
    });

    await prospect.save();

    return NextResponse.json({
      success: true,
      discountCode: prospect.discountCode,
      discountPercentage: prospect.discountPercentage,
      message: 'Registro exitoso'
    });

  } catch (error) {
    console.error('Affiliate Register POST error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
