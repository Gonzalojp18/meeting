import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 🔒 SECURITY: Rate limiting en memoria por IP y por email
// NOTA: En Vercel serverless cada instancia tiene su propio Map.
// Para rate limiting distribuido real usar Upstash Redis.
// Esta implementación protege dentro de cada instancia y es suficiente
// para ataques desde una misma IP o contra una misma cuenta.
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(identifier) {
    const now = Date.now();
    const attempts = loginAttempts.get(identifier) || [];
    const recentAttempts = attempts.filter(t => now - t < WINDOW_MS);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
        const resetTime = Math.ceil((recentAttempts[0] + WINDOW_MS - now) / 1000 / 60);
        return { blocked: true, resetInMinutes: resetTime };
    }

    recentAttempts.push(now);
    loginAttempts.set(identifier, recentAttempts);

    if (loginAttempts.size > 1000) {
        for (const [key, times] of loginAttempts.entries()) {
            if (times.filter(t => now - t < WINDOW_MS).length === 0) {
                loginAttempts.delete(key);
            } else {
                loginAttempts.set(key, times.filter(t => now - t < WINDOW_MS));
            }
        }
    }

    return { blocked: false, remaining: MAX_ATTEMPTS - recentAttempts.length };
}

function getClientIP(req) {
    // Obtener IP real considerando proxies
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req) {
    try {
        // 🔒 SECURITY: Verificar rate limit antes de cualquier operación
        const clientIP = getClientIP(req);
        const ipCheck = checkRateLimit(`ip:${clientIP}`);

        if (ipCheck.blocked) {
            console.warn(`[LOGIN SECURITY] Rate limit exceeded for IP: ${clientIP}`);
            return NextResponse.json(
                { error: { message: `Demasiados intentos. Intenta de nuevo en ${ipCheck.resetInMinutes} minutos.` } },
                { status: 429, headers: { 'Retry-After': String(ipCheck.resetInMinutes * 60) } }
            );
        }

        await dbConnect();

        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: { message: 'Por favor complete todos los campos' } },
                { status: 400 }
            );
        }

        // Normalizar email
        const normalizedEmail = email.toLowerCase().trim();

        // 🔒 Rate limit adicional por email (protege cuentas específicas)
        const emailCheck = checkRateLimit(`email:${normalizedEmail}`);
        if (emailCheck.blocked) {
            console.warn(`[LOGIN SECURITY] Rate limit exceeded for email: ${normalizedEmail}`);
            return NextResponse.json(
                { error: { message: `Demasiados intentos. Intenta de nuevo en ${emailCheck.resetInMinutes} minutos.` } },
                { status: 429, headers: { 'Retry-After': String(emailCheck.resetInMinutes * 60) } }
            );
        }

        const user = await User.findOne({ email: normalizedEmail });

        // 🔒 SECURITY: Mensaje genérico para no revelar si el email existe
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return NextResponse.json(
                { error: { message: 'Credenciales inválidas' } },
                { status: 401 }
            );
        }

        // 🔒 SECURITY: Verificar que el usuario esté activo
        if (user.isActive === false) {
            return NextResponse.json(
                { error: { message: 'Cuenta desactivada. Contacta al administrador.' } },
                { status: 403 }
            );
        }

        // 🔒 SECURITY: Reducir expiración de JWT de 30d a 8h (VULN-004)
        const token = jwt.sign(
            { userId: user._id, role: user.role, assignedLocations: user.assignedLocations },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
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
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: { message: 'Error del servidor' } },
            { status: 500 }
        );
    }
}
