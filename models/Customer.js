/**
 * models/Customer.js
 *
 * 🔒 PII ENCRYPTION:
 * Los campos phone, email, name, lastname se almacenan cifrados con AES-256-GCM.
 * Para búsquedas exactas (findOne, upsert) se usan los campos phoneHash / emailHash
 * que contienen un HMAC-SHA256 determinístico del valor original.
 *
 * Flujo:
 *   1. Al guardar: encrypt(phone) → phone, hashForSearch(phone) → phoneHash
 *   2. Al leer: decrypt(phone) → phone legible
 *   3. Para buscar: hashForSearch(phoneRaw) → buscar por { phoneHash }
 */

import mongoose from 'mongoose';
import { encrypt, decrypt, hashForSearch } from '@/utils/encryption';

// ─── Campos PII que se cifran ─────────────────────────────────────────────────
const PII_FIELDS = ['phone', 'email', 'name', 'lastname'];

// ─── Schema ───────────────────────────────────────────────────────────────────
const customerSchema = new mongoose.Schema(
    {
        // Campos cifrados (AES-256-GCM) — no buscar directamente por estos
        phone: { type: String, required: true },
        email: { type: String, sparse: true },
        name: { type: String },
        lastname: { type: String },

        // Hashes determinísticos para búsquedas exactas (HMAC-SHA256)
        phoneHash: { type: String, required: true, unique: true },
        emailHash: { type: String, sparse: true, unique: true },

        firstOrderDate: { type: Date, required: true, default: Date.now },
        lastOrderDate: { type: Date, required: true, default: Date.now },
        totalOrders: { type: Number, default: 1, min: 0 },
        totalSpent: { type: Number, default: 0, min: 0 },

        // Tracking por locación
        locations: [{
            locationId: { type: String, required: true },
            orderCount: { type: Number, default: 1 },
            totalSpent: { type: Number, default: 0 },
            lastOrderDate: { type: Date, default: Date.now }
        }]
    },
    { timestamps: true }
);

// Índices removidos - ya definidos inline con unique: true e index: true

// ─── Pre-save: cifrar PII y generar hashes ────────────────────────────────────
customerSchema.pre('save', function (next) {
    try {
        // Solo cifrar si el campo fue modificado (evita doble cifrado)
        if (this.isModified('phone') && this.phone) {
            this.phoneHash = hashForSearch(this.phone);
            this.phone = encrypt(this.phone);
        }
        if (this.isModified('email') && this.email) {
            this.emailHash = hashForSearch(this.email);
            this.email = encrypt(this.email);
        }
        if (this.isModified('name') && this.name) this.name = encrypt(this.name);
        if (this.isModified('lastname') && this.lastname) this.lastname = encrypt(this.lastname);
        next();
    } catch (err) {
        next(err);
    }
});

// ─── Helper: descifrar un documento in-place ──────────────────────────────────
function decryptDoc(doc) {
    if (!doc) return doc;
    PII_FIELDS.forEach(field => {
        if (doc[field]) doc[field] = decrypt(doc[field]);
    });
    return doc;
}

// ─── Post hooks: descifrar al leer ────────────────────────────────────────────
customerSchema.post('find', function (docs) { docs.forEach(decryptDoc); });
customerSchema.post('findOne', function (doc) { decryptDoc(doc); });
customerSchema.post('findOneAndUpdate', function (doc) { decryptDoc(doc); });
customerSchema.post('save', function (doc) { decryptDoc(doc); });

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);
