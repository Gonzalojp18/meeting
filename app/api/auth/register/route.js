import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
    try {
        await dbConnect();

        // 🔒 SECURITY: No aceptamos 'role' del cliente - solo name, email, password
        const { name, email, password, registrationCode } = await req.json();

        // 🔒 Validar código de registro server-side
        const validCode = process.env.ADMIN_REGISTRATION_CODE;
        if (!validCode || registrationCode !== validCode) {
            return NextResponse.json(
                { error: { message: 'Código de registro inválido' } },
                { status: 403 }
            );
        }

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: { message: 'Por favor complete todos los campos' } },
                { status: 400 }
            );
        }

        // 🔒 Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: { message: 'Formato de email inválido' } },
                { status: 400 }
            );
        }

        // 🔒 Validar longitud mínima de contraseña
        if (password.length < 8) {
            return NextResponse.json(
                { error: { message: 'La contraseña debe tener mínimo 8 caracteres' } },
                { status: 400 }
            );
        }

        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return NextResponse.json(
                { error: { message: 'El email ya está registrado' } },
                { status: 400 }
            );
        }

        // 🔒 Aumentar cost factor de bcrypt a 12
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'user' // 🔒 SIEMPRE 'user' en registro público - admins se crean desde /api/admin/users
        });

        return NextResponse.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: { message: 'Error del servidor' } },
            { status: 500 }
        );
    }
}
