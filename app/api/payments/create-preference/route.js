import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getMPCredentials } from '@/utils/getMPCredentials';

export async function POST(req) {
    try {
        // Obtener credenciales dinámicas desde la DB
        const credentials = await getMPCredentials();
        if (!credentials) {
            return NextResponse.json(
                { error: 'Mercado Pago no está configurado. Contacta al administrador.' },
                { status: 503 }
            );
        }

        const client = new MercadoPagoConfig({
            accessToken: credentials.accessToken
        });

        const body = await req.json();

        const { items, customerData, total, locationId } = body;

        console.log('Creando preferencia de pago:', {
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
                { error: 'El nombre y teléfono son obligatorios para el pedido.' },
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

        // URL base dinámica: Intentamos obtenerla de los headers si no está en env
        const host = req.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';

        let baseUrl = process.env.NEXT_PUBLIC_URL || `${protocol}://${host}`;

        // Fallback si lo anterior falla (para seguridad en server-side)
        if (!baseUrl || baseUrl.includes('undefined')) {
            baseUrl = process.env.NEXT_PUBLIC_API_NODE_ENV === 'development'
                ? 'http://localhost:3000'
                : 'https://www.meetingrestobar.com'; // Dominio principal
        }

        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        // Crear preferencia de pago
        const preference = new Preference(client);

        const notificationUrl = `${cleanBaseUrl}/api/payments/webhook`;
        console.log('---------------------------------------------------');
        console.log('[CREATE PREFERENCE] Notification URL:', notificationUrl);
        console.log('---------------------------------------------------');

        const result = await preference.create({
            body: {
                items: mpItems,
                external_reference: JSON.stringify({ locationId }),
                payer: {
                    name: customerData.name,
                    surname: customerData.lastname || '',
                    email: customerData.email || 'cliente@pedido.com',
                    phone: {
                        number: customerData.phone
                    }
                },
                back_urls: {
                    success: `${cleanBaseUrl}/checkout/result?status=success`,
                    failure: `${cleanBaseUrl}/checkout/result?status=failure`,
                    pending: `${cleanBaseUrl}/checkout/result?status=pending`
                },
                auto_return: 'approved',
                notification_url: `${cleanBaseUrl}/api/payments/webhook`,
                binary_mode: true,
                installments: 1,
                metadata: {
                    customerData: JSON.stringify(customerData),
                    items: JSON.stringify(items),
                    total: total,
                    locationId: locationId
                }
            }
        });

        console.log('Preferencia creada:', result.id);

        return NextResponse.json({
            init_point: result.init_point,
            preference_id: result.id
        });

    } catch (error) {
        console.error('Error al crear preferencia de MP:', error);
        return NextResponse.json(
            { error: 'Error al procesar el pago', details: error.message },
            { status: 500 }
        );
    }
}
