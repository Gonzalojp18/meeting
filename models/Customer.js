import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        email: {
            type: String,
            unique: true,
            sparse: true, // permite null pero unique cuando existe
            index: true
        },
        name: {
            type: String
        },
        lastname: {
            type: String
        },
        firstOrderDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        lastOrderDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        totalOrders: {
            type: Number,
            default: 1,
            min: 0
        },
        totalSpent: {
            type: Number,
            default: 0,
            min: 0
        },
        // Tracking por locación
        locations: [{
            locationId: {
                type: String,
                required: true
            },
            orderCount: {
                type: Number,
                default: 1
            },
            totalSpent: {
                type: Number,
                default: 0
            },
            lastOrderDate: {
                type: Date,
                default: Date.now
            }
        }]
    },
    {
        timestamps: true
    }
);

// Índices para búsquedas eficientes
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ firstOrderDate: -1 });
customerSchema.index({ lastOrderDate: -1 });
customerSchema.index({ totalOrders: -1 });
customerSchema.index({ totalSpent: -1 });

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);
