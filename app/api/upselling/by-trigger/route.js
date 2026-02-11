import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Upselling from "@/models/Upselling";
import Menu from "@/models/Menu";
import mongoose from "mongoose";
import { weightedShuffleByPriority } from "@/utils/upsellingHelpers";

/**
 * POST /api/upselling/by-trigger
 * 
 * Obtiene upsellings activos basados en los IDs de productos trigger.
 * Optimizado para obtener múltiples upsellings en una sola llamada.
 * 
 * Body:
 * - itemIds: string[] - IDs de productos para buscar upsellings
 * - timing: string (opcional) - 'mañana', 'tarde', 'todo-el-dia'
 */
export async function POST(request) {
    try {
        await dbConnect();

        const body = await request.json();
        const { itemIds, timing } = body;

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: {}
            });
        }

        // Convertir IDs a ObjectId
        const objectIds = itemIds
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

        if (objectIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: {}
            });
        }

        // Determinar timing actual si no se proporciona
        let currentTiming = timing;
        if (!currentTiming) {
            const now = new Date();
            const hour = now.getHours();
            const minutes = now.getMinutes();
            const currentTime = hour + (minutes / 60);

            if (currentTime >= 8.5 && currentTime < 12) {
                currentTiming = 'mañana';
            } else {
                currentTiming = 'tarde';
            }
        }

        // Día actual (0 = domingo)
        const currentDay = new Date().getDay();

        // Buscar upsellings que tengan estos items como trigger
        const upsellings = await Upselling.find({
            isActive: true,
            'displayLocations.inMenu': true,
            triggerItemId: { $in: objectIds },
            daysActive: currentDay,
            $or: [
                { timing: currentTiming },
                { timing: 'todo-el-dia' }
            ]
        })
            .sort({ priority: -1 })
            .lean();

        // Obtener precios del menú
        const menu = await Menu.findOne().lean();

        // [Mejora 1 + 4] Agrupar por triggerId, luego pick ponderado entre los de mayor prioridad
        const triggerGroups = {}; // { triggerId -> [upsellings] }

        for (const upselling of upsellings) {
            const triggerId = upselling.triggerItemId.toString();
            if (!triggerGroups[triggerId]) triggerGroups[triggerId] = [];
            triggerGroups[triggerId].push(upselling);
        }

        const upsellingsByTrigger = {};

        for (const [triggerId, group] of Object.entries(triggerGroups)) {
            // Dentro del grupo (ya ordenado por priority DESC), filtrar solo los de top priority
            const topPriority = group[0].priority;
            const topGroup = group.filter(u => u.priority === topPriority);

            // Weighted random pick entre los de misma prioridad
            const shuffled = weightedShuffleByPriority(topGroup);
            const upselling = shuffled[0];

            // Enriquecer con precios
            const enrichedItems = upselling.suggestedItems.map(item => {
                let price = 0;

                if (menu?.categories) {
                    for (const cat of menu.categories) {
                        const menuItem = cat.items?.find(i =>
                            i._id.toString() === item.itemId.toString()
                        );
                        if (menuItem) {
                            price = menuItem.prices?.location1 || menuItem.prices || 0;
                            break;
                        }
                    }
                }

                return {
                    ...item,
                    price
                };
            });

            const totalPrice = enrichedItems.reduce((sum, i) => sum + (i.price || 0), 0);

            upsellingsByTrigger[triggerId] = {
                _id: upselling._id,
                copyText: upselling.copyText,
                suggestedItems: enrichedItems,
                totalPrice,
                type: upselling.type
            };
        }

        return NextResponse.json({
            success: true,
            data: upsellingsByTrigger
        });

    } catch (error) {
        console.error("Error fetching upsellings by trigger:", error);
        return NextResponse.json(
            { success: false, error: "Error al obtener upsellings" },
            { status: 500 }
        );
    }
}
