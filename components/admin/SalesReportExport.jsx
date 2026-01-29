'use client';
import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MdDescription,
  MdTableChart,
  MdSearch,
  MdFileDownload,
  MdCalendarToday,
  MdLocationOn,
  MdAttachMoney,
  MdShoppingCart,
  MdCheckCircle,
  MdCancel
} from 'react-icons/md';

const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  completed: 'Completado',
  cancelled: 'Cancelado'
};

const SalesReportExport = ({ locations = [] }) => {
  const { data: session } = useSession();
  const token = session?.user?.token;

  // Defaults: primer dia del mes actual y hoy
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(format(firstOfMonth, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
  const [selectedLocation, setSelectedLocation] = useState('');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState(null);

  const summary = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const approved = orders.filter(o => o.paymentStatus === 'approved').length;
    return { totalRevenue, completed, cancelled, approved, total: orders.length };
  }, [orders]);

  const locationName = useMemo(() => {
    if (!selectedLocation) return 'Todas las sedes';
    const loc = locations.find(l => l.nameId === selectedLocation);
    return loc?.name || selectedLocation;
  }, [selectedLocation, locations]);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setOrders(null);

    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (selectedLocation) params.set('locationId', selectedLocation);

      const res = await fetch(`/api/admin/reports/orders?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al obtener los datos');
      }

      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const { exportSalesReportPDF } = await import('@/utils/exportPDF');
      exportSalesReportPDF(orders, { startDate, endDate, locationName });
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Error al generar el PDF');
    } finally {
      setExporting(null);
    }
  };

  const handleExportXLSX = async () => {
    setExporting('xlsx');
    try {
      const { exportSalesReportXLSX } = await import('@/utils/exportXLSX');
      exportSalesReportXLSX(orders, { startDate, endDate, locationName });
    } catch (err) {
      console.error('Error exporting XLSX:', err);
      setError('Error al generar el Excel');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <MdCalendarToday className="h-4 w-4 text-orange-500" />
          Filtros del reporte
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sede</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="">Todas las sedes</option>
              {locations.map((loc) => (
                <option key={loc.nameId} value={loc.nameId}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Cargando...
                </>
              ) : (
                <>
                  <MdSearch className="h-4 w-4" />
                  Generar Reporte
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Resumen */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MdShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Pedidos</p>
                <p className="text-xl font-bold text-gray-900">{summary.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MdAttachMoney className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ventas Totales</p>
                <p className="text-xl font-bold text-gray-900">${summary.totalRevenue.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <MdCheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Completados</p>
                <p className="text-xl font-bold text-gray-900">{summary.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <MdCancel className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Cancelados</p>
                <p className="text-xl font-bold text-gray-900">{summary.cancelled}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de exportar */}
      {orders && orders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MdFileDownload className="h-4 w-4 text-orange-500" />
            Exportar reporte
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportPDF}
              disabled={exporting === 'pdf'}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {exporting === 'pdf' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando PDF...
                </>
              ) : (
                <>
                  <MdDescription className="h-5 w-5" />
                  Exportar PDF
                </>
              )}
            </button>

            <button
              onClick={handleExportXLSX}
              disabled={exporting === 'xlsx'}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {exporting === 'xlsx' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando Excel...
                </>
              ) : (
                <>
                  <MdTableChart className="h-5 w-5" />
                  Exportar Excel
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} del {format(new Date(startDate), "d 'de' MMMM yyyy", { locale: es })} al {format(new Date(endDate), "d 'de' MMMM yyyy", { locale: es })}
            {selectedLocation ? ` - ${locationName}` : ''}
          </p>
        </div>
      )}

      {/* Sin resultados */}
      {orders && orders.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <MdShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No se encontraron pedidos en el periodo seleccionado</p>
        </div>
      )}
    </div>
  );
};

export default SalesReportExport;
