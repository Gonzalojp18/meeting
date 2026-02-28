import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

// Inline schema (igual al modelo real, incluyendo superadmin)
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
        type: String,
        enum: ['admin', 'staff', 'user', 'manager', 'superadmin'],
        default: 'staff'
    },
    assignedLocations: [String],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// -------------------------------------------------------
// Las credenciales se leen desde .env.local - NUNCA hardcodear
// Variables requeridas:
//   SUPERADMIN_EMAILS   → email del superadmin
//   SUPERADMIN_PASSWORD → contraseña del superadmin
//   SUPERADMIN_NAME     → nombre (opcional, default: 'Super Admin')
// -------------------------------------------------------

const email = process.env.SUPERADMIN_EMAILS;
const password = process.env.SUPERADMIN_PASSWORD;
const name = process.env.SUPERADMIN_NAME || 'Super Admin';

if (!email || !password) {
    console.error('❌ Error: Faltan variables de entorno requeridas.');
    console.error('   Asegurate de tener en .env.local:');
    console.error('   SUPERADMIN_EMAILS=tu@email.com');
    console.error('   SUPERADMIN_PASSWORD=TuPasswordSegura123!');
    process.exit(1);
}

const SUPERADMIN = { name, email, password };

async function createSuperAdmin() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI no encontrado en .env.local');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const existing = await User.findOne({ email: SUPERADMIN.email });

        if (existing) {
            console.log(`⚠️  El usuario con email "${SUPERADMIN.email}" ya existe.`);
            if (existing.role !== 'superadmin') {
                existing.role = 'superadmin';
                await existing.save();
                console.log('✅ Rol actualizado a superadmin');
            } else {
                console.log('ℹ️  El usuario ya tiene rol superadmin. No se realizaron cambios.');
            }
        } else {
            // Contraseña con bcrypt costo 12 (igual que el login)
            const hashedPassword = await bcrypt.hash(SUPERADMIN.password, 12);
            await User.create({
                name: SUPERADMIN.name,
                email: SUPERADMIN.email,
                password: hashedPassword,
                role: 'superadmin',
                assignedLocations: [],
                isActive: true
            });
            console.log('✅ Usuario superadmin creado exitosamente');
        }

        console.log('\n========================================');
        console.log('  CREDENCIALES SUPERADMIN');
        console.log('========================================');
        console.log(`  Email   : ${SUPERADMIN.email}`);
        console.log(`  Password: ${SUPERADMIN.password}`);
        console.log('========================================');
        console.log('⚠️  Recordá cambiar la contraseña después del primer login\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createSuperAdmin();
