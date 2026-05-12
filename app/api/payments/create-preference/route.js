import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import mongoose from 'mongoose';
import { getMPCredentials } from '@/utils/getMPCredentials';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';
import Menu from '@/models/Menu';
import Order from '@/models/Order';
import { DEFAULT_TAKEAWAY_HOURS, isWithinTakeawayHours } from '@/utils/constants';
import { encrypt, hashForSearch } from '@/utils/encryption';

/**
 * SEGURIDAD: Valida los precios de los items contra la base de datos
 * Previene manipulación de precios por parte del cliente (VULN-006)
 */
async function validateAndGetRealPrices(items, locationId, menuType) {
    const menu = await Menu.findOne({ menuType: menuType || 'standard' });
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
                if (!group) {
                    // El grupo no está en el menú DB pero el cliente lo seleccionó (display-only, sin precio)
                    const rawSelections = (customization.selections || (customization.selected ? [customization.selected] : []))
                        .map(s => String(s).trim().slice(0, 100)).filter(Boolean);
                    if (rawSelections.length > 0 && customization.groupName) {
                        validatedCustomizations.push({
                            group: String(customization.groupName).trim().slice(0, 100),
                            selections: rawSelections,
                            priceModifier: 0,
                        });
                    }
                } else {
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
                    // Guardar el grupo si hubo selecciones validadas contra el menú.
                    // Si no hubo matches (ej: opciones no registradas en DB), usar las selecciones
                    // crudas del cliente como fallback de solo-display (el precio ya fue
                    // recalculado desde el servidor, así que no hay riesgo de manipulación).
                    const displaySelections = validatedSelections.length > 0
                        ? validatedSelections
                        : selections.map(s => String(s).trim().slice(0, 100)).filter(Boolean);

                    if (displaySelections.length > 0) {
                        validatedCustomizations.push({
                            group: group.name,
                            selections: displaySelections,
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
        const { items, customerData, total: clientTotal, locationId, menuType, qrPromoDiscount, qrPromoSource, qrPromoDiscountAmount, orderTiming, scheduledPickupAt, affiliateDiscount, affiliateDiscountCode, affiliateProspectName, affiliateCompany } = body;

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
            validated = await validateAndGetRealPrices(items, locationId, menuType);
        } catch (validationError) {
            console.error('[SECURITY] Error validando precios:', validationError.message);
            return NextResponse.json({ error: validationError.message }, { status: 400 });
        }

        const serverTotal = validated.total;

        // =====================================================
        // SEGURIDAD: Validar descuentos (QR Promo y Afiliados)
        // =====================================================
        let validatedDiscountPercentage = 0;

        // 1. Validar descuento de QR Marketing (Standard)
        if (qrPromoDiscount > 0 && qrPromoDiscount <= 50) {
            validatedDiscountPercentage = qrPromoDiscount;
        }

        // 2. Validar descuento de Club de Afiliados (B2B)
        // CRÍTICO: No confiar en el total/descuento enviado por el cliente
        let verifiedAffiliateDiscount = 0;
        if (affiliateDiscountCode) {
            try {
                const AffiliateProspect = (await import('@/models/AffiliateProspect')).default;
                const prospect = await AffiliateProspect.findOne({ 
                    discountCode: affiliateDiscountCode,
                    locationId: locationId,
                    discountUsed: false 
                });

                if (!prospect) {
                    throw new Error('Código de afiliado inválido, ya usado o no pertenece a esta sede');
                }

                // El descuento real es el que está en la base de datos
                verifiedAffiliateDiscount = prospect.discountPercentage;
                
                // Si el cliente intentó mandar un descuento mayor al que tiene asignado, abortamos
                if (affiliateDiscount > verifiedAffiliateDiscount) {
                    throw new Error('Manipulación de descuento detectada');
                }
                
                validatedDiscountPercentage = verifiedAffiliateDiscount;
            } catch (err) {
                console.error('[SECURITY] Error validando afiliado:', err.message);
                return NextResponse.json({ error: err.message }, { status: 400 });
            }
        }

        const expectedTotal = Math.round(serverTotal * (1 - validatedDiscountPercentage / 100));

        const finalPriceDiff = Math.abs(expectedTotal - clientTotal);
        if (finalPriceDiff > 1) {
            console.error('[SECURITY] Intento de manipulación de precio:', {
                clientTotal, serverTotal, expectedTotal, difference: finalPriceDiff,
                qrPromoDiscount, affiliateDiscount, verifiedAffiliateDiscount
            });
            return NextResponse.json(
                { error: 'Los precios o descuentos han cambiado. Por favor, recarga la página.' },
                { status: 400 }
            );
        }

        // =====================================================
        // CREAR LA ORDEN EN DB ANTES DE IR A MERCADOPAGO
        // Usamos insertOne() para BYPASSEAR los hooks de Mongoose.
        // =====================================================
        const orderCount = await Order.countDocuments();
        const timestamp = Date.now().toString(36).toUpperCase();
        const orderNumber = `ORD-${String(orderCount + 1).padStart(4, '0')}-${timestamp.slice(-4)}`;

        const menuDoc = await Menu.findOne().lean();
        const locationInfo = menuDoc?.locations?.find(l => l.nameId === locationId);
        const locationName = locationInfo?.name || locationId;

        const now = new Date();
        const orderDoc = {
            orderNumber,
            orderMode: menuType || 'standard',
            customer: {
                name: encrypt(customerData.name),
                lastname: encrypt(customerData.lastname || '-'),
                phone: encrypt(customerData.phone),
                phoneHash: hashForSearch(customerData.phone),
                email: customerData.email ? encrypt(customerData.email) : '',
            },
            items: validated.items.map(item => ({
                itemId: new mongoose.Types.ObjectId(item.itemId),
                name: item.name,
                quantity: item.quantity,
                price: item.unitPrice,
                customizations: (item.customizations || []).map(c => ({
                    groupName: c.group || c.groupName || '',
                    selections: c.selections || [],
                    selected: c.selections?.[0] || '',
                })),
                origin: item.origin || 'organic',
                ...(item.upsellId && { upsellId: item.upsellId }),
            })),
            location: { locationId, locationName },
            deliveryMethod: customerData.deliveryMethod || 'Retiro en Sucursal',
            deliveryAddress: customerData.deliveryAddress || '',
            notes: (customerData.notes || '').toString().trim().substring(0, 500),
            subtotal: serverTotal,
            total: expectedTotal,
            ...(hasQrPromo && {
                qrPromoDiscount,
                qrPromoSource: qrPromoSource || '',
                qrPromoDiscountAmount: qrPromoDiscountAmount || Math.round(serverTotal - expectedTotal),
            }),
            ...(affiliateDiscount > 0 && {
                affiliateDiscount,
                affiliateDiscountCode: affiliateDiscountCode || '',
                affiliateProspectName: affiliateProspectName || '',
                affiliateCompany: affiliateCompany || '',
            }),
            paymentMethod: 'Mercado Pago',
            paymentStatus: 'pending',
            status: 'pending',
            printStatus: { printed: false, error: false },
            canBeCounted: true,
            isDeleted: false,
            printHistory: [],
            createdAt: now,
            updatedAt: now,
        };

        if (orderTiming === 'scheduled' && scheduledPickupAt) {
            orderDoc.orderTiming = 'scheduled';
            orderDoc.scheduledPickupAt = new Date(scheduledPickupAt);
            orderDoc.scheduledStatus = 'pending_schedule';
        }

        let insertedId;
        try {
            const result = await Order.collection.insertOne(orderDoc);
            insertedId = result.insertedId;
            console.log(`[CREATE PREFERENCE] ✅ Orden guardada: ${orderNumber} (${insertedId})`);

            // Marcar código de afiliado como usado si aplica
            if (affiliateDiscountCode) {
                try {
                    const AffiliateProspect = (await import('@/models/AffiliateProspect')).default;
                    await AffiliateProspect.findOneAndUpdate(
                        { discountCode: affiliateDiscountCode },
                        {
                            discountUsed: true,
                            discountUsedAt: new Date(),
                            status: 'converted'
                        }
                    );
                    console.log(`[CREATE PREFERENCE] ✅ Código afiliado marcado como usado: ${affiliateDiscountCode}`);
                } catch (affErr) {
                    console.error('[CREATE PREFERENCE] ❌ Error actualizando prospecto:', affErr.message);
                }
            }
        } catch (saveErr) {
            console.error('[CREATE PREFERENCE] ❌ Error insertando orden:', saveErr.message);
            return NextResponse.json(
                { error: 'Error al guardar la orden', detail: saveErr.message },
                { status: 500 }
            );
        }

        // =====================================================
        // CREAR PREFERENCIA EN MERCADOPAGO
        // =====================================================
        const mpItems = validated.items.map(item => {
            let title = item.name;
            if (item.customizations && item.customizations.length > 0) {
                const parts = item.customizations.map(c => {
                    const selections = c.selections || [];
                    return Array.isArray(selections) ? selections.join('+') : '';
                }).filter(Boolean);
                if (parts.length > 0) {
                    title += ` (${parts.join(', ')})`;
                }
            }
            return {
                title,
                quantity: item.quantity,
                unit_price: Math.max(0, Number(item.unitPrice) || 0),
                currency_id: 'ARS',
            };
        });

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
                    orderId: insertedId.toString(),
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
                    order_id: insertedId.toString(),
                    location_id: locationId,
                },

            },
        });

        console.log('[CREATE PREFERENCE] ✅ MP preferencia:', result.id, '→ Orden:', orderNumber);

        return NextResponse.json({
            init_point: result.init_point,
            preference_id: result.id,
            orderId: insertedId.toString(),
            orderNumber,
        });


    } catch (error) {
        console.error('[CREATE PREFERENCE] ❌ Error general:', error.message, error.stack);
        return NextResponse.json(
            { error: 'Error al procesar el pago', detail: error.message },
            { status: 500 }
        );
    }
}
