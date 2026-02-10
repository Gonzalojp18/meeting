import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getMPCredentials } from '@/utils/getMPCredentials';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';
import Menu from '@/models/Menu';
import { DEFAULT_TAKEAWAY_HOURS, isWithinTakeawayHours } from '@/utils/constants';

/**
 * SEGURIDAD: Valida los precios de los items contra la base de datos
 * Previene manipulación de precios por parte del cliente (VULN-006)
 */
async function validateAndGetRealPrices(items, locationId) {
    const menu = await Menu.findOne();
    if (!menu) {
        throw new Error('Menú no encontrado');
    }

    // Mapear locationId a la clave de precio correspondiente
    const locationPriceMap = {
        'harrods': 'location1',
        'location1': 'location1',
        'pilar': 'location2',
        'location2': 'location2',
        'location3': 'location3'
    };

    const priceKey = locationPriceMap[locationId] || 'location1';

    const validatedItems = [];
    let calculatedTotal = 0;

    for (const cartItem of items) {
        // Buscar el item en el menú por su ID
        let foundItem = null;

        for (const category of menu.categories) {
            const item = category.items.find(i => i._id.toString() === cartItem.itemId);
            if (item) {
                foundItem = item;
                break;
            }
        }

        if (!foundItem) {
            throw new Error(`Item no encontrado: ${cartItem.name || cartItem.itemId}`);
        }

        // Verificar disponibilidad
        if (!foundItem.isAvailable) {
            throw new Error(`Item no disponible: ${foundItem.name}`);
        }

        // Obtener precio real de la base de datos
        const realBasePrice = foundItem.prices[priceKey];
        if (realBasePrice === undefined || realBasePrice === null) {
            throw new Error(`Precio no configurado para ${foundItem.name} en esta ubicación`);
        }

        // Calcular precio con customizaciones
        let itemPrice = realBasePrice;
        const validatedCustomizations = [];

        if (cartItem.customizations && Array.isArray(cartItem.customizations)) {
            for (const customization of cartItem.customizations) {
                // Buscar el grupo de customización en el item
                const group = foundItem.customizations?.find(g => g.name === customization.groupName);
                if (group) {
                    const selections = customization.selections
                        || (customization.selected ? [customization.selected] : []);
                    for (const selection of selections) {
                        const option = group.options.find(o => o.name === selection);
                        if (option && option.isAvailable !== false) {
                            // Sumar modificador de precio REAL de la DB
                            itemPrice += (option.priceModifier || 0);
                            validatedCustomizations.push({
                                group: group.name,
                                option: option.name,
                                priceModifier: option.priceModifier || 0
                            });
                        }
                    }
                }
            }
        }

        // Validar cantidad (mínimo 1, máximo razonable)
        const quantity = Math.min(Math.max(parseInt(cartItem.quantity) || 1, 1), 50);

        const lineTotal = itemPrice * quantity;
        calculatedTotal += lineTotal;

        validatedItems.push({
            itemId: foundItem._id.toString(),
            name: foundItem.name,
            unitPrice: itemPrice,
            basePrice: realBasePrice,
            quantity: quantity,
            lineTotal: lineTotal,
            customizations: validatedCustomizations
        });
    }

    return {
        items: validatedItems,
        total: calculatedTotal
    };
}

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

        const { items, customerData, total: clientTotal, locationId } = body;

        // Validaciones básicas
        if (!items || items.length === 0) {
            return NextResponse.json(
                { error: 'El carrito está vacío' },
                { status: 400 }
            );
        }

        if (!locationId) {
            return NextResponse.json(
                { error: 'Ubicación no especificada' },
                { status: 400 }
            );
        }

        if (!customerData || !customerData.name || !customerData.phone) {
            return NextResponse.json(
                { error: 'El nombre y teléfono son obligatorios para el pedido.' },
                { status: 400 }
            );
        }

        // Conectar a DB
        await dbConnect();

        // Validar horario de takeaway
        const takeawayHours = await Settings.getValue('takeawayHours') || DEFAULT_TAKEAWAY_HOURS;

        if (!isWithinTakeawayHours(takeawayHours)) {
            return NextResponse.json(
                { error: `Fuera del horario de takeaway. Nuestro horario es de ${takeawayHours.open}hs a ${takeawayHours.close}hs` },
                { status: 400 }
            );
        }

        // =====================================================
        // SEGURIDAD: Validar precios contra la base de datos
        // =====================================================
        let validated;
        try {
            validated = await validateAndGetRealPrices(items, locationId);
        } catch (validationError) {
            console.error('[SECURITY] Error validando precios:', validationError.message);
            return NextResponse.json(
                { error: validationError.message },
                { status: 400 }
            );
        }

        // Verificar que el total enviado por el cliente coincida (con tolerancia de $1 por redondeo)
        const priceDifference = Math.abs(validated.total - clientTotal);
        if (priceDifference > 1) {
            console.error('[SECURITY] Intento de manipulación de precio detectado:', {
                clientTotal,
                serverTotal: validated.total,
                difference: priceDifference,
                items: validated.items.map(i => ({ name: i.name, price: i.unitPrice }))
            });
            return NextResponse.json(
                { error: 'Los precios han cambiado. Por favor, recarga la página y vuelve a intentar.' },
                { status: 400 }
            );
        }

        // Usar el total calculado por el servidor (no el del cliente)
        const serverTotal = validated.total;

        console.log('[CREATE PREFERENCE] Validación exitosa:', {
            itemCount: validated.items.length,
            serverTotal,
            customer: customerData.name
        });

        // Crear items para MercadoPago con precios validados
        const mpItems = validated.items.map(item => ({
            title: item.name + (item.customizations.length > 0
                ? ` (${item.customizations.map(c => c.option).join(', ')})`
                : ''),
            quantity: item.quantity,
            unit_price: Number(item.unitPrice),
            currency_id: 'ARS'
        }));

        // URL base dinámica
        const host = req.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';

        let baseUrl = process.env.NEXT_PUBLIC_URL || `${protocol}://${host}`;

        if (!baseUrl || baseUrl.includes('undefined')) {
            baseUrl = process.env.NEXT_PUBLIC_API_NODE_ENV === 'development'
                ? 'http://localhost:3000'
                : 'https://www.meetingrestobar.com';
        }

        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        // Crear preferencia de pago
        const preference = new Preference(client);

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
                payment_methods: {
                    installments: 1
                },
                metadata: {
                    customerData: JSON.stringify(customerData),
                    // Guardar items validados (con precios del servidor)
                    items: JSON.stringify(validated.items),
                    total: serverTotal,
                    locationId: locationId
                }
            }
        });

        console.log('[CREATE PREFERENCE] Preferencia creada:', result.id);

        return NextResponse.json({
            init_point: result.init_point,
            preference_id: result.id
        });

    } catch (error) {
        console.error('Error al crear preferencia de MP:', error);
        return NextResponse.json(
            { error: 'Error al procesar el pago' },
            { status: 500 }
        );
    }
}
