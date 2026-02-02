import { orderTemplate, cashierTemplate } from './templates/order';
/**
 * Diccionario de plantillas disponibles
 */
const TEMPLATES = {
    ORDER_TICKET: orderTemplate,
    CASHIER_TICKET: cashierTemplate,
};
/**
 * Generador Universal
 * @param {Object} payload { template: 'ORDER_TICKET', data: {...}, metadata: {...} }
 */
export function generateBuffer(payload) {
    const templateFn = TEMPLATES[payload.template];

    if (!templateFn) {
        throw new Error(`Plantilla no encontrada: ${payload.template}`);
    }
    return templateFn(payload);
}