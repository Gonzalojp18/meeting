import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { logUserCreated } from '@/utils/auditLogger';

// Roles permitidos para gestionar usuarios
const ALLOWED_ROLES = ['admin', 'manager'];
// Roles válidos del sistema
const VALID_ROLES = ['admin', 'manager', 'staff'];

export async function GET() {
    try {
        await dbConnect();
        const session = await auth();

        if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const session = await auth();

        if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { name, email, password, role, assignedLocations } = await req.json();

        // Validar que el rol sea válido
        if (!VALID_ROLES.includes(role)) {
            return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
        }

        // SEGURIDAD: Manager solo puede crear usuarios con rol 'staff'
        if (session.user.role === 'manager' && role !== 'staff') {
            console.warn(`[SECURITY] Manager ${session.user.id} intentó crear usuario con rol ${role}`);
            return NextResponse.json({
                error: 'Solo puedes crear usuarios con rol de Staff'
            }, { status: 403 });
        }

        const userExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (userExists) {
            return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
        }

        // 🔒 SECURITY: Validar complejidad de contraseña (VULN-012)
        if (!password || password.length < 8) {
            return NextResponse.json({ error: 'La contraseña debe tener mínimo 8 caracteres' }, { status: 400 });
        }
        if (!/[A-Z]/.test(password)) {
            return NextResponse.json({ error: 'La contraseña debe incluir al menos una mayúscula' }, { status: 400 });
        }
        if (!/[a-z]/.test(password)) {
            return NextResponse.json({ error: 'La contraseña debe incluir al menos una minúscula' }, { status: 400 });
        }
        if (!/[0-9]/.test(password)) {
            return NextResponse.json({ error: 'La contraseña debe incluir al menos un número' }, { status: 400 });
        }

        // 🔒 SECURITY: Aumentar bcrypt cost factor a 12 (VULN-013)
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            assignedLocations
        });

        console.log(`[USER CREATED] ${session.user.role} ${session.user.id} creó usuario "${name}" (${role})`);

        // Registrar en audit log
        await logUserCreated(session, newUser);

        return NextResponse.json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            assignedLocations: newUser.assignedLocations
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
