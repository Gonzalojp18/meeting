import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import Counter from '@/models/Counter';
import { auth } from '@/auth';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { executePrintSaga } from '@/lib/print/saga';
import { trackCustomer } from '@/utils/customerTracking';

export async function GET(req) {
    try {
        await dbConnect();
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const locationId = searchParams.get('locationId');

        if (!locationId) {
            return NextResponse.json({ error: 'locationId es requerido' }, { status: 400 });
        }

        // Check permissions
        const isOwner = session.user.role === 'admin';
        const isStaffForLocation = session.user.role === 'staff' && session.user.assignedLocations?.includes(locationId);

        if (!isOwner && !isStaffForLocation) {
            return NextResponse.json({ error: 'No tienes permiso para esta sede' }, { status: 403 });
        }

        const orders = await Order.find({ 'location.locationId': locationId })
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

// 🔒 Rate limiting distribuido con Upstash Redis
// 5 pedidos por minuto por IP para evitar spam/bots
const ratelimit = new Ratelimit({
    redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL || '',
        token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    }),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
});

export async function POST(req) {
    try {
        await dbConnect();

        // Rate Limiting Check
        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            const ip = req.headers.get('x-forwarded-for') ||
                req.headers.get('x-real-ip') ||
                '127.0.0.1';

            const identifier = `order_create_${ip}`;
            const { success } = await ratelimit.limit(identifier);

            if (!success) {
                return NextResponse.json(
                    { error: 'Demasiadas peticiones. Por favor, espera un momento.' },
                    { status: 429 }
                );
            }
        }

        const data = await req.json();

        // Atómica: Incremento garantizado libre de condiciones de carrera
        const counter = await Counter.findOneAndUpdate(
            { _id: 'orderId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const timestampStr = Date.now().toString().slice(-6);
        const orderNumber = `ORD-${timestampStr}-${counter.seq}`;

        const newOrder = new Order({
            ...data,
            orderNumber,
            status: 'pending',
            paymentStatus: 'pending'
        });

        await newOrder.save();

        // Track customer (async, no bloquea el flujo)
        trackCustomer({
            phone: data.customerData?.phone,
            email: data.customerData?.email,
            name: data.customerData?.name,
            lastname: data.customerData?.lastname,
            total: data.total,
            locationId: data.location?.locationId
        }).catch(err => console.error('[Order POST] trackCustomer error:', err));

        // Disparar impresora automáticamente (Bypass MP para pruebas)
        /* 
           COMENTADO PARA CLOUD:
           El Agente de Impresión local se encarga de esto mediante polling.
           Si mantenemos esta llamada, el checkout se queda esperando a una impresora
           que no puede alcanzar (Hostinger -> Local IP) y da timeout.
           
        try {
            // Rol: cashier (Caja) al crear el pedido
            await executePrintSaga(newOrder._id, { type: 'cashier', template: 'CASHIER_TICKET' });
        } catch (printError) {
            console.error('Error al imprimir pedido directo:', printError);
        }
        */

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error) {
        // 🔒 SECURITY: Only log to console, don't write to files (VULN-008)
        console.error('Error creating order:', error.message);
        return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 });
    }
}
