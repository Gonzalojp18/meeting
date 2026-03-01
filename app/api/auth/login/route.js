import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🔒 SECURITY: Rate limiting distribuido con Upstash Redis
// Funciona globalmente en todas las instancias de Vercel (serverless)
// Fallback a in-memory si Redis no está configurado (entorno local sin vars)

let ipRatelimit = null;
let emailRatelimit = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    ipRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        prefix: 'rl:ip',
    });

    emailRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        prefix: 'rl:email',
    });
}

// Fallback in-memory para desarrollo local
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimitMemory(identifier) {
    const now = Date.now();
    const attempts = loginAttempts.get(identifier) || [];
    const recentAttempts = attempts.filter(t => now - t < WINDOW_MS);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
        const resetTime = Math.ceil((recentAttempts[0] + WINDOW_MS - now) / 1000 / 60);
        return { blocked: true, resetInMinutes: resetTime };
    }

    recentAttempts.push(now);
    loginAttempts.set(identifier, recentAttempts);
    return { blocked: false, remaining: MAX_ATTEMPTS - recentAttempts.length };
}

async function checkRateLimit(identifier, limiter) {
    // Redis distribuido disponible
    if (limiter) {
        try {
            const { success, reset } = await limiter.limit(identifier);
            if (!success) {
                const resetInMinutes = Math.ceil((reset - Date.now()) / 1000 / 60);
                return { blocked: true, resetInMinutes: Math.max(1, resetInMinutes) };
            }
            return { blocked: false };
        } catch (err) {
            // Si Redis falla, log y continuar (fail open — evita bloquear logins legítimos)
            console.error('[RATELIMIT] Redis error, using memory fallback:', err.message);
        }
    }

    // Fallback in-memory
    return checkRateLimitMemory(identifier);
}

function getClientIP(req) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req) {
    try {
        const clientIP = getClientIP(req);

        // 🔒 Rate limit por IP (global entre todas las instancias de Vercel)
        const ipCheck = await checkRateLimit(clientIP, ipRatelimit);
        if (ipCheck.blocked) {
            console.warn(`[LOGIN SECURITY] Rate limit por IP: ${clientIP}`);
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

        const normalizedEmail = email.toLowerCase().trim();

        // 🔒 Rate limit por email (protege cuentas específicas de fuerza bruta)
        const emailCheck = await checkRateLimit(normalizedEmail, emailRatelimit);
        if (emailCheck.blocked) {
            console.warn(`[LOGIN SECURITY] Rate limit por email: ${normalizedEmail}`);
            return NextResponse.json(
                { error: { message: `Demasiados intentos. Intenta de nuevo en ${emailCheck.resetInMinutes} minutos.` } },
                { status: 429, headers: { 'Retry-After': String(emailCheck.resetInMinutes * 60) } }
            );
        }

        const user = await User.findOne({ email: normalizedEmail });

        // 🔒 Mensaje genérico — no revela si el email existe o no
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return NextResponse.json(
                { error: { message: 'Credenciales inválidas' } },
                { status: 401 }
            );
        }

        if (user.isActive === false) {
            return NextResponse.json(
                { error: { message: 'Cuenta desactivada. Contacta al administrador.' } },
                { status: 403 }
            );
        }

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
                assignedLocations: user.assignedLocations,
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
