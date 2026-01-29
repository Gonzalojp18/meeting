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

export function exportSalesReportXLSX(orders, { startDate, endDate, locationName }) {
    const data = orders.map(order => ({
        'Numero Pedido': order.orderNumber || '-',
        'Fecha': format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: es }),
        'Hora': format(new Date(order.createdAt), 'HH:mm'),
        'Cliente': `${order.customer?.name || ''} ${order.customer?.lastname || ''}`.trim(),
        'Telefono': order.customer?.phone || '',
        'Email': order.customer?.email || '',
        'Sede': order.location?.locationName || '-',
        'Metodo Entrega': order.deliveryMethod || '-',
        'Items': (order.items || []).map(i => `${i.quantity}x ${i.name}`).join('; '),
        'Subtotal': order.subtotal || 0,
        'Envio': order.deliveryFee || 0,
        'Total': order.total || 0,
        'Estado Pedido': statusLabels[order.status] || order.status,
        'Estado Pago': paymentLabels[order.paymentStatus] || order.paymentStatus,
        'Metodo Pago': order.paymentMethod || '-',
        'Notas': order.notes || ''
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
        { wch: 30 },  // Notas
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(
        wb,
        `reporte-ventas-${format(new Date(startDate), 'yyyyMMdd')}-${format(new Date(endDate), 'yyyyMMdd')}.xlsx`
    );
}
