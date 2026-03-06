import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import Settings from '@/models/Settings';
import { auth } from '@/auth';
import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago';
import { decrypt } from '@/utils/encryption';
import { logAudit } from '@/utils/auditLogger';

// @desc Process refund for cancelled order
// @route POST /api/admin/refunds/:orderId/process
// @access Private (admin, manager)
export async function POST(req, { params }) {
    try {
        await dbConnect();
        const session = await auth();

        // Validar permisos
        const ALLOWED_ROLES = ['admin', 'manager'];
        if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
            return NextResponse.json(
                { error: 'No autorizado. Se requiere rol de admin o manager.' },
                { status: 401 }
            );
        }

        const { orderId } = await params;

        // Validar orderId
        if (!/^[a-f\d]{24}$/i.test(orderId)) {
            return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
        }

        const body = await req.json();
        const { notes, confirmAmount } = body;

        // Validar notas — longitud máxima
        if (notes && (typeof notes !== 'string' || notes.length > 500)) {
            return NextResponse.json({ error: 'Las notas no pueden superar 500 caracteres' }, { status: 400 });
        }

        // Verificar precondiciones antes del lock atómico
        const preCheck = await Order.findById(orderId).lean();
        if (!preCheck) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }
        if (preCheck.status !== 'cancelled') {
            return NextResponse.json({ error: 'El pedido no está cancelado' }, { status: 400 });
        }
        if (confirmAmount !== preCheck.total) {
            console.warn(`[REFUND] Monto incorrecto. Order: ${preCheck.orderNumber}, Esperado: ${preCheck.total}, Recibido: ${confirmAmount}`);
            return NextResponse.json({ error: 'El monto de confirmación no coincide con el total del pedido' }, { status: 400 });
        }
        const daysSinceCreation = (new Date() - new Date(preCheck.createdAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > 180) {
            return NextResponse.json(
                { error: 'No se puede procesar el reembolso: han pasado más de 180 días desde la creación del pedido' },
                { status: 400 }
            );
        }

        // 🔒 OPERACIÓN ATÓMICA — previene race condition entre dos admins simultáneos
        // Solo actualiza si refund.status === 'pending'. Si otro request ya lo cambió, devuelve null.
        const order = await Order.findOneAndUpdate(
            { _id: orderId, 'refund.status': 'pending' },
            {
                $set: {
                    'refund.status': 'processing',
                    'refund.processedBy': {
                        userId: session.user.id,
                        userName: session.user.name,
                        userRole: session.user.role,
                    },
                    ...(notes && { 'refund.notes': notes.trim() }),
                }
            },
            { new: true }
        );

        if (!order) {
            return NextResponse.json(
                { error: 'Este reembolso ya fue procesado o no está pendiente' },
                { status: 400 }
            );
        }

        console.log(`[REFUND] Iniciando proceso de reembolso para orden ${order.orderNumber} por ${session.user.name} (${session.user.role})`);

        // Obtener credenciales de MercadoPago desde DB
        const mpSettings = await Settings.getValue('mercadopago_credentials');

        if (!mpSettings || !mpSettings.accessToken) {
            order.refund.status = 'failed';
            order.refund.errorMessage = 'No se encontraron credenciales de MercadoPago configuradas';
            await Order.updateOne(
                { _id: order._id },
                { $set: { 'refund.status': order.refund.status, 'refund.errorMessage': order.refund.errorMessage } }
            );

            console.error('[REFUND] No hay credenciales de MercadoPago configuradas');
            return NextResponse.json(
                { error: 'No se encontraron credenciales de MercadoPago. Por favor, configúralas en Ajustes.' },
                { status: 500 }
            );
        }

        // Desencriptar token
        const decryptedToken = decrypt(mpSettings.accessToken);
        const client = new MercadoPagoConfig({
            accessToken: decryptedToken
        });

        let mpResult;
        let operationType = '';

        try {
            // Determinar si es cancelación o reembolso según paymentStatus
            if (order.paymentStatus === 'pending' || order.paymentStatus === 'in_process') {
                // CANCELACIÓN (pago no capturado)
                operationType = 'cancelación';
                console.log(`[REFUND] Ejecutando CANCELACIÓN en MercadoPago para pago ${order.mercadoPagoId}`);

                const payment = new Payment(client);
                mpResult = await payment.cancel({ id: order.mercadoPagoId });

                order.paymentStatus = 'cancelled';
                order.refund.status = 'completed';
                order.refund.processedAt = new Date();
                order.refund.mercadoPagoRefundId = mpResult.id;

            } else if (order.paymentStatus === 'approved') {
                // REEMBOLSO (pago ya capturado)
                operationType = 'reembolso';
                console.log(`[REFUND] Ejecutando REEMBOLSO en MercadoPago para pago ${order.mercadoPagoId}, monto: ${order.total}`);

                const paymentRefund = new PaymentRefund(client);
                mpResult = await paymentRefund.create({
                    payment_id: order.mercadoPagoId,
                    body: {
                        amount: order.total
                    }
                });

                order.paymentStatus = 'refunded';
                order.refund.status = 'completed';
                order.refund.processedAt = new Date();
                order.refund.mercadoPagoRefundId = mpResult.id;

            } else {
                throw new Error(`Estado de pago no válido para reembolso: ${order.paymentStatus}`);
            }

            // Guardar cambios bypassando hooks de Mongoose
            order.canBeCounted = false;
            await Order.updateOne(
                { _id: order._id },
                {
                    $set: {
                        paymentStatus: order.paymentStatus,
                        'refund.status': order.refund.status,
                        'refund.processedAt': order.refund.processedAt,
                        'refund.mercadoPagoRefundId': order.refund.mercadoPagoRefundId,
                        canBeCounted: false
                    }
                }
            );

            console.log(`[REFUND] ✅ ${operationType.toUpperCase()} exitoso para orden ${order.orderNumber}. MP ID: ${mpResult.id}`);

            // Registrar en audit log
            await logAudit({
                userId: session.user.id,
                userName: session.user.name,
                userRole: session.user.role,
                action: 'REFUND',
                entity: 'order',
                entityId: order._id.toString(),
                entityName: order.orderNumber,
                details: `Procesó ${operationType} de pedido cancelado por $${order.total}`,
                metadata: {
                    refundId: mpResult.id,
                    amount: order.total,
                    operationType,
                    customer: {
                        name: order.customer.name,
                        phone: order.customer.phone
                    }
                }
            });

            return NextResponse.json({
                success: true,
                message: `${operationType.charAt(0).toUpperCase() + operationType.slice(1)} procesado exitosamente`,
                operationType,
                refundId: mpResult.id,
                orderNumber: order.orderNumber,
                amount: order.total,
                estimatedRefundDays: operationType === 'reembolso' ? '10-30 días hábiles' : 'Inmediato'
            });

        } catch (mpError) {
            // Error de MercadoPago
            console.error(`[REFUND] Error de MercadoPago al procesar ${operationType}:`, mpError);

            order.refund.status = 'failed';
            order.refund.errorMessage = mpError.message || 'Error al comunicarse con MercadoPago';
            order.refund.processedAt = new Date();
            await Order.updateOne(
                { _id: order._id },
                {
                    $set: {
                        'refund.status': order.refund.status,
                        'refund.errorMessage': order.refund.errorMessage,
                        'refund.processedAt': order.refund.processedAt
                    }
                }
            );

            // Registrar error en audit log
            await logAudit({
                userId: session.user.id,
                userName: session.user.name,
                userRole: session.user.role,
                action: 'REFUND',
                entity: 'order',
                entityId: order._id.toString(),
                entityName: order.orderNumber,
                details: `Error al procesar ${operationType} de pedido cancelado`,
                metadata: {
                    error: mpError.message,
                    amount: order.total
                }
            });

            return NextResponse.json(
                {
                    error: `Error al procesar ${operationType} en MercadoPago: ${mpError.message}`,
                    details: mpError.cause?.message || 'Error desconocido'
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('[REFUND PROCESS API] Error:', error);
        return NextResponse.json(
            { error: 'Error al procesar el reembolso' },
            { status: 500 }
        );
    }
}
