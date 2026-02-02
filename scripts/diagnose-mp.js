const mongoose = require('mongoose');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Configuración de encriptación (copiada de encryption.js para aislar pruebas)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
// AUTH_SECRET debe estar en el .env
const secret = process.env.AUTH_SECRET;

function getEncryptionKey() {
    if (!secret) {
        throw new Error('AUTH_SECRET no está configurado en las variables de entorno');
    }
    return crypto.createHash('sha256').update(secret).digest();
}

function decrypt(encryptedText) {
    if (!encryptedText) return null;
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) throw new Error('Formato de encriptación inválido');

    const [ivHex, encrypted, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Esquema mínimo para leer configuración
const SettingsSchema = new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed
});
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

async function diagnose() {
    console.log('\n🔍 --- DIAGNÓSTICO DE MERCADO PAGO ---\n');

    // 1. Verificar variables de entorno
    console.log('1. Verificando entorno...');
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'Definido ✅' : 'FALTANTE ❌'}`);
    console.log(`   AUTH_SECRET: ${process.env.AUTH_SECRET ? 'Definido ✅' : 'FALTANTE ❌'}`);

    if (!process.env.MONGODB_URI || !process.env.AUTH_SECRET) {
        console.error('❌ Faltan variables críticas. Abortando.');
        process.exit(1);
    }

    // 2. Conectar a Mongo
    console.log('2. Conectando a Base de Datos...');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('   Conexión exitosa ✅');
    } catch (err) {
        console.error('❌ Error conectando a Mongo:', err.message);
        process.exit(1);
    }

    // 3. Leer Credenciales
    console.log('3. Leyendo credenciales de la DB...');
    let settings;
    try {
        settings = await Settings.findOne({ key: 'mercadopago_credentials' });
    } catch (err) {
        console.error('❌ Error consultando Settings:', err.message);
        process.exit(1);
    }

    if (!settings || !settings.value) {
        console.error('❌ No se encontraron credenciales en la colección Settings (key: mercadopago_credentials).');
        console.log('   -> Ve al panel de admin y guarda las credenciales.');
        process.exit(0);
    }

    // 4. Desencriptar
    console.log('4. Intentando desencriptar...');
    let accessToken;
    try {
        accessToken = decrypt(settings.value.accessToken);
        const publicKey = decrypt(settings.value.publicKey);

        console.log('   Desencriptación exitosa ✅');
        console.log(`   Modo: ${accessToken.startsWith('TEST-') ? 'TEST (Sandbox) 🧪' : 'PRODUCCIÓN 🚀'}`);
        console.log(`   Public Key: ...${publicKey.slice(-6)}`);
    } catch (err) {
        console.error('❌ Error al desencriptar. EL SECRET HA CAMBIADO.');
        console.error('   Error:', err.message);
        console.log('   -> SOLUCIÓN: Ve al panel de admin y vuelve a guardar las credenciales.');
        process.exit(0);
    }

    // 5. Probar MP
    console.log('5. Probando conexión con Mercado Pago...');
    try {
        const client = new MercadoPagoConfig({ accessToken });
        const payment = new Payment(client);
        // Buscamos 1 pago cualquiera para validar el token implies permissions
        await payment.search({ options: { limit: 1 } });
        console.log('   Conexión verificada con API de Mercado Pago ✅');
        console.log('\n🏁 DIAGNÓSTICO COMPLETADO: TODO PARECE ESTAR BIEN.');
    } catch (err) {
        console.error('❌ El Access Token es rechazado por Mercado Pago.');
        console.error('   Error:', err.message);
    }

    process.exit(0);
}

diagnose();
