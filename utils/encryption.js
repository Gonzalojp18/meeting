import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Usa AUTH_SECRET como clave de encriptación (ya existe en .env)
function getEncryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET no está configurado en las variables de entorno');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Genera un hash determinístico (HMAC-SHA256) para búsquedas en DB.
 * A diferencia del AES-GCM (IV aleatorio → ciphertext distinto cada vez),
 * produce siempre el mismo resultado → permite unique indexes y queries exactas.
 *
 * @param {string} value - Valor a hashear (email, teléfono)
 * @returns {string|null} - Hash hexadecimal de 64 chars
 */
export function hashForSearch(value) {
  if (!value) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET no configurado');
  return crypto.createHmac('sha256', secret)
    .update(String(value).toLowerCase().trim())
    .digest('hex');
}

/**
 * Encripta un texto plano usando AES-256-GCM.
 * @param {string} plainText - Texto a encriptar
 * @returns {string} - Formato: iv:encrypted:tag (hex)
 */
export function encrypt(plainText) {
  if (!plainText) return plainText;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Desencripta un texto cifrado con AES-256-GCM.
 * Si el valor no parece cifrado (sin formato iv:enc:tag), lo devuelve tal cual.
 * Esto permite migración gradual: datos viejos en texto plano conviven
 * con datos nuevos cifrados sin romper lecturas.
 *
 * @param {string} encryptedText - Formato iv:encrypted:tag
 * @returns {string} - Texto plano
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;

  // Si no tiene el formato iv:enc:tag — es dato legado en texto plano, retornar tal cual
  const parts = encryptedText.split(':');
  if (parts.length !== 3) return encryptedText;

  const key = getEncryptionKey();
  const [ivHex, encrypted, tagHex] = parts;

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Si falla el descifrado, devolver tal cual (dato legado)
    return encryptedText;
  }
}

/**
 * Enmascara un token/key para mostrar en el frontend.
 * @param {string} value - Valor a enmascarar
 * @returns {string} - Valor enmascarado
 */
export function maskValue(value) {
  if (!value || value.length <= 8) return '••••••••';
  return '••••••••' + value.slice(-8);
}
