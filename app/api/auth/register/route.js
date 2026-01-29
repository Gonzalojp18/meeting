import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
    try {
        await dbConnect();

        const { name, email, password, role } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: { message: 'Por favor complete todos los campos' } },
                { status: 400 }
            );
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { error: { message: 'El email ya está registrado' } },
                { status: 400 }
            );
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            ...(role && { role })
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
