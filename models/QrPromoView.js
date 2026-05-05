import mongoose from 'mongoose';

const QrPromoViewSchema = new mongoose.Schema(
  {
    locationId: {
      type: String,
      required: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      default: '',
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false,
  }
);

QrPromoViewSchema.index({ locationId: 1, ip: 1, viewedAt: -1 });

export default mongoose.models.QrPromoView || mongoose.model('QrPromoView', QrPromoViewSchema);
