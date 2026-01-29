import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';
import { encrypt, decrypt, maskValue } from '@/utils/encryption';
import jwt from 'jsonwebtoken';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Verificar que el usuario sea admin
function verifyAdmin(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

// @desc Obtener estado de credenciales MP (enmascaradas)
// @route GET /api/settings/mercadopago
// @access Admin only
export async function GET(req) {
  try {
    const user = verifyAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const settings = await Settings.getValue('mercadopago_credentials');

    if (!settings || !settings.publicKey || !settings.accessToken) {
      return NextResponse.json({
        configured: false,
        publicKey: '',
        accessToken: '',
        mode: null,
      });
    }

    // Desencriptar para enmascarar
    let publicKeyDecrypted = '';
    let accessTokenDecrypted = '';
    let mode = null;

    try {
      publicKeyDecrypted = decrypt(settings.publicKey);
      accessTokenDecrypted = decrypt(settings.accessToken);
      // Detectar si es test o producción
      mode = accessTokenDecrypted.startsWith('TEST-') ? 'test' : 'production';
    } catch {
      return NextResponse.json({
        configured: false,
        publicKey: '',
        accessToken: '',
        mode: null,
        error: 'Error al leer credenciales. Reconfigúralas.',
      });
    }

    return NextResponse.json({
      configured: true,
      publicKey: maskValue(publicKeyDecrypted),
      accessToken: maskValue(accessTokenDecrypted),
      mode,
    });
  } catch (error) {
    console.error('GET /api/settings/mercadopago error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// @desc Guardar credenciales MP (encriptadas)
// @route POST /api/settings/mercadopago
// @access Admin only
export async function POST(req) {
  try {
    const user = verifyAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const { publicKey, accessToken } = await req.json();

    if (!publicKey || !accessToken) {
      return NextResponse.json(
        { error: 'Se requieren Public Key y Access Token' },
        { status: 400 }
      );
    }

    // Validar formato básico
    const pkTrimmed = publicKey.trim();
    const atTrimmed = accessToken.trim();

    if (!pkTrimmed.startsWith('APP_USR-') && !pkTrimmed.startsWith('TEST-')) {
      return NextResponse.json(
        { error: 'La Public Key no tiene un formato válido de Mercado Pago' },
        { status: 400 }
      );
    }

    if (!atTrimmed.startsWith('APP_USR-') && !atTrimmed.startsWith('TEST-')) {
      return NextResponse.json(
        { error: 'El Access Token no tiene un formato válido de Mercado Pago' },
        { status: 400 }
      );
    }

    // Validar que el Access Token funcione haciendo una llamada real a MP
    try {
      const client = new MercadoPagoConfig({ accessToken: atTrimmed });
      const payment = new Payment(client);
      // Buscar payments recientes como test de conexión
      await payment.search({ options: { limit: 1 } });
    } catch (mpError) {
      console.error('MP validation error:', mpError);
      return NextResponse.json(
        { error: 'El Access Token no es válido. Verifica que sea correcto en tu panel de Mercado Pago.' },
        { status: 400 }
      );
    }

    // Encriptar y guardar
    const encryptedCredentials = {
      publicKey: encrypt(pkTrimmed),
      accessToken: encrypt(atTrimmed),
    };

    await Settings.setValue('mercadopago_credentials', encryptedCredentials);

    const mode = atTrimmed.startsWith('TEST-') ? 'test' : 'production';

    return NextResponse.json({
      message: 'Credenciales guardadas correctamente',
      configured: true,
      mode,
    });
  } catch (error) {
    console.error('POST /api/settings/mercadopago error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// @desc Eliminar credenciales MP
// @route DELETE /api/settings/mercadopago
// @access Admin only
export async function DELETE(req) {
  try {
    const user = verifyAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    await Settings.findOneAndDelete({ key: 'mercadopago_credentials' });

    return NextResponse.json({ message: 'Credenciales eliminadas' });
  } catch (error) {
    console.error('DELETE /api/settings/mercadopago error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
