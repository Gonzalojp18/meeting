import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Upselling from "@/models/Upselling";
import Menu from "@/models/Menu";
import mongoose from "mongoose";

/**
 * POST /api/upselling/suggest
 * 
 * Motor de sugerencias inteligente.
 * Recibe el carrito actual y devuelve las mejores sugerencias de upselling.
 * 
 * Body:
 * - cartItems: [{ itemId, itemName, categoryId, quantity }]
 * - displayLocation: 'menu' | 'checkout' | 'cart'
 * - locationId: string (ubicación del restaurante)
 * - limit: number (máximo de sugerencias, default 2)
 */
export async function POST(request) {
    try {
        await dbConnect();

        const body = await request.json();
        const {
            cartItems = [],
            displayLocation = 'checkout',
            locationId = null,
            limit = 2
        } = body;

        // Obtener hora actual para filtrar por timing
        // Horario del restaurante: 08:30 - 20:30
        // mañana: 08:30 - 12:00 (desayunos)
        // tarde: 12:00 - 20:30 (almuerzos, meriendas, cenas tempranas)
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        const currentTime = hour + (minutes / 60); // Ej: 20:30 = 20.5

        let currentTiming;
        if (currentTime >= 8.5 && currentTime < 12) {
            currentTiming = 'mañana';
        } else {
            // De 12:00 a 20:30 (cierre) es "tarde"
            currentTiming = 'tarde';
        }

        // Día actual (0 = domingo)
        const currentDay = now.getDay();

        console.log(`[Upselling Suggest] Time: ${hour}:00, Timing: ${currentTiming}, Day: ${currentDay}, Location: ${displayLocation}`);

        // Construir query base - más permisivo para obtener resultados
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

        // Si no hay resultados, intentar query más simple para debug
        if (upsellings.length === 0) {
            const totalActive = await Upselling.countDocuments({ isActive: true });
            const totalWithDay = await Upselling.countDocuments({ isActive: true, daysActive: currentDay });
            console.log(`[Upselling Suggest] DEBUG: Total active: ${totalActive}, With day ${currentDay}: ${totalWithDay}`);
        }

        // Filtrar por timing (preferir timing actual pero incluir 'todo-el-dia')
        if (upsellings.length > 0) {
            const timingFiltered = upsellings.filter(u =>
                u.timing === currentTiming || u.timing === 'todo-el-dia'
            );

            // Si hay resultados con timing, usar esos; si no, usar todos
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


        // Si hay items en el carrito, priorizar los que tienen trigger match
        if (cartItems.length > 0) {
            console.log(`[Upselling Suggest] Cart items:`, cartItems.map(i => i.itemName || i.itemId));

            // Intentar convertir los IDs del carrito a ObjectId, pero manejar errores
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

            console.log(`[Upselling Suggest] Valid IDs - Items: ${cartItemIds.length}, Categories: ${cartCategoryIds.length}`);

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
                    continue; // Saltar este upselling
                }

                if (triggerMatch) {
                    withTriggerMatch.push(upselling);
                } else if (categoryMatch) {
                    withCategoryMatch.push(upselling);
                } else if (!upselling.triggerItemId && !upselling.triggerCategoryId) {
                    // Upsellings generales (combos especiales sin trigger específico)
                    noTrigger.push(upselling);
                } else {
                    // Tiene trigger pero no coincide - incluir como fallback
                    withUnmatchedTrigger.push(upselling);
                }
            }

            console.log(`[Upselling Suggest] Matches - Trigger: ${withTriggerMatch.length}, Category: ${withCategoryMatch.length}, NoTrigger: ${noTrigger.length}, Unmatched: ${withUnmatchedTrigger.length}`);

            // Combinar priorizando: trigger match > category match > generales > otros
            upsellings = [
                ...withTriggerMatch,
                ...withCategoryMatch,
                ...noTrigger,
                ...withUnmatchedTrigger  // Fallback: si no hay matches, usar estos
            ];

            console.log(`[Upselling Suggest] Final upsellings count: ${upsellings.length}`);
        }

        // Limitar resultados
        const suggestions = upsellings.slice(0, limit);

        // Obtener precios actuales del menú para los productos sugeridos
        const menu = await Menu.findOne().lean();

        // Enriquecer sugerencias con precios actuales
        const enrichedSuggestions = suggestions.map(suggestion => {
            const suggestedItemsWithPrices = suggestion.suggestedItems.map(item => {
                let price = 0;

                // Buscar el precio en el menú
                if (menu?.categories) {
                    for (const category of menu.categories) {
                        const menuItem = category.items?.find(
                            i => i._id.toString() === item.itemId.toString()
                        );
                        if (menuItem) {
                            // Obtener precio para la ubicación específica o precio general
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

            // Calcular precio total de la sugerencia
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
                totalAvailable: upsellings.length
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
