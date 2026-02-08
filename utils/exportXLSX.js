import ExcelJS from 'exceljs';
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
 * 🔒 SECURITY: Sanitize values to prevent CSV/Formula Injection
 * Prefixes dangerous characters with apostrophe to prevent Excel formula execution
 */
function sanitizeForExcel(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;

    const str = String(value).trim();
    if (!str) return '';

    const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n', '|'];
    if (dangerousChars.some(char => str.startsWith(char))) {
        return "'" + str;
    }

    return str;
}

export async function exportSalesReportXLSX(orders, { startDate, endDate, locationName }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Ventas';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Ventas', {
        views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
    });

    // Define columns with headers and widths
    worksheet.columns = [
        { header: 'Numero Pedido', key: 'orderNumber', width: 18 },
        { header: 'Fecha', key: 'date', width: 12 },
        { header: 'Hora', key: 'time', width: 8 },
        { header: 'Cliente', key: 'customer', width: 22 },
        { header: 'Telefono', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Sede', key: 'location', width: 15 },
        { header: 'Metodo Entrega', key: 'deliveryMethod', width: 18 },
        { header: 'Items', key: 'items', width: 40 },
        { header: 'Subtotal', key: 'subtotal', width: 12 },
        { header: 'Envio', key: 'deliveryFee', width: 10 },
        { header: 'Total', key: 'total', width: 12 },
        { header: 'Estado Pedido', key: 'orderStatus', width: 14 },
        { header: 'Estado Pago', key: 'paymentStatus', width: 14 },
        { header: 'Metodo Pago', key: 'paymentMethod', width: 16 },
        { header: 'Motivo Cancelacion', key: 'cancellationReason', width: 25 },
        { header: 'Fecha Cancelacion', key: 'cancellationDate', width: 20 },
        { header: 'Estado Reembolso', key: 'refundStatus', width: 16 },
        { header: 'ID Reembolso MP', key: 'refundId', width: 20 },
        { header: 'Monto Reembolsado', key: 'refundAmount', width: 16 },
        { header: 'Notas', key: 'notes', width: 30 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
    };

    // Add data rows
    orders.forEach(order => {
        worksheet.addRow({
            orderNumber: sanitizeForExcel(order.orderNumber || '-'),
            date: format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: es }),
            time: format(new Date(order.createdAt), 'HH:mm'),
            customer: sanitizeForExcel(`${order.customer?.name || ''} ${order.customer?.lastname || ''}`.trim()),
            phone: sanitizeForExcel(order.customer?.phone || ''),
            email: sanitizeForExcel(order.customer?.email || ''),
            location: sanitizeForExcel(order.location?.locationName || '-'),
            deliveryMethod: sanitizeForExcel(order.deliveryMethod || '-'),
            items: sanitizeForExcel((order.items || []).map(i => `${i.quantity}x ${i.name}`).join('; ')),
            subtotal: order.subtotal || 0,
            deliveryFee: order.deliveryFee || 0,
            total: order.total || 0,
            orderStatus: statusLabels[order.status] || order.status,
            paymentStatus: paymentLabels[order.paymentStatus] || order.paymentStatus,
            paymentMethod: sanitizeForExcel(order.paymentMethod || '-'),
            cancellationReason: sanitizeForExcel(order.cancellationReason || ''),
            cancellationDate: order.cancelledAt ? format(new Date(order.cancelledAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
            refundStatus: refundLabels[order.refund?.status] || '-',
            refundId: sanitizeForExcel(order.refund?.mercadoPagoRefundId || ''),
            refundAmount: order.refund?.amount || 0,
            notes: sanitizeForExcel(order.notes || '')
        });
    });

    // Format number columns as currency
    ['subtotal', 'deliveryFee', 'total', 'refundAmount'].forEach(key => {
        const col = worksheet.getColumn(key);
        col.numFmt = '"$"#,##0.00';
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const filename = `reporte-ventas-${format(new Date(startDate), 'yyyyMMdd')}-${format(new Date(endDate), 'yyyyMMdd')}.xlsx`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
