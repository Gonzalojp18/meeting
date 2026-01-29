import dbConnect from './dbConnect';
import Settings from '../models/Settings';
import { decrypt } from './encryption';

/**
 * Obtiene las credenciales de Mercado Pago desencriptadas desde la base de datos.
 * @returns {{ publicKey: string, accessToken: string } | null}
 */
export async function getMPCredentials() {
  await dbConnect();

  const settings = await Settings.getValue('mercadopago_credentials');

  if (!settings || !settings.publicKey || !settings.accessToken) {
    return null;
  }

  try {
    return {
      publicKey: decrypt(settings.publicKey),
      accessToken: decrypt(settings.accessToken),
    };
  } catch (error) {
    console.error('Error desencriptando credenciales de MP:', error);
    return null;
  }
}
