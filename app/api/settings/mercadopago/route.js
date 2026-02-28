import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';
import User from '@/models/User';
import { encrypt, decrypt, maskValue } from '@/utils/encryption';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { MercadoPagoConfig, Payment } from 'mercadopago';

/**
 * SEGURIDAD VULN-007: Protección contra secuestro de pasarela de pago
 *
 * Este endpoint maneja credenciales críticas de MercadoPago.
 * Cambiar estas credenciales redirige TODOS los pagos a otra cuenta.
 *
 * Protecciones implementadas:
 * 1. Solo usuarios con rol 'admin' pueden acceder
 * 2. POST/DELETE requieren confirmación de contraseña
 * 3. Auditoría de todas las operaciones
 */

// Verificar que el usuario sea admin y extraer info del token
function verifyAdmin(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') return null;
    return decoded;
  } catch {
    return null;
  }
}

// Log de auditoría para operaciones críticas
function logAudit(action, userId, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT][${timestamp}] ${action} | User: ${userId} | Details:`, JSON.stringify(details));
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
    try {
      const publicKeyDecrypted = decrypt(settings.publicKey);
      const accessTokenDecrypted = decrypt(settings.accessToken);
      const webhookSecretDecrypted = settings.webhookSecret ? decrypt(settings.webhookSecret) : '';
      // Detectar si es test o producción
      const mode = accessTokenDecrypted.startsWith('TEST-') ? 'test' : 'production';

      return NextResponse.json({
        configured: true,
        publicKey: maskValue(publicKeyDecrypted),
        accessToken: maskValue(accessTokenDecrypted),
        webhookSecret: webhookSecretDecrypted ? maskValue(webhookSecretDecrypted) : '',
        mode,
      });
    } catch (innerError) {
      console.error('Error desencriptando credenciales en GET:', innerError);
      return NextResponse.json({
        configured: false,
        publicKey: '',
        accessToken: '',
        mode: null,
        error: 'Error al leer credenciales. Reconfigúralas.',
      });
    }
  } catch (error) {
    console.error('GET /api/settings/mercadopago error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// @desc Guardar credenciales MP (encriptadas)
// @route POST /api/settings/mercadopago
// @access Admin only - REQUIERE VERIFICACIÓN DE CONTRASEÑA
export async function POST(req) {
  try {
    const user = verifyAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const { publicKey, accessToken, webhookSecret, currentPassword } = await req.json();

    // =====================================================
    // SEGURIDAD: Verificar contraseña actual del admin
    // =====================================================
    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Se requiere la contraseña actual para modificar credenciales de pago.' },
        { status: 400 }
      );
    }

    // Buscar el usuario admin
    const adminUser = await User.findById(user.userId);
    if (!adminUser) {
      logAudit('MP_CREDENTIALS_CHANGE_FAILED', user.userId, { reason: 'User not found' });
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isPasswordValid) {
      logAudit('MP_CREDENTIALS_CHANGE_FAILED', user.userId, {
        reason: 'Invalid password',
        email: adminUser.email
      });
      return NextResponse.json(
        { error: 'Contraseña incorrecta.' },
        { status: 401 }
      );
    }

    // Validar que se proporcionaron las credenciales
    if (!publicKey || !accessToken || !webhookSecret) {
      return NextResponse.json(
        { error: 'Se requieren Public Key, Access Token y Webhook Secret' },
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
      await payment.search({ options: { limit: 1 } });
    } catch (mpError) {
      console.error('MP validation error:', mpError);
      logAudit('MP_CREDENTIALS_CHANGE_FAILED', user.userId, {
        reason: 'Invalid MP token',
        email: adminUser.email
      });
      return NextResponse.json(
        { error: 'El Access Token no es válido. Verifica que sea correcto en tu panel de Mercado Pago.' },
        { status: 400 }
      );
    }

    // Obtener credenciales anteriores para el log
    const previousSettings = await Settings.getValue('mercadopago_credentials');
    let previousTokenPrefix = 'none';
    if (previousSettings?.accessToken) {
      try {
        const prevToken = decrypt(previousSettings.accessToken);
        previousTokenPrefix = prevToken.substring(0, 15) + '...';
      } catch {
        previousTokenPrefix = 'encrypted';
      }
    }

    // Encriptar y guardar
    const encryptedCredentials = {
      publicKey: encrypt(pkTrimmed),
      accessToken: encrypt(atTrimmed),
      webhookSecret: encrypt(webhookSecret.trim()),
    };

    await Settings.setValue('mercadopago_credentials', encryptedCredentials);

    const mode = atTrimmed.startsWith('TEST-') ? 'test' : 'production';

    // Log de auditoría exitoso
    logAudit('MP_CREDENTIALS_CHANGED', user.userId, {
      email: adminUser.email,
      newTokenPrefix: atTrimmed.substring(0, 15) + '...',
      previousTokenPrefix,
      mode,
      timestamp: new Date().toISOString()
    });

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
// @access Admin only - REQUIERE VERIFICACIÓN DE CONTRASEÑA
export async function DELETE(req) {
  try {
    const user = verifyAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    // Para DELETE, la contraseña viene en el body
    let currentPassword;
    try {
      const body = await req.json();
      currentPassword = body.currentPassword;
    } catch {
      currentPassword = null;
    }

    // =====================================================
    // SEGURIDAD: Verificar contraseña actual del admin
    // =====================================================
    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Se requiere la contraseña actual para eliminar credenciales de pago.' },
        { status: 400 }
      );
    }

    const adminUser = await User.findById(user.userId);
    if (!adminUser) {
      logAudit('MP_CREDENTIALS_DELETE_FAILED', user.userId, { reason: 'User not found' });
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isPasswordValid) {
      logAudit('MP_CREDENTIALS_DELETE_FAILED', user.userId, {
        reason: 'Invalid password',
        email: adminUser.email
      });
      return NextResponse.json(
        { error: 'Contraseña incorrecta.' },
        { status: 401 }
      );
    }

    await Settings.findOneAndDelete({ key: 'mercadopago_credentials' });

    // Log de auditoría
    logAudit('MP_CREDENTIALS_DELETED', user.userId, {
      email: adminUser.email,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ message: 'Credenciales eliminadas' });
  } catch (error) {
    console.error('DELETE /api/settings/mercadopago error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
