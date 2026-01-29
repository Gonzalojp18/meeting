import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        await dbConnect();
        const session = await auth();

        if (!session || session.user.role !== 'admin') {
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

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { name, email, password, role, assignedLocations } = await req.json();

        const userExists = await User.findOne({ email });
        if (userExists) {
            return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            assignedLocations
        });

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
