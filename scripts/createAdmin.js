import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['admin', 'staff', 'user', 'manager'], default: 'staff' },
    assignedLocations: [String],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado a MongoDB');

        const adminEmail = 'admin@restaurant.com';
        const adminPassword = 'admin123'; // Cambia esto después

        // Verificar si ya existe
        const existing = await User.findOne({ email: adminEmail });
        if (existing) {
            console.log('El usuario admin ya existe. Actualizando rol...');
            existing.role = 'admin';
            await existing.save();
            console.log('Rol actualizado a admin');
        } else {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await User.create({
                name: 'Administrador',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                assignedLocations: [],
                isActive: true
            });
            console.log('Usuario admin creado exitosamente');
        }

        console.log('\n--- Credenciales ---');
        console.log('Email: admin@restaurant.com');
        console.log('Password: admin123');
        console.log('--------------------\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createAdmin();
