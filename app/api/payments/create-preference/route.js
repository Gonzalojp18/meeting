import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getMPCredentials } from '@/utils/getMPCredentials';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';
import Menu from '@/models/Menu';
import Order from '@/models/Order';
import Counter from '@/models/Counter';
import { DEFAULT_TAKEAWAY_HOURS, isWithinTakeawayHours } from '@/utils/constants';

/**
 * SEGURIDAD: Valida los precios de los items contra la base de datos
 * Previene manipulación de precios por parte del cliente (VULN-006)
 */
async function validateAndGetRealPrices(items, locationId) {
    const menu = await Menu.findOne();
    if (!menu) throw new Error('Menú no encontrado');

    const locationPriceMap = {
        'harrods': 'location1',
        'location1': 'location1',
        'pilar': 'location2',
        'location2': 'location2',
        'location3': 'location3',
    };
    const priceKey = locationPriceMap[locationId] || 'location1';

    const validatedItems = [];
    let calculatedTotal = 0;

    for (const cartItem of items) {
        let foundItem = null;
        for (const category of menu.categories) {
            const item = category.items.find(i => i._id.toString() === cartItem.itemId);
            if (item) { foundItem = item; break; }
        }

        if (!foundItem) throw new Error(`Item no encontrado: ${cartItem.name || cartItem.itemId}`);
        if (!foundItem.isAvailable) throw new Error(`Item no disponible: ${foundItem.name}`);

        const realBasePrice = foundItem.prices[priceKey];
        if (realBasePrice === undefined || realBasePrice === null) {
            throw new Error(`Precio no configurado para ${foundItem.name} en esta ubicación`);
        }

        let itemPrice = realBasePrice;
        const validatedCustomizations = [];

        if (cartItem.customizations && Array.isArray(cartItem.customizations)) {
            for (const customization of cartItem.customizations) {
                const group = foundItem.customizations?.find(g => g.name === customization.groupName);
                if (group) {
                    const selections = customization.selections ||
                        (customization.selected ? [customization.selected] : []);
                    const validatedSelections = [];
                    let groupPriceModifier = 0;
                    for (const selection of selections) {
                        const option = group.options.find(o => o.name === selection);
                        if (option && option.isAvailable !== false) {
                            itemPrice += (option.priceModifier || 0);
                            groupPriceModifier += (option.priceModifier || 0);
                            validatedSelections.push(option.name);
                        }
                    }
                    if (validatedSelections.length > 0) {
                        validatedCustomizations.push({
                            group: group.name,
                            selections: validatedSelections,
                            priceModifier: groupPriceModifier,
                        });
                    }
                }
            }
        }

        const quantity = Math.min(Math.max(parseInt(cartItem.quantity) || 1, 1), 50);
        const lineTotal = itemPrice * quantity;
        calculatedTotal += lineTotal;

        validatedItems.push({
            itemId: foundItem._id.toString(),
            name: foundItem.name,
            unitPrice: itemPrice,
            basePrice: realBasePrice,
            quantity,
            lineTotal,
            customizations: validatedCustomizations,
            ...(cartItem.origin && { origin: cartItem.origin }),
            ...(cartItem.upsellId && { upsellId: cartItem.upsellId }),
        });
    }

    return { items: validatedItems, total: calculatedTotal };
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

        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const body = await req.json();
        const { items, customerData, total: clientTotal, locationId } = body;

        // Validaciones básicas
        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
        }
        if (!locationId) {
            return NextResponse.json({ error: 'Ubicación no especificada' }, { status: 400 });
        }
        if (!customerData || !customerData.name || !customerData.phone) {
            return NextResponse.json(
                { error: 'El nombre y teléfono son obligatorios para el pedido.' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Validar horario de takeaway
        const takeawayHours = await Settings.getValue('takeawayHours') || DEFAULT_TAKEAWAY_HOURS;
        if (!isWithinTakeawayHours(takeawayHours)) {
            return NextResponse.json(
                { error: `Fuera del horario de takeaway. Horario: ${takeawayHours.open}hs a ${takeawayHours.close}hs` },
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
            return NextResponse.json({ error: validationError.message }, { status: 400 });
        }

        // Verificar que el total coincida (tolerancia de $1 por redondeo)
        const priceDifference = Math.abs(validated.total - clientTotal);
        if (priceDifference > 1) {
            console.error('[SECURITY] Intento de manipulación de precio:', {
                clientTotal, serverTotal: validated.total, difference: priceDifference,
            });
            return NextResponse.json(
                { error: 'Los precios han cambiado. Por favor, recarga la página y vuelve a intentar.' },
                { status: 400 }
            );
        }

        const serverTotal = validated.total;

        // =====================================================
        // CREAR LA ORDEN EN DB ANTES DE IR A MERCADOPAGO
        // Esto garantiza que la orden exista independientemente
        // de si el webhook llega correctamente o no.
        // =====================================================
        const counter = await Counter.findOneAndUpdate(
            { _id: 'orderId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const timestampStr = Date.now().toString().slice(-6);
        const orderNumber = `ORD-${timestampStr}-${counter.seq}`;

        // Buscar nombre de sede
        const menuDoc = await Menu.findOne().lean();
        const locationInfo = menuDoc?.locations?.find(l => l.nameId === locationId);
        const locationName = locationInfo?.name || locationId;

        const pendingOrder = new Order({
            orderNumber,
            customer: {
                name: customerData.name,
                lastname: customerData.lastname || '-',
                phone: customerData.phone,
                email: customerData.email || '',
            },
            items: validated.items.map(item => ({
                itemId: item.itemId,
                name: item.name,
                quantity: item.quantity,
                price: item.unitPrice,
                customizations: item.customizations.map(c => ({
                    groupName: c.group || c.groupName || '',
                    selections: c.selections || [],
                    selected: c.selections?.[0] || '',
                })),
                ...(item.origin && { origin: item.origin }),
                ...(item.upsellId && { upsellId: item.upsellId }),
            })),
            location: {
                locationId,
                locationName,
            },
            deliveryMethod: customerData.deliveryMethod || 'Retiro en Sucursal',
            deliveryAddress: customerData.deliveryAddress || '',
            notes: (customerData.notes || '').toString().trim().substring(0, 500),
            subtotal: serverTotal,
            total: serverTotal,
            paymentMethod: 'Mercado Pago',
            paymentStatus: 'pending',
            status: 'pending',
            printStatus: { printed: false, error: false },
        });

        await pendingOrder.save();
        console.log(`[CREATE PREFERENCE] ✅ Orden en DB: ${orderNumber} (${pendingOrder._id})`);

        // =====================================================
        // CREAR PREFERENCIA EN MERCADOPAGO
        // Solo guardamos el orderId en metadata — pequeño y confiable.
        // =====================================================
        const mpItems = validated.items.map(item => ({
            title: item.name + (item.customizations.length > 0
                ? ` (${item.customizations.map(c => (c.selections || []).join('+')).join(', ')})`
                : ''),
            quantity: item.quantity,
            unit_price: Number(item.unitPrice),
            currency_id: 'ARS',
        }));

        const host = req.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        let baseUrl = process.env.NEXT_PUBLIC_URL || `${protocol}://${host}`;
        if (!baseUrl || baseUrl.includes('undefined')) {
            baseUrl = 'https://www.meetingrestobar.com';
        }
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: mpItems,
                external_reference: JSON.stringify({
                    locationId,
                    orderId: pendingOrder._id.toString(),
                }),
                payer: {
                    name: customerData.name,
                    surname: customerData.lastname || '',
                    email: customerData.email || 'cliente@pedido.com',
                    phone: { number: customerData.phone },
                },
                back_urls: {
                    success: `${cleanBaseUrl}/checkout/result?status=success`,
                    failure: `${cleanBaseUrl}/checkout/result?status=failure`,
                    pending: `${cleanBaseUrl}/checkout/result?status=pending`,
                },
                auto_return: 'approved',
                notification_url: `${cleanBaseUrl}/api/payments/webhook`,
                binary_mode: true,
                payment_methods: { installments: 1 },
                metadata: {
                    // Solo el orderId — pequeño y seguro. El webhook lo usa para actualizar la orden.
                    order_id: pendingOrder._id.toString(),
                    location_id: locationId,
                },
            },
        });

        console.log('[CREATE PREFERENCE] MP preferencia:', result.id, '→ Orden:', orderNumber);

        return NextResponse.json({
            init_point: result.init_point,
            preference_id: result.id,
            orderId: pendingOrder._id.toString(),
            orderNumber,
        });

    } catch (error) {
        console.error('Error al crear preferencia de MP:', error);
        return NextResponse.json({ error: 'Error al procesar el pago' }, { status: 500 });
    }
}
