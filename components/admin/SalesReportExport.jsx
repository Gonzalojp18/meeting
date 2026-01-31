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

import ReportFilters from './ReportFilters';
import StatsGrid from './StatsGrid';
import TopItemsList from './TopItemsList';

const SalesReportExport = ({ locations = [] }) => {
  const { data: session } = useSession();
  const token = session?.user?.token;

  // Defaults: primer dia del mes actual y hoy
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(format(firstOfMonth, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
  const [selectedLocation, setSelectedLocation] = useState('');
  const [statsData, setStatsData] = useState(null);
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState(null);

  const locationName = useMemo(() => {
    if (!selectedLocation) return 'Todas las sedes';
    const loc = locations.find(l => l.nameId === selectedLocation);
    return loc?.name || selectedLocation;
  }, [selectedLocation, locations]);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setOrders(null);
    setStatsData(null);

    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (selectedLocation) params.set('locationId', selectedLocation);

      // 1. Fetch Stats
      const statsRes = await fetch(`/api/admin/reports/stats?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (statsRes.ok) {
        setStatsData(await statsRes.json());
      }

      // 2. Fetch Detailed Orders (for export)
      const ordersRes = await fetch(`/api/admin/reports/orders?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!ordersRes.ok) {
        const data = await ordersRes.json();
        throw new Error(data.error || 'Error al obtener los pedidos');
      }

      const ordersData = await ordersRes.json();
      setOrders(ordersData);
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
      <ReportFilters
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        locations={locations}
        onSearch={handleGenerateReport}
        loading={loading}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Resumen Visual */}
      {statsData && (
        <div className="space-y-6 animate-fadeIn">
          <StatsGrid summary={statsData.summary} deliveryStats={statsData.deliveryStats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopItemsList topDishes={statsData.topDishes} />

            {/* Botones de exportar */}
            {orders && orders.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-700 mb-6 flex items-center gap-2">
                  <MdFileDownload className="h-4 w-4 text-orange-500" />
                  Exportar Reporte Generado
                </h3>

                <div className="flex flex-col gap-4 mt-auto">
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting === 'pdf'}
                    className="w-full px-5 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl text-sm font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
                  >
                    {exporting === 'pdf' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Generando PDF...</span>
                      </>
                    ) : (
                      <>
                        <MdDescription className="h-6 w-6 group-hover:scale-110 transition-transform" />
                        <span>DESCARGAR REPORTE EN PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportXLSX}
                    disabled={exporting === 'xlsx'}
                    className="w-full px-5 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-sm font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
                  >
                    {exporting === 'xlsx' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Generando Excel...</span>
                      </>
                    ) : (
                      <>
                        <MdTableChart className="h-6 w-6 group-hover:scale-110 transition-transform" />
                        <span>DESCARGAR REPORTE EN EXCEL</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed text-center">
                    Pedidos del {format(new Date(startDate), "d 'de' MMMM yyyy", { locale: es })} <br />
                    al {format(new Date(endDate), "d 'de' MMMM yyyy", { locale: es })}
                    {selectedLocation ? ` - ${locationName}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {orders && orders.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center animate-fadeIn">
          <MdShoppingCart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h4 className="text-gray-900 font-bold mb-1">Sin datos en este periodo</h4>
          <p className="text-gray-500 text-sm">No se encontraron pedidos confirmados para los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
};

export default SalesReportExport;
