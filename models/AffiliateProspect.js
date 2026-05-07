import mongoose from 'mongoose';
import { encrypt, decrypt, hashForSearch } from '@/utils/encryption';

const PII_FIELDS = ['phone', 'email', 'name', 'company', 'position', 'notes'];

const affiliateProspectSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true },
        email: { type: String, sparse: true },
        name: { type: String, required: true },
        company: { type: String, required: true },
        position: { type: String },
        notes: { type: String },

        phoneHash: { type: String, required: true, unique: true },
        emailHash: { type: String, sparse: true, unique: true },
        nameHash: { type: String, required: true },

        locationId: { type: String, required: true },
        source: { type: String, enum: ['qr', 'manual', 'referral'], default: 'qr' },
        discountPercentage: { type: Number, default: 10 },
        discountCode: { type: String, unique: true },
        discountUsed: { type: Boolean, default: false },
        discountUsedAt: { type: Date },
        status: { type: String, enum: ['new', 'contacted', 'converted', 'lost'], default: 'new' },
        assignedTo: { type: String },
        assignedAt: { type: Date },
        convertedCustomerId: { type: String },
        qrCodeId: { type: String }
    },
    { timestamps: true }
);

// Middleware desactivado - hashes se generan en la API route
// affiliateProspectSchema.pre('validate', function (next) {
//     next();
// });

function decryptDoc(doc) {
    if (!doc) return doc;
    PII_FIELDS.forEach(field => {
        if (doc[field]) doc[field] = decrypt(doc[field]);
    });
    return doc;
}

affiliateProspectSchema.post('find', function (docs) { docs.forEach(decryptDoc); });
affiliateProspectSchema.post('findOne', function (doc) { decryptDoc(doc); });
affiliateProspectSchema.post('findOneAndUpdate', function (doc) { decryptDoc(doc); });

export default mongoose.models.AffiliateProspect || mongoose.model('AffiliateProspect', affiliateProspectSchema);
