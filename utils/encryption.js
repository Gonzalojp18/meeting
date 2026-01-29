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
  // Derivar una clave de 32 bytes a partir del secret
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encripta un texto plano usando AES-256-GCM
 * @param {string} plainText - Texto a encriptar
 * @returns {string} - Texto encriptado en formato: iv:encrypted:tag (hex)
 */
export function encrypt(plainText) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Formato: iv:encrypted:tag
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Desencripta un texto encriptado con AES-256-GCM
 * @param {string} encryptedText - Texto encriptado en formato iv:encrypted:tag
 * @returns {string} - Texto plano
 */
export function decrypt(encryptedText) {
  const key = getEncryptionKey();
  const [ivHex, encrypted, tagHex] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Enmascara un token/key para mostrar en el frontend
 * Muestra solo los últimos 8 caracteres
 * @param {string} value - Valor a enmascarar
 * @returns {string} - Valor enmascarado
 */
export function maskValue(value) {
  if (!value || value.length <= 8) return '••••••••';
  return '••••••••' + value.slice(-8);
}
