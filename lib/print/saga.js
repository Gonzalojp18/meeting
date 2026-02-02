import { generateBuffer } from './gen';
import queue from './queue';
import Printer from '../../models/Printer';
import Order from '../../models/Order';
import dbConnect from '@/utils/dbConnect';
/**
 * Orquestador Saga para la impresión de una orden
 * Maneja el flujo: Generar -> Identificar Destinos -> Intentar Envío -> Gestionar Errores
 */
export async function executePrintSaga(orderOrId, metadata = { type: 'kitchen' }) {
    // Detectar si es un objeto completo (Mock o Instancia) comprobando si tiene 'location'
    const isMock = typeof orderOrId === 'object' && orderOrId !== null && 'location' in orderOrId;
    const orderId = isMock ? orderOrId._id : orderOrId;

    console.log(`[SAGA] Iniciando impresión para Orden: ${orderId} (Objeto completo: ${isMock})`);
    console.log(`[SAGA] Metadata: ${JSON.stringify(metadata)}`);

    try {
        let order;
        if (isMock) {
            order = orderOrId;
        } else {
            await dbConnect();
            order = await Order.findById(orderId);
        }

        if (!order) throw new Error('Orden no encontrada');

        // 1.5 Chequeo de duplicados
        // Si ya se imprimió exitosamente y no es un reintento forzado, omitir.
        if (order.printStatus?.printed && !metadata.force) {
            console.log(`[SAGA] Orden ${orderId} ya impresa. Omitiendo duplicado.`);
            return { status: 'skipped', reason: 'already_printed' };
        }

        const orderLocationId = order.location?.locationId;
        if (!orderLocationId) throw new Error('La orden no tiene una sede asignada');

        // 2. Identificar destinos (Aislamiento por Sede)
        let targetPrinters = [];
        if (metadata.targetUids?.length > 0) {
            targetPrinters = await Printer.find({ uid: { $in: metadata.targetUids }, isActive: true });
            // REMOVED: Fallback to order.printStatus.targetUids
            // Reason: It causes sticky behavior where Cashier printer is used for Kitchen jobs.
            // We always want to resolve by Role + Location for each distinct print job.
        } else {
            console.log(`[SAGA] Sede: ${orderLocationId}, Rol: ${metadata.type}`);
            targetPrinters = await Printer.find({ locationId: orderLocationId, roles: metadata.type, isActive: true });

            // Optional: We could update targetUids using $addToSet if we wanted to track ALL used printers
            // But for now, let's keep it simple and just rely on dynamic lookup.
        }

        if (targetPrinters.length === 0) {
            console.warn(`[SAGA] No hay impresoras en ${orderLocationId} para el rol ${metadata.type}`);
            return { status: 'no_printers' };
        }

        // 3. Ejecutar Impresión con Seguimiento de Estado
        const printResults = await Promise.allSettled(
            targetPrinters.map(async (printer) => {
                try {
                    // Estado: PENDING
                    await Printer.findByIdAndUpdate(printer._id, { lastStatus: 'pending', statusMessage: 'Transmitiendo...' });

                    let templateId = metadata.template || 'ORDER_TICKET';
                    if (!metadata.template && printer.roles.includes('cashier')) templateId = 'CASHIER_TICKET';

                    const columns = printer.columns || (printer.paperWidth === 80 ? 48 : 32);
                    const buffer = generateBuffer({
                        template: templateId,
                        data: order,
                        metadata: { ...metadata, columns }
                    });
                    await queue.enqueue(printer, buffer);

                    // Estado: ONLINE
                    await Printer.findByIdAndUpdate(printer._id, { lastStatus: 'online', statusMessage: 'Listo' });
                    return { printerName: printer.name, success: true };
                } catch (err) {
                    // Estado: ERROR
                    // console.error(`[SAGA] Error en ${printer.name}: ${err.message}`);
                    console.error("[SAGA] Error:", err);
                    console.error("[SAGA] Stack:", err?.stack);
                    await Printer.findByIdAndUpdate(printer._id, { lastStatus: 'error', statusMessage: err.message });
                    throw err;
                }
            })
        );

        const errors = printResults.filter(r => r.status === 'rejected');

        // Log to Print History (DB)


        // Log to Print History (DB)
        if (!isMock) {
            const historyUpdates = targetPrinters.map(p => {
                const res = printResults.find(r => r.status === 'fulfilled' && r.value?.printerName === p.name);
                return {
                    role: metadata.type,
                    printerName: p.name,
                    status: res ? 'success' : 'error',
                    timestamp: new Date()
                };
            });

            await Order.findByIdAndUpdate(orderId, {
                $push: { printHistory: { $each: historyUpdates } },
                $set: errors.length === 0 ? { 'printStatus.printed': true, 'printStatus.error': false } : { 'printStatus.error': true }
            });
        }

        return errors.length > 0 ? { status: 'partial_error', errorCount: errors.length } : { status: 'success' };
    } catch (error) {
        console.error(`[SAGA FATAL]: ${error.message}`);
        return { status: 'failed', error: error.message };
    }
}