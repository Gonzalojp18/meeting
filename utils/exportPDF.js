import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export function exportSalesReportPDF(orders, { startDate, endDate, locationName }) {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55);
    doc.text('Reporte de Ventas', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(
        `Periodo: ${format(new Date(startDate), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(endDate), 'dd/MM/yyyy', { locale: es })}`,
        14,
        28
    );
    doc.text(`Sede: ${locationName}`, 14, 34);
    doc.text(
        `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
        pageWidth - 70,
        28
    );

    // --- Resumen ---
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const pending = orders.length - completed - cancelled;

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(
        `Total Pedidos: ${orders.length}   |   Ventas: $${totalRevenue.toLocaleString('es-AR')}   |   Completados: ${completed}   |   Cancelados: ${cancelled}   |   Otros: ${pending}`,
        14,
        44
    );

    // --- Linea separadora ---
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 47, pageWidth - 14, 47);

    // --- Tabla ---
    const tableData = orders.map(order => [
        order.orderNumber || '-',
        format(new Date(order.createdAt), 'dd/MM/yy HH:mm'),
        `${order.customer?.name || ''} ${order.customer?.lastname || ''}`.trim() || '-',
        order.location?.locationName || '-',
        (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', '),
        `$${(order.subtotal || 0).toLocaleString('es-AR')}`,
        `$${(order.deliveryFee || 0).toLocaleString('es-AR')}`,
        `$${(order.total || 0).toLocaleString('es-AR')}`,
        statusLabels[order.status] || order.status,
        paymentLabels[order.paymentStatus] || order.paymentStatus
    ]);

    autoTable(doc, {
        startY: 52,
        head: [['# Pedido', 'Fecha', 'Cliente', 'Sede', 'Items', 'Subtotal', 'Envio', 'Total', 'Estado', 'Pago']],
        body: tableData,
        headStyles: {
            fillColor: [249, 115, 22],
            fontSize: 8,
            fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
            0: { cellWidth: 22 },
            4: { cellWidth: 55 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(
                `Pagina ${data.pageNumber} de ${pageCount}`,
                pageWidth - 35,
                doc.internal.pageSize.height - 10
            );
        }
    });

    // --- Fila de total al final ---
    const finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.setFont(undefined, 'bold');
    doc.text(`Total General: $${totalRevenue.toLocaleString('es-AR')}`, 14, finalY);

    doc.save(
        `reporte-ventas-${format(new Date(startDate), 'yyyyMMdd')}-${format(new Date(endDate), 'yyyyMMdd')}.pdf`
    );
}
