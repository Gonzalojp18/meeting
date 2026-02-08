import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusLabels = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Listo',
    completed: 'Completado',
    cancelled: 'Cancelado'
};

const paymentLabels = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    refunded: 'Reembolsado'
};

const refundLabels = {
    none: '-',
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completado',
    failed: 'Fallido'
};

/**
 * 🔒 SECURITY: Sanitize values to prevent CSV/Formula Injection (VULN-007)
 * Prefixes dangerous characters with apostrophe to prevent Excel formula execution
 * @param {any} value - Value to sanitize
 * @returns {string} - Sanitized string safe for Excel
 */
function sanitizeForExcel(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;

    const str = String(value).trim();
    if (!str) return '';

    // Characters that trigger formula execution in Excel
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n', '|'];

    // If starts with dangerous char, prefix with apostrophe (Excel text indicator)
    if (dangerousChars.some(char => str.startsWith(char))) {
        return "'" + str;
    }

    return str;
}

export function exportSalesReportXLSX(orders, { startDate, endDate, locationName }) {
    const data = orders.map(order => ({
        'Numero Pedido': sanitizeForExcel(order.orderNumber || '-'),
        'Fecha': format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: es }),
        'Hora': format(new Date(order.createdAt), 'HH:mm'),
        'Cliente': sanitizeForExcel(`${order.customer?.name || ''} ${order.customer?.lastname || ''}`.trim()),
        'Telefono': sanitizeForExcel(order.customer?.phone || ''),
        'Email': sanitizeForExcel(order.customer?.email || ''),
        'Sede': sanitizeForExcel(order.location?.locationName || '-'),
        'Metodo Entrega': sanitizeForExcel(order.deliveryMethod || '-'),
        'Items': sanitizeForExcel((order.items || []).map(i => `${i.quantity}x ${i.name}`).join('; ')),
        'Subtotal': order.subtotal || 0,
        'Envio': order.deliveryFee || 0,
        'Total': order.total || 0,
        'Estado Pedido': statusLabels[order.status] || order.status,
        'Estado Pago': paymentLabels[order.paymentStatus] || order.paymentStatus,
        'Metodo Pago': sanitizeForExcel(order.paymentMethod || '-'),
        'Motivo Cancelacion': sanitizeForExcel(order.cancellationReason || ''),
        'Fecha Cancelacion': order.cancelledAt ? format(new Date(order.cancelledAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
        'Estado Reembolso': refundLabels[order.refund?.status] || '-',
        'ID Reembolso MP': sanitizeForExcel(order.refund?.mercadoPagoRefundId || ''),
        'Monto Reembolsado': order.refund?.amount || 0,
        'Notas': sanitizeForExcel(order.notes || '')
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
        { wch: 18 },  // Numero Pedido
        { wch: 12 },  // Fecha
        { wch: 8 },   // Hora
        { wch: 22 },  // Cliente
        { wch: 15 },  // Telefono
        { wch: 25 },  // Email
        { wch: 15 },  // Sede
        { wch: 18 },  // Metodo Entrega
        { wch: 40 },  // Items
        { wch: 12 },  // Subtotal
        { wch: 10 },  // Envio
        { wch: 12 },  // Total
        { wch: 14 },  // Estado Pedido
        { wch: 14 },  // Estado Pago
        { wch: 16 },  // Metodo Pago
        { wch: 25 },  // Motivo Cancelacion
        { wch: 20 },  // Fecha Cancelacion
        { wch: 16 },  // Estado Reembolso
        { wch: 20 },  // ID Reembolso MP
        { wch: 16 },  // Monto Reembolsado
        { wch: 30 },  // Notas
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(
        wb,
        `reporte-ventas-${format(new Date(startDate), 'yyyyMMdd')}-${format(new Date(endDate), 'yyyyMMdd')}.xlsx`
    );
}
