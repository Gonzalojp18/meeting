
import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req) {
    try {
        await dbConnect();

        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: { message: 'Por favor complete todos los campos' } },
                { status: 400 }
            );
        }

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { userId: user._id, role: user.role, assignedLocations: user.assignedLocations },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            return NextResponse.json({
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    assignedLocations: user.assignedLocations
                },
            });
        } else {
            return NextResponse.json(
                { error: { message: 'Credenciales inválidas' } },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: { message: 'Error del servidor' } },
            { status: 500 }
        );
    }
}
