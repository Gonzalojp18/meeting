import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import Counter from '@/models/Counter';
import { auth } from '@/auth';
import mongoose from 'mongoose';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { trackCustomer } from '@/utils/customerTracking';
import { createOrderSchema, parseBody } from '@/lib/schemas';

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
        const isManager = session.user.role === 'manager';
        const isStaffForLocation = session.user.role === 'staff' && session.user.assignedLocations?.includes(locationId);

        if (!isOwner && !isManager && !isStaffForLocation) {
            return NextResponse.json({ error: 'No tienes permiso para esta sede' }, { status: 403 });
        }

        const orders = await Order.find({
            'location.locationId': locationId,
            paymentStatus: 'approved',
            isDeleted: false,
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // Enriquecer items con categoryName desde el menú
        const Menu = (await import('@/models/Menu')).default;
        const menu = await Menu.findOne({ 'locations.isActive': true }).lean();
        const itemCategoryMap = {};
        if (menu) {
            menu.categories.forEach(cat => {
                cat.items.forEach(item => {
                    itemCategoryMap[item._id.toString()] = cat.name;
                });
            });
        }
        const enrichedOrders = orders.map(order => ({
            ...order,
            items: order.items.map(item => ({
                ...item,
                categoryName: item.categoryName || itemCategoryMap[item.itemId?.toString()] || '',
            }))
        }));

        return NextResponse.json(enrichedOrders);
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

        // 🔒 Rate Limiting Check
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

        // 🔒 Validación de inputs con Zod (evita mass assignment y datos malformados)
        const rawBody = await req.json();
        const parsed = parseBody(rawBody, createOrderSchema);
        if (parsed.error) return parsed.response;

        const { customerData, items, location, deliveryMethod, deliveryAddress, notes, total, source } = parsed.data;

        // Atómica: Incremento garantizado libre de condiciones de carrera
        const counter = await Counter.findOneAndUpdate(
            { _id: 'orderId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const timestampStr = Date.now().toString().slice(-6);
        const orderNumber = `ORD-${timestampStr}-${counter.seq}`;

        // 🔒 Construir documento nativo bypassando hooks (evita error de cifrado en Vercel)
        const now = new Date();
        const orderDoc = {
            customer: {
                name: customerData.name,
                lastname: customerData.lastname || '',
                phone: customerData.phone,
                email: customerData.email || '',
            },
            items: items.map(item => ({
                ...item,
                itemId: item.itemId ? new mongoose.Types.ObjectId(item.itemId) : undefined
            })),
            location,
            deliveryMethod,
            deliveryAddress: deliveryAddress || '',
            notes: notes || '',
            total,
            source: source || 'direct',
            orderNumber,
            status: 'pending',
            paymentStatus: 'pending',
            printStatus: { printed: false, error: false },
            canBeCounted: true,
            isDeleted: false,
            printHistory: [],
            createdAt: now,
            updatedAt: now,
        };

        const result = await Order.collection.insertOne(orderDoc);
        const newOrder = { ...orderDoc, _id: result.insertedId };

        // Track customer (async, no bloquea el flujo)
        trackCustomer({
            phone: customerData?.phone,
            email: customerData?.email,
            name: customerData?.name,
            lastname: customerData?.lastname,
            total,
            locationId: location?.locationId
        }).catch(err => console.error('[Order POST] trackCustomer error:', err));

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error) {
        // 🔒 SECURITY: Solo log interno, no exponer detalles al cliente
        console.error('Error creating order:', error.message);
        return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 });
    }
}
