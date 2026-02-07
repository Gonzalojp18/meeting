import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

// Roles permitidos para gestionar usuarios
const ALLOWED_ROLES = ['admin', 'manager'];
// Roles válidos del sistema
const VALID_ROLES = ['admin', 'manager', 'staff'];

export async function PUT(req, { params }) {
    try {
        await dbConnect();
        const session = await auth();

        if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { userId } = await params;
        const { name, email, password, role, assignedLocations } = await req.json();

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // SEGURIDAD: Manager solo puede editar usuarios con rol 'staff'
        if (session.user.role === 'manager') {
            if (user.role !== 'staff') {
                console.warn(`[SECURITY] Manager ${session.user.id} intentó editar usuario ${user.role}`);
                return NextResponse.json({
                    error: 'Solo puedes editar usuarios con rol de Staff'
                }, { status: 403 });
            }
            // Manager no puede cambiar rol a admin o manager
            if (role && role !== 'staff') {
                return NextResponse.json({
                    error: 'Solo puedes asignar rol de Staff'
                }, { status: 403 });
            }
        }

        // Validar que el rol sea válido
        if (role && !VALID_ROLES.includes(role)) {
            return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.assignedLocations = assignedLocations !== undefined ? assignedLocations : user.assignedLocations;

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        console.log(`[USER UPDATED] ${session.user.role} ${session.user.id} actualizó usuario "${user.name}"`);

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

        if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { userId } = await params;

        // Prevent deleting yourself
        if (userId === session.user.id) {
            return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // SEGURIDAD: Manager solo puede eliminar usuarios con rol 'staff'
        if (session.user.role === 'manager' && user.role !== 'staff') {
            console.warn(`[SECURITY] Manager ${session.user.id} intentó eliminar usuario ${user.role}`);
            return NextResponse.json({
                error: 'Solo puedes eliminar usuarios con rol de Staff'
            }, { status: 403 });
        }

        await User.findByIdAndDelete(userId);

        console.log(`[USER DELETED] ${session.user.role} ${session.user.id} eliminó usuario "${user.name}"`);

        return NextResponse.json({ message: 'Usuario eliminado' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
