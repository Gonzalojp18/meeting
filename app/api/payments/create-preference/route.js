import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
    accessToken: process.env.NEXT_PUBLIC_MP_ACCESS_TOKEN
});

export async function POST(req) {
    try {
        const body = await req.json();

        const { items, customerData, total, locationId } = body;

        console.log('📦 Creando preferencia de pago:', {
            items: items?.length,
            total,
            customer: customerData?.name
        });

        // Validaciones
        if (!items || items.length === 0) {
            return NextResponse.json(
                { error: 'El carrito está vacío' },
                { status: 400 }
            );
        }

        if (!customerData || !customerData.name || !customerData.phone) {
            return NextResponse.json(
                { error: 'Datos del cliente incompletos' },
                { status: 400 }
            );
        }

        // Crear items para MercadoPago
        const mpItems = items.map(item => ({
            title: item.name,
            quantity: item.quantity,
            unit_price: Number(item.price),
            currency_id: 'ARS'
        }));

        // URL base desde las variables de entorno
        const baseUrl = process.env.NEXT_PUBLIC_API_NODE_ENV === 'development'
            ? (process.env.NEXT_PUBLIC_API_URI_DEVELOPMENT || 'http://localhost:3000')
            : (process.env.NEXT_PUBLIC_API_URI_PRODUCTION || 'https://meeting-pink.vercel.app');

        // Crear preferencia de pago
        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: mpItems,
                payer: {
                    name: customerData.name,
                    surname: customerData.lastname || '',
                    email: customerData.email || 'cliente@pedido.com',
                    phone: {
                        number: customerData.phone
                    }
                },
                back_urls: {
                    success: `${baseUrl}/checkout/result?status=success`,
                    failure: `${baseUrl}/checkout/result?status=failure`,
                    pending: `${baseUrl}/checkout/result?status=pending`
                },
                auto_return: 'approved',
                notification_url: `${baseUrl}/api/payments/webhook`,
                metadata: {
                    customerData: JSON.stringify(customerData),
                    items: JSON.stringify(items),
                    total: total,
                    locationId: locationId
                }
            }
        });

        console.log('✅ Preferencia creada:', result.id);

        return NextResponse.json({
            init_point: result.init_point,
            preference_id: result.id
        });

    } catch (error) {
        console.error('❌ Error al crear preferencia de MP:', error);
        return NextResponse.json(
            { error: 'Error al procesar el pago', details: error.message },
            { status: 500 }
        );
    }
}
