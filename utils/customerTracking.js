import Customer from '@/models/Customer';
import dbConnect from './dbConnect';

/**
 * Tracking de clientes únicos
 * Se llama automáticamente al crear una orden
 * 
 * @param {Object} orderData - Datos de la orden
 * @param {string} orderData.phone - Teléfono del cliente
 * @param {string} orderData.email - Email del cliente (opcional)
 * @param {string} orderData.name - Nombre
 * @param {string} orderData.lastname - Apellido
 * @param {number} orderData.total - Total de la orden
 * @param {string} orderData.locationId - ID de la locación
 */
export async function trackCustomer(orderData) {
    try {
        await dbConnect();

        const { phone, email, name, lastname, total, locationId } = orderData;

        if (!phone) {
            console.error('[trackCustomer] Phone is required');
            return null;
        }

        // Upsert del cliente
        const customer = await Customer.findOneAndUpdate(
            { phone },
            {
                $set: {
                    email: email || undefined,
                    name: name || undefined,
                    lastname: lastname || undefined,
                    lastOrderDate: new Date()
                },
                $inc: {
                    totalOrders: 1,
                    totalSpent: total || 0
                },
                $setOnInsert: {
                    firstOrderDate: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                runValidators: true
            }
        );

        // Actualizar stats por locación
        if (locationId) {
            const locationIndex = customer.locations.findIndex(
                loc => loc.locationId === locationId
            );

            if (locationIndex >= 0) {
                // Actualizar locación existente
                customer.locations[locationIndex].orderCount += 1;
                customer.locations[locationIndex].totalSpent += total || 0;
                customer.locations[locationIndex].lastOrderDate = new Date();
            } else {
                // Agregar nueva locación
                customer.locations.push({
                    locationId,
                    orderCount: 1,
                    totalSpent: total || 0,
                    lastOrderDate: new Date()
                });
            }

            await customer.save();
        }

        console.log(`[trackCustomer] Customer ${phone} tracked successfully`);
        return customer;
    } catch (error) {
        console.error('[trackCustomer] Error:', error);
        // No lanzar error para no bloquear el flujo de creación de órdenes
        return null;
    }
}

/**
 * Obtener stats de un cliente específico
 */
export async function getCustomerStats(phone) {
    try {
        await dbConnect();
        return await Customer.findOne({ phone }).lean();
    } catch (error) {
        console.error('[getCustomerStats] Error:', error);
        return null;
    }
}
