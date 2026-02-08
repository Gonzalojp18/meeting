import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Order from '@/models/Order';
import { auth } from '@/auth';
import { executePrintSaga } from '@/lib/print/saga';

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

export async function POST(req) {
    try {
        await dbConnect();
        const data = await req.json();

        // Generate order number (simple version for now)
        const orderCount = await Order.countDocuments();
        const orderNumber = `ORD-${Date.now()}-${orderCount + 1}`;

        const newOrder = new Order({
            ...data,
            orderNumber,
            status: 'pending',
            paymentStatus: 'pending'
        });

        await newOrder.save();

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
