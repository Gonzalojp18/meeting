/**
 * utils/customerTracking.js
 *
 * 🔒 SEGURIDAD: Los datos de clientes se almacenan cifrados en MongoDB.
 * Las búsquedas se realizan por phoneHash / emailHash (HMAC-SHA256 determinístico)
 * para no tener que descifrar todos los registros.
 */

import Customer from '@/models/Customer';
import dbConnect from './dbConnect';
import { hashForSearch } from './encryption';

/**
 * Tracking de clientes únicos.
 * Se llama automáticamente al crear una orden.
 */
export async function trackCustomer(orderData) {
    try {
        await dbConnect();

        const { phone, email, name, lastname, total, locationId, orderId, isExecutive, affiliateDiscountCode } = orderData;

        if (!phone) {
            console.error('[trackCustomer] Phone is required');
            return null;
        }

        // 🔒 Buscar por hash determinístico — no por valor cifrado
        const phoneHash = hashForSearch(phone);
        const emailHash = email ? hashForSearch(email) : undefined;

        // Construir el $set con los datos que se quieren actualizar
        // El pre-save hook del modelo se encargará de cifrarlos antes de guardar
        const updateSet = {
            lastOrderDate: new Date(),
        };
        if (name) updateSet.name = name;
        if (lastname) updateSet.lastname = lastname;
        if (email) updateSet.email = email;
        if (emailHash) updateSet.emailHash = emailHash;

        // Upsert: buscar por phoneHash, actualizar o crear
        const customer = await Customer.findOneAndUpdate(
            { phoneHash },
            {
                $set: updateSet,
                $inc: {
                    totalOrders: 1,
                    totalSpent: total || 0,
                },
                $setOnInsert: {
                    phone,        // el pre-save hook cifrará esto al crear
                    phoneHash,
                    firstOrderDate: new Date(),
                },
            },
            {
                upsert: true,
                new: true,
                runValidators: false, // pre-save hooks manejan la lógica
            }
        );

        // Actualizar stats por locación
        if (locationId && customer) {
            const locationIndex = customer.locations.findIndex(
                loc => loc.locationId === locationId
            );

            if (locationIndex >= 0) {
                customer.locations[locationIndex].orderCount += 1;
                customer.locations[locationIndex].totalSpent += total || 0;
                customer.locations[locationIndex].lastOrderDate = new Date();
            } else {
                customer.locations.push({
                    locationId,
                    orderCount: 1,
                    totalSpent: total || 0,
                    lastOrderDate: new Date(),
                });
            }

            await customer.save();
        }

        return customer;
    } catch (error) {
        console.error('[trackCustomer] Error:', error);
        return null;
    }
}

/**
 * Obtener stats de un cliente por teléfono.
 * Busca por phoneHash para no descifrar toda la colección.
 */
export async function getCustomerStats(phone) {
    try {
        await dbConnect();
        const phoneHash = hashForSearch(phone);
        return await Customer.findOne({ phoneHash }).lean();
    } catch (error) {
        console.error('[getCustomerStats] Error:', error);
        return null;
    }
}
