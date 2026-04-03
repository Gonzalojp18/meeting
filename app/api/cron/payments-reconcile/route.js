import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import AuditLog from '@/models/AuditLog';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMPCredentials } from '@/utils/getMPCredentials';

/**
 * GET /api/cron/payments-reconcile
 * Endpoint para Vercel Cron. Ejecuta la misma lógica de reconciliación
 * pero protegido por una CRON_SECRET externa.
 */
export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        
        // 🔒 Protección: Requiere CRON_SECRET coincidente
        if (process.env.NODE_ENV === 'production') {
            if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                console.error('[CRON] Unauthorized - Invalid CRON_SECRET');
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            }
        }

        await dbConnect();

        // 1. Buscar órdenes "Stuck" (pendientes entre 10 min y 24hs)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const stuckOrders = await Order.find({
            status: 'pending',
            createdAt: { $gte: oneDayAgo, $lte: tenMinutesAgo },
            isDeleted: { $ne: true }
        }).limit(20);

        if (stuckOrders.length === 0) {
            return NextResponse.json({ message: 'No hay pedidos pendientes para reconciliar' });
        }

        const credentials = await getMPCredentials();
        if (!credentials) return NextResponse.json({ error: 'Credenciales MP no disponibles' }, { status: 500 });
        
        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const paymentClient = new Payment(client);

        let recoveredCount = 0;

        // 2. Procesar Reconciliation
        for (const order of stuckOrders) {
            try {
                // Buscamos pagos en MP que coincidan con el orderId en external_reference
                const searchResponse = await paymentClient.search({
                    qs: {
                        external_reference: `{"locationId":"${order.location.locationId}","orderId":"${order._id}"}`,
                    }
                });

                let payments = searchResponse.results || [];
                
                // Fallback de búsqueda simplificada
                if (payments.length === 0) {
                    const altSearch = await paymentClient.search({
                        qs: { external_reference: order._id.toString() }
                    });
                    payments = altSearch.results || [];
                }

                if (payments.length > 0 && payments[0].status === 'approved') {
                    const paymentInfo = payments[0];
                    
                    await Order.findByIdAndUpdate(order._id, {
                        $set: {
                            paymentStatus: 'approved',
                            mercadoPagoId: paymentInfo.id.toString(),
                            status: 'confirmed',
                            confirmedAt: new Date(),
                        }
                    });

                    await AuditLog.create({
                        performedBy: { userName: 'Automated Cron Recovery', userRole: 'system' },
                        action: 'STATUS_CHANGE',
                        entity: 'order',
                        entityId: order._id,
                        entityName: order.orderNumber,
                        details: `Cron reconcilió automáticamente el pedido pagado en MP (${paymentInfo.id})`,
                        metadata: { paymentId: paymentInfo.id, recoveryType: 'cron' }
                    });

                    recoveredCount++;
                }
            } catch (err) {
                console.error(`[CRON ERROR] Orden ${order.orderNumber}:`, err.message);
            }
        }

        return NextResponse.json({ 
            status: 'success', 
            processed: stuckOrders.length, 
            recovered: recoveredCount 
        });

    } catch (error) {
        console.error('[CRON CRITICAL FAILURE]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
