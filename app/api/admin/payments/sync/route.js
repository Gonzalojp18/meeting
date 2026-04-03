import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import AuditLog from '@/models/AuditLog';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMPCredentials } from '@/utils/getMPCredentials';

/**
 * GET /api/admin/payments/sync
 * Tarea de reconciliación: Busca órdenes pendientes y verifica su estado en Mercado Pago.
 */
export async function GET(req) {
    try {
        // 1. Verificar sesión y permisos
        const session = await auth();
        if (!session || !['admin', 'manager', 'superadmin'].includes(session.user?.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        await dbConnect();

        // 2. Buscar órdenes "Stuck" (pendientes hace más de 10 minutos y menos de 48 horas)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

        const stuckOrders = await Order.find({
            status: 'pending',
            createdAt: { $gte: twoDaysAgo, $lte: tenMinutesAgo },
            isDeleted: { $ne: true }
        }).limit(20); // Procesar de a 20 para evitar timeout en Vercel

        if (stuckOrders.length === 0) {
            return NextResponse.json({ message: 'No se encontraron órdenes para reconciliar' });
        }

        const credentials = await getMPCredentials();
        if (!credentials) {
            return NextResponse.json({ error: 'Credenciales de MP no configuradas' }, { status: 500 });
        }

        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const paymentClient = new Payment(client);

        const results = {
            total: stuckOrders.length,
            recovered: 0,
            errors: 0,
            details: []
        };

        // 3. Procesar cada orden
        for (const order of stuckOrders) {
            try {
                // Buscar pago en MP por external_reference
                // El external_reference es un JSON stringificado
                const externalReferencePart = order._id.toString();
                
                // Nota: La búsqueda por external_reference en la API de MP puede ser lenta.
                // Intentamos buscar pagos recientes que coincidan.
                const searchResponse = await paymentClient.search({
                    qs: {
                        external_reference: `{"locationId":"${order.location.locationId}","orderId":"${order._id}"}`,
                        sort: 'date_created',
                        criteria: 'desc',
                    }
                });

                // Si no encuentra con el JSON exacto, probamos solo con el orderId si fue guardado distinto
                let payments = searchResponse.results || [];
                
                if (payments.length === 0) {
                    const altSearch = await paymentClient.search({
                        qs: {
                            external_reference: order._id.toString(),
                        }
                    });
                    payments = altSearch.results || [];
                }

                if (payments.length > 0) {
                    const lastPayment = payments[0]; // Tomamos el más reciente

                    if (lastPayment.status === 'approved') {
                        // ¡Encontramos un pago aprobado que no se registró!
                        await Order.findByIdAndUpdate(order._id, {
                            $set: {
                                paymentStatus: 'approved',
                                mercadoPagoId: lastPayment.id.toString(),
                                status: 'confirmed',
                                confirmedAt: new Date(),
                            }
                        });

                        await AuditLog.create({
                            performedBy: { userName: 'System Reconciliation', userRole: 'system' },
                            action: 'STATUS_CHANGE',
                            entity: 'order',
                            entityId: order._id,
                            entityName: order.orderNumber,
                            details: `Orden recuperada por sistema de reconciliación. Pago MP ID: ${lastPayment.id}`,
                            metadata: { paymentId: lastPayment.id, recoveryType: 'auto-sync' }
                        });

                        results.recovered++;
                        results.details.push({ order: order.orderNumber, status: 'recovered' });
                    } else {
                        results.details.push({ order: order.orderNumber, status: `checked (MP: ${lastPayment.status})` });
                    }
                } else {
                    results.details.push({ order: order.orderNumber, status: 'no_payment_found' });
                }
            } catch (orderError) {
                console.error(`[SYNC] Error procesando orden ${order.orderNumber}:`, orderError.message);
                results.errors++;
                results.details.push({ order: order.orderNumber, status: 'error', message: orderError.message });
            }
        }

        return NextResponse.json(results);

    } catch (error) {
        console.error('[SYNC CRASH]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
