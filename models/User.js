
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "This field can't be empty"]
        },
        email: {
            type: String,
            required: [true, "This field can't be empty"],
            unique: true
        },
        password: {
            type: String,
            required: [true, "This field can't be empty"],
        },
        role: {
            type: String,
            enum: ['admin', 'staff', 'user', 'manager', 'superadmin'],
            default: 'staff'
        },
        assignedLocations: [{
            type: String, // Array of locationIds
            default: []
        }],
        isActive: {
            type: Boolean,
            default: true
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
