import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Upselling from "@/models/Upselling";
import Menu from "@/models/Menu";
import Settings from "@/models/Settings";
import mongoose from "mongoose";
import { weightedShuffleByPriority } from "@/utils/upsellingHelpers";
import { DEFAULT_UPSELLING_CONFIG } from "@/utils/constants";

/**
 * POST /api/upselling/suggest
 *
 * Motor de sugerencias inteligente.
 * Recibe el carrito actual y devuelve las mejores sugerencias de upselling.
 *
 * Mejoras implementadas:
 * 1. Rotación aleatoria ponderada dentro del mismo nivel de prioridad
 * 2. (Client-side) Anti-repetición con localStorage
 * 3. Límite configurable desde admin Settings
 * 4. Peso por tasa de conversión
 * 5. Filtrar cross-sells cuya categoría ya está cubierta en el carrito
 *
 * Body:
 * - cartItems: [{ itemId, itemName, categoryId, quantity }]
 * - displayLocation: 'menu' | 'checkout' | 'cart'
 * - locationId: string (ubicación del restaurante)
 * - limit: number | null (si null, se usa el valor de Settings)
 */
export async function POST(request) {
    try {
        await dbConnect();

        const body = await request.json();
        const {
            cartItems = [],
            displayLocation = 'checkout',
            locationId = null,
            limit = null
        } = body;

        // [Mejora 3] Resolver límite: si el cliente no envía, usar Settings
        let effectiveLimit;
        if (limit !== null && limit !== undefined) {
            effectiveLimit = limit;
        } else {
            try {
                const config = await Settings.getValue('upselling_config') || DEFAULT_UPSELLING_CONFIG;
                const limitMap = {
                    menu: config.maxInMenu,
                    checkout: config.maxInCheckout,
                    cart: config.maxInCart
                };
                effectiveLimit = limitMap[displayLocation] || config.maxInCheckout || 2;
            } catch {
                effectiveLimit = 2;
            }
        }

        // Obtener hora actual para filtrar por timing
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        const currentTime = hour + (minutes / 60);

        let currentTiming;
        if (currentTime >= 8.5 && currentTime < 12) {
            currentTiming = 'mañana';
        } else {
            currentTiming = 'tarde';
        }

        // Día actual (0 = domingo)
        const currentDay = now.getDay();

        console.log(`[Upselling Suggest] Time: ${hour}:00, Timing: ${currentTiming}, Day: ${currentDay}, Location: ${displayLocation}, Limit: ${effectiveLimit}`);

        // Construir query base
        const query = {
            isActive: true,
            daysActive: currentDay
        };

        // Filtrar por ubicación de display
        if (displayLocation === 'menu') {
            query['displayLocations.inMenu'] = true;
        } else if (displayLocation === 'checkout') {
            query['displayLocations.inCheckout'] = true;
        } else if (displayLocation === 'cart') {
            query['displayLocations.inCart'] = true;
        }
        console.log(`[Upselling Suggest] Query:`, JSON.stringify(query));

        // Obtener todos los upsellings activos que coinciden
        let upsellings = await Upselling.find(query)
            .sort({ priority: -1 })
            .lean();

        console.log(`[Upselling Suggest] Found ${upsellings.length} upsellings before timing filter`);

        // Si no hay resultados, debug
        if (upsellings.length === 0) {
            const totalActive = await Upselling.countDocuments({ isActive: true });
            const totalWithDay = await Upselling.countDocuments({ isActive: true, daysActive: currentDay });
            console.log(`[Upselling Suggest] DEBUG: Total active: ${totalActive}, With day ${currentDay}: ${totalWithDay}`);
        }

        // Filtrar por timing
        if (upsellings.length > 0) {
            const timingFiltered = upsellings.filter(u =>
                u.timing === currentTiming || u.timing === 'todo-el-dia'
            );

            if (timingFiltered.length > 0) {
                upsellings = timingFiltered;
                console.log(`[Upselling Suggest] After timing filter: ${upsellings.length} upsellings`);
            } else {
                console.log(`[Upselling Suggest] No timing match, using all ${upsellings.length} upsellings`);
            }
        }

        // Filtrar por ubicación del restaurante
        if (locationId && upsellings.length > 0) {
            upsellings = upsellings.filter(u =>
                !u.locationId || u.locationId === locationId
            );
        }

        // [Mejora 5] Preparar mapa de categorías del menú ANTES del procesamiento del carrito
        const menu = await Menu.findOne().lean();
        const itemCategoryMap = {}; // { itemId -> categoryId }
        if (menu?.categories) {
            for (const cat of menu.categories) {
                const catId = cat._id?.toString();
                if (catId && cat.items) {
                    for (const item of cat.items) {
                        itemCategoryMap[item._id.toString()] = catId;
                    }
                }
            }
        }

        // Si hay items en el carrito, priorizar los que tienen trigger match
        if (cartItems.length > 0) {
            console.log(`[Upselling Suggest] Cart items:`, cartItems.map(i => i.itemName || i.itemId));

            const cartItemIds = [];
            const cartCategoryIds = [];

            for (const item of cartItems) {
                if (item.itemId) {
                    try {
                        if (mongoose.Types.ObjectId.isValid(item.itemId)) {
                            cartItemIds.push(new mongoose.Types.ObjectId(item.itemId));
                        }
                    } catch (e) {
                        console.log(`[Upselling Suggest] Invalid itemId: ${item.itemId}`);
                    }
                }
                if (item.categoryId) {
                    try {
                        if (mongoose.Types.ObjectId.isValid(item.categoryId)) {
                            cartCategoryIds.push(new mongoose.Types.ObjectId(item.categoryId));
                        }
                    } catch (e) {
                        console.log(`[Upselling Suggest] Invalid categoryId: ${item.categoryId}`);
                    }
                }
            }

            // [Mejora 5] Construir set de categorías presentes en el carrito (desde el menú)
            const cartCategoriesFromMenu = new Set();
            for (const cartId of cartItemIds) {
                const catId = itemCategoryMap[cartId.toString()];
                if (catId) cartCategoriesFromMenu.add(catId);
            }
            // También incluir las que vienen directo del carrito
            for (const catId of cartCategoryIds) {
                cartCategoriesFromMenu.add(catId.toString());
            }

            console.log(`[Upselling Suggest] Valid IDs - Items: ${cartItemIds.length}, Categories: ${cartCategoryIds.length}, Cart categories: ${cartCategoriesFromMenu.size}`);

            // Separar upsellings con trigger match vs sin match
            const withTriggerMatch = [];
            const withCategoryMatch = [];
            const noTrigger = [];
            const withUnmatchedTrigger = [];

            for (const upselling of upsellings) {
                // Verificar si algún item del carrito coincide con el trigger
                const triggerMatch = upselling.triggerItemId &&
                    cartItemIds.some(id => id.equals(upselling.triggerItemId));

                // Verificar si alguna categoría coincide
                const categoryMatch = upselling.triggerCategoryId &&
                    cartCategoryIds.some(id => id.equals(upselling.triggerCategoryId));

                // Evitar sugerir productos que ya están en el carrito
                const suggestedItemIds = upselling.suggestedItems.map(s => s.itemId.toString());
                const alreadyInCart = cartItemIds.some(id =>
                    suggestedItemIds.includes(id.toString())
                );

                if (alreadyInCart) {
                    continue;
                }

                // [Mejora 5] Para cross-sells: si TODOS los items sugeridos pertenecen
                // a una categoría que ya está en el carrito, skip.
                // No aplica a upsell, upgrade, combo (sugerir dentro de la misma categoría es intencional).
                if (upselling.type === 'cross-sell' && cartCategoriesFromMenu.size > 0) {
                    const allSuggestedInCartCategories = suggestedItemIds.every(itemId => {
                        const catId = itemCategoryMap[itemId];
                        return catId && cartCategoriesFromMenu.has(catId);
                    });
                    if (allSuggestedInCartCategories) {
                        console.log(`[Upselling Suggest] Skipping cross-sell "${upselling.name}" - category already in cart`);
                        continue;
                    }
                }

                if (triggerMatch) {
                    withTriggerMatch.push(upselling);
                } else if (categoryMatch) {
                    withCategoryMatch.push(upselling);
                } else if (!upselling.triggerItemId && !upselling.triggerCategoryId) {
                    noTrigger.push(upselling);
                } else {
                    withUnmatchedTrigger.push(upselling);
                }
            }

            console.log(`[Upselling Suggest] Matches - Trigger: ${withTriggerMatch.length}, Category: ${withCategoryMatch.length}, NoTrigger: ${noTrigger.length}, Unmatched: ${withUnmatchedTrigger.length}`);

            // [Mejora 1 + 4] Combinar con shuffle ponderado dentro de cada bucket
            upsellings = [
                ...weightedShuffleByPriority(withTriggerMatch),
                ...weightedShuffleByPriority(withCategoryMatch),
                ...weightedShuffleByPriority(noTrigger),
                ...weightedShuffleByPriority(withUnmatchedTrigger)
            ];

            console.log(`[Upselling Suggest] Final upsellings count: ${upsellings.length}`);
        } else {
            // [Mejora 1 + 4] Sin carrito, igual aplicar shuffle ponderado
            upsellings = weightedShuffleByPriority(upsellings);
        }

        // Limitar resultados
        const suggestions = upsellings.slice(0, effectiveLimit);

        // Enriquecer sugerencias con precios actuales
        const enrichedSuggestions = suggestions.map(suggestion => {
            const suggestedItemsWithPrices = suggestion.suggestedItems.map(item => {
                let price = 0;

                if (menu?.categories) {
                    for (const category of menu.categories) {
                        const menuItem = category.items?.find(
                            i => i._id.toString() === item.itemId.toString()
                        );
                        if (menuItem) {
                            if (locationId && menuItem.prices && typeof menuItem.prices === 'object') {
                                price = menuItem.prices[locationId] || menuItem.prices.location1 || 0;
                            } else if (typeof menuItem.prices === 'number') {
                                price = menuItem.prices;
                            } else if (menuItem.prices?.location1) {
                                price = menuItem.prices.location1;
                            }
                            break;
                        }
                    }
                }

                return {
                    ...item,
                    price
                };
            });

            const totalPrice = suggestedItemsWithPrices.reduce((sum, item) => sum + item.price, 0);

            return {
                _id: suggestion._id,
                name: suggestion.name,
                type: suggestion.type,
                copyText: suggestion.copyText,
                description: suggestion.description,
                ticketLevel: suggestion.ticketLevel,
                suggestedItems: suggestedItemsWithPrices,
                totalPrice,
                displayLocation
            };
        });

        return NextResponse.json({
            success: true,
            data: enrichedSuggestions,
            meta: {
                timing: currentTiming,
                day: currentDay,
                cartItemCount: cartItems.length,
                totalAvailable: upsellings.length,
                limit: effectiveLimit
            }
        });

    } catch (error) {
        console.error("Error getting suggestions:", error);
        return NextResponse.json(
            { success: false, error: "Error al obtener sugerencias" },
            { status: 500 }
        );
    }
}
