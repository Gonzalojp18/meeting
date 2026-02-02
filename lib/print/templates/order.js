import { ESC_POS } from '../client';

/**
 * Helpers robustos para evitar crashes por undefined/null
 */
const toNum = (v, fallback = 0) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const money = (v) => toNum(v, 0).toLocaleString('es-AR');

const safeStr = (v, fallback = '') =>
    typeof v === 'string' && v.trim().length > 0 ? v : fallback;

const safeDate = (v) => {
    const d = v ? new Date(v) : new Date();
    return isNaN(d.getTime())
        ? new Date().toLocaleString('es-AR')
        : d.toLocaleString('es-AR');
};

/**
 * Template para Cocina / Preparación
 */
export function orderTemplate(payload) {
    const data = payload?.data ?? {};
    const items = Array.isArray(data.items) ? data.items : [];
    const customer = data.customer ?? {};

    let chunks = [];

    // Header
    chunks.push(ESC_POS.INIT, ESC_POS.ALIGN_CENTER);
    chunks.push(ESC_POS.TEXT_SIZE_LARGE, ESC_POS.BOLD_ON);
    chunks.push(Buffer.from(`ORDEN: ${safeStr(data.orderNumber, 'N/A')}\n`));
    chunks.push(ESC_POS.TEXT_SIZE_NORMAL, ESC_POS.BOLD_OFF);
    chunks.push(Buffer.from(`--------------------------------\n`));

    // Info General
    chunks.push(ESC_POS.ALIGN_LEFT);
    chunks.push(Buffer.from(`Fecha: ${safeDate(data.createdAt)}\n`));
    chunks.push(Buffer.from(`Tipo: ${safeStr(data.deliveryMethod, 'No especificado')}\n`));
    chunks.push(Buffer.from(`Sede: ${safeStr(data.location?.locationName, 'N/A')}\n`));

    chunks.push(Buffer.from(`--------------------------------\n`));
    chunks.push(ESC_POS.BOLD_ON);
    chunks.push(
        Buffer.from(
            `CLIENTE: ${safeStr(customer.name, 'N/A')} ${safeStr(customer.lastname, '')}\n`,
        ),
    );
    chunks.push(Buffer.from(`TEL: ${safeStr(customer.phone, 'N/A')}\n`));
    chunks.push(ESC_POS.BOLD_OFF);
    chunks.push(Buffer.from(`--------------------------------\n`));

    // Items
    chunks.push(Buffer.from(`CANT  DETALLE             PRECIO\n`));
    chunks.push(Buffer.from(`----  ------------------- ------\n`));

    items.forEach((item) => {
        const qty = toNum(item?.quantity, 0).toString().padEnd(4);
        const name = safeStr(item?.name, 'ITEM').substring(0, 19).padEnd(19);
        const price = `$${money(item?.price)}`.padStart(6);
        chunks.push(Buffer.from(`${qty}  ${name} ${price}\n`));
    });

    // Totales
    const subtotal = toNum(data.subtotal, 0);
    const deliveryFee = toNum(data.deliveryFee, 0);
    const total =
        Number.isFinite(toNum(data.total, NaN)) ? toNum(data.total) : subtotal + deliveryFee;

    chunks.push(Buffer.from(`--------------------------------\n`));
    chunks.push(ESC_POS.ALIGN_RIGHT, ESC_POS.BOLD_ON);
    chunks.push(Buffer.from(`TOTAL: $${money(total)}\n`));
    chunks.push(ESC_POS.BOLD_OFF);

    // Footer
    chunks.push(Buffer.from('\n\n'), ESC_POS.CUT);

    return Buffer.concat(chunks);
}

/**
 * Template para Caja / Cliente (Cashier)
 */
export function cashierTemplate(payload) {
    const data = payload?.data ?? {};
    const items = Array.isArray(data.items) ? data.items : [];
    const customer = data.customer ?? {};

    // Fallbacks numéricos
    const subtotal = toNum(data.subtotal, 0);
    const deliveryFee = toNum(data.deliveryFee, 0);
    const total =
        Number.isFinite(toNum(data.total, NaN)) ? toNum(data.total) : subtotal + deliveryFee;

    const cols = toNum(payload?.metadata?.columns, 32);
    const lineStr = '-'.repeat(cols);

    let chunks = [];

    chunks.push(ESC_POS.INIT, ESC_POS.ALIGN_CENTER);
    chunks.push(ESC_POS.TEXT_SIZE_LARGE, ESC_POS.BOLD_ON);
    chunks.push(Buffer.from(`${(data.location?.locationName?.toUpperCase()) || 'MI NEGOCIO'}\n`));
    chunks.push(ESC_POS.TEXT_SIZE_NORMAL, ESC_POS.BOLD_OFF);
    chunks.push(Buffer.from(`TICKET DE PAGO\n`));
    chunks.push(Buffer.from(`${lineStr}\n`));

    chunks.push(ESC_POS.ALIGN_LEFT);
    chunks.push(Buffer.from(`Orden: ${safeStr(data.orderNumber, 'N/A')}\n`));
    chunks.push(Buffer.from(`Fecha: ${safeDate(data.createdAt)}\n`));
    chunks.push(
        Buffer.from(
            `Cliente: ${safeStr(customer.name, 'N/A')} ${safeStr(customer.lastname, '')}\n`,
        ),
    );

    chunks.push(Buffer.from(`${lineStr}\n`));

    items.forEach((item) => {
        const qty = toNum(item?.quantity, 0);
        const name = safeStr(item?.name, 'ITEM');
        const line = `${qty}x ${name}`;

        const lineTotal = toNum(item?.price, 0) * qty;
        const price = `$${money(lineTotal)}`;

        // Nombre a la izquierda, total sub-item a la derecha
        const dotsCount = Math.max(2, cols - line.length - price.length);
        const dots = '.'.repeat(dotsCount);
        chunks.push(Buffer.from(`${line}${dots}${price}\n`));
    });

    chunks.push(Buffer.from(`${lineStr}\n`));
    chunks.push(ESC_POS.ALIGN_RIGHT);
    chunks.push(Buffer.from(`Subtotal: $${money(subtotal)}\n`));

    if (deliveryFee > 0) {
        chunks.push(Buffer.from(`Envío: $${money(deliveryFee)}\n`));
    }

    chunks.push(ESC_POS.TEXT_SIZE_LARGE, ESC_POS.BOLD_ON);
    chunks.push(Buffer.from(`TOTAL: $${money(total)}\n`));
    chunks.push(ESC_POS.TEXT_SIZE_NORMAL, ESC_POS.BOLD_OFF);

    chunks.push(ESC_POS.ALIGN_CENTER);
    chunks.push(Buffer.from(`\n¡Gracias por su compra!\n`));
    chunks.push(Buffer.from(`Email: ${safeStr(customer.email, '-')}\n`));

    chunks.push(Buffer.from('\n\n'), ESC_POS.CUT);

    return Buffer.concat(chunks);
}