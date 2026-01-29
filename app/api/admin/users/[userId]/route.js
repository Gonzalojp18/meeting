import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req, { params }) {
    try {
        await dbConnect();
        const session = await auth();

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { userId } = await params;
        const { name, email, password, role, assignedLocations } = await req.json();

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.assignedLocations = assignedLocations !== undefined ? assignedLocations : user.assignedLocations;

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        return NextResponse.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedLocations: user.assignedLocations
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const session = await auth();

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { userId } = await params;

        // Prevent deleting yourself
        if (userId === session.user._id) {
            return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
        }

        await User.findByIdAndDelete(userId);
        return NextResponse.json({ message: 'Usuario eliminado' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
