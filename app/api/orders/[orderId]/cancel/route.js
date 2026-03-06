import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🔒 Rate limiting distribuido con Upstash Redis
// Fallback a in-memory si Redis no está configurado (dev local)
let cancelRatelimit = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    cancelRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '10 m'),
        prefix: 'rl:cancel',
    });
}

// Fallback in-memory
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function checkRateLimitMemory(identifier) {
    const now = Date.now();
    const attempts = (rateLimitMap.get(identifier) || []).filter(t => now - t < RATE_LIMIT_WINDOW);
    if (attempts.length >= MAX_ATTEMPTS) return false;
    attempts.push(now);
    rateLimitMap.set(identifier, attempts);
    return true;
}

async function checkRateLimit(ip) {
    if (cancelRatelimit) {
        try {
            const { success } = await cancelRatelimit.limit(ip);
            return success;
        } catch (err) {
            console.error('[CANCEL RATELIMIT] Redis error, using memory fallback:', err.message);
        }
    }
    return checkRateLimitMemory(ip);
}

// @desc Cancel order by customer (within 5 minutes)
// @route PATCH /api/orders/:orderId/cancel
// @access Public (with customer data validation)
export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        const { orderId } = await params;

        // Validar orderId
        if (!/^[a-f\d]{24}$/i.test(orderId)) {
            return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
        }

        const body = await req.json();
        const { phone, email, reason } = body;

        // Validación básica
        if (!phone && !email) {
            return NextResponse.json(
                { error: 'Se requiere teléfono o email para verificar identidad' },
                { status: 400 }
            );
        }

        // Validar longitud de reason
        if (reason && (typeof reason !== 'string' || reason.length > 300)) {
            return NextResponse.json({ error: 'El motivo no puede superar 300 caracteres' }, { status: 400 });
        }

        // Rate limiting por IP — distribuido globalmente en Vercel
        const forwardedFor = req.headers.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

        const allowed = await checkRateLimit(ip);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Demasiados intentos de cancelación. Por favor intenta más tarde.' },
                { status: 429 }
            );
        }

        // Buscar pedido
        const order = await Order.findById(orderId);

        if (!order) {
            return NextResponse.json(
                { error: 'Pedido no encontrado' },
                { status: 404 }
            );
        }

        // Verificar identidad del cliente
        const phoneMatch = phone && order.customer.phone === phone;
        const emailMatch = email && order.customer.email?.toLowerCase() === email.toLowerCase();

        if (!phoneMatch && !emailMatch) {
            console.warn(`[CANCEL] Datos incorrectos para orden ${order.orderNumber} desde IP ${ip}`);
            return NextResponse.json(
                { error: 'Los datos proporcionados no coinciden con el pedido' },
                { status: 403 }
            );
        }

        // Validar que no esté ya cancelado
        if (order.status === 'cancelled') {
            return NextResponse.json({ error: 'Este pedido ya fue cancelado' }, { status: 400 });
        }

        // Validar que no esté ya reembolsado/procesado
        if (order.refund?.status !== 'none' && order.refund?.status !== undefined) {
            return NextResponse.json(
                { error: 'Este pedido ya tiene un reembolso en proceso' },
                { status: 400 }
            );
        }

        // Validar estado del pedido
        if (order.status !== 'pending' && order.status !== 'confirmed') {
            return NextResponse.json(
                { error: 'No se puede cancelar un pedido que ya está en preparación o completado' },
                { status: 400 }
            );
        }

        // Validar ventana de 5 minutos
        const minutesElapsed = (new Date() - new Date(order.createdAt)) / 1000 / 60;
        if (minutesElapsed > 5) {
            return NextResponse.json(
                { error: 'El tiempo límite para cancelar (5 minutos) ha expirado' },
                { status: 400 }
            );
        }

        // Validar estado de pago
        if (order.paymentStatus !== 'approved' && order.paymentStatus !== 'pending') {
            return NextResponse.json(
                { error: 'No se puede cancelar este pedido debido a su estado de pago' },
                { status: 400 }
            );
        }

        // Actualizar pedido
        // Preparar actualizaciones para bypassar MongoDB hooks ('a is not a function')
        const updates = {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancellationReason: reason ? reason.trim() : 'Cancelado por el cliente',
            refund: {
                status: 'pending',
                requestedAt: new Date(),
                requestedBy: {
                    name: order.customer.name,
                    phone: order.customer.phone,
                    email: order.customer.email
                },
                amount: order.total,
                reason: reason ? reason.trim() : 'Cancelación del cliente dentro de los 5 minutos'
            },
            canBeCounted: false
        };

        await Order.updateOne({ _id: order._id }, { $set: updates });


        console.log(`[CANCEL] ✅ Pedido ${order.orderNumber} cancelado. IP: ${ip}, Tiempo: ${minutesElapsed.toFixed(2)} min`);

        return NextResponse.json({
            success: true,
            message: 'Pedido cancelado exitosamente. El reembolso será procesado dentro de 24-48 horas.',
            orderNumber: order.orderNumber,
            refundStatus: 'pending',
            estimatedRefundDays: '10-30 días hábiles'
        });

    } catch (error) {
        console.error('[CANCEL API] Error:', error);
        return NextResponse.json(
            { error: 'Error al procesar la cancelación del pedido' },
            { status: 500 }
        );
    }
}
