import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';

// Rate limiting simple con Map en memoria
// En producción usar Redis o similar
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutos
const MAX_ATTEMPTS = 3;

function checkRateLimit(identifier) {
    const now = Date.now();
    const attempts = rateLimitMap.get(identifier) || [];

    // Limpiar intentos antiguos
    const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
        return false; // Rate limit exceeded
    }

    recentAttempts.push(now);
    rateLimitMap.set(identifier, recentAttempts);
    return true;
}

// @desc Cancel order by customer (within 5 minutes)
// @route PATCH /api/orders/:orderId/cancel
// @access Public (with customer data validation)
export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        const { orderId } = await params;
        const body = await req.json();

        const { phone, email, reason } = body;

        // Validación básica
        if (!phone && !email) {
            return NextResponse.json(
                { error: 'Se requiere teléfono o email para verificar identidad' },
                { status: 400 }
            );
        }

        // Rate limiting por IP
        const forwardedFor = req.headers.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

        if (!checkRateLimit(ip)) {
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
            console.warn(`[CANCEL] Intento de cancelación con datos incorrectos para orden ${order.orderNumber} desde IP ${ip}`);
            return NextResponse.json(
                { error: 'Los datos proporcionados no coinciden con el pedido' },
                { status: 403 }
            );
        }

        // Validar que no esté ya cancelado
        if (order.status === 'cancelled') {
            return NextResponse.json(
                { error: 'Este pedido ya fue cancelado' },
                { status: 400 }
            );
        }

        // Validar que no esté ya reembolsado/procesado
        if (order.refund?.status !== 'none' && order.refund?.status !== undefined) {
            return NextResponse.json(
                { error: 'Este pedido ya tiene un reembolso en proceso' },
                { status: 400 }
            );
        }

        // Validar estado del pedido (solo pending o confirmed)
        if (order.status !== 'pending' && order.status !== 'confirmed') {
            return NextResponse.json(
                { error: 'No se puede cancelar un pedido que ya está en preparación o completado' },
                { status: 400 }
            );
        }

        // Validar ventana de 5 minutos
        const createdAt = new Date(order.createdAt);
        const now = new Date();
        const minutesElapsed = (now - createdAt) / 1000 / 60;

        if (minutesElapsed > 5) {
            return NextResponse.json(
                { error: 'El tiempo límite para cancelar (5 minutos) ha expirado' },
                { status: 400 }
            );
        }

        // Validar que el pago esté aprobado o pendiente
        if (order.paymentStatus !== 'approved' && order.paymentStatus !== 'pending') {
            return NextResponse.json(
                { error: 'No se puede cancelar este pedido debido a su estado de pago' },
                { status: 400 }
            );
        }

        // Actualizar pedido
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = reason || 'Cancelado por el cliente';

        // Iniciar proceso de reembolso
        order.refund = {
            status: 'pending',
            requestedAt: new Date(),
            requestedBy: {
                name: order.customer.name,
                phone: order.customer.phone,
                email: order.customer.email
            },
            amount: order.total,
            reason: reason || 'Cancelación del cliente dentro de los 5 minutos'
        };

        // Marcar como no contable para estadísticas
        order.canBeCounted = false;

        await order.save();

        console.log(`[CANCEL] ✅ Pedido ${order.orderNumber} cancelado por cliente. IP: ${ip}, Tiempo transcurrido: ${minutesElapsed.toFixed(2)} min`);

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
