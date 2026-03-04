'use client';

import { useEffect, useState, useCallback } from 'react';
import { MdAccessTime, MdBarChart, MdRefresh } from 'react-icons/md';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatMinutes(value) {
    if (value == null) return '—';
    if (value < 60) return `${value} min`;
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return `${h}h ${m}m`;
}

// ─── Gráfico de barras (horas pico) ───────────────────────────────────────────
function HourChart({ data }) {
    if (!data || data.length === 0) {
        return <p className="text-gray-400 text-sm text-center py-8">Sin datos disponibles</p>;
    }

    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="flex items-end gap-1 h-28 w-full">
            {data.map(({ hour, count }) => {
                const height = Math.round((count / maxCount) * 100);
                const isHighlight = count === maxCount && count > 0;
                return (
                    <div
                        key={hour}
                        className="flex flex-col items-center flex-1 group relative"
                        title={`${hour}:00 — ${count} órdenes`}
                    >
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                            {hour}:00 · {count}
                        </div>
                        <div
                            className={`w-full rounded-t transition-all ${isHighlight
                                    ? 'bg-orange-500'
                                    : count > 0
                                        ? 'bg-orange-200 group-hover:bg-orange-400'
                                        : 'bg-gray-100'
                                }`}
                            style={{ height: `${Math.max(height, count > 0 ? 4 : 2)}%` }}
                        />
                        {hour % 6 === 0 && (
                            <span className="text-[9px] text-gray-400 mt-1">{hour}h</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Tabla de preparación ──────────────────────────────────────────────────────
function PrepTable({ data, platformAvg }) {
    if (!data || data.length === 0) {
        return (
            <p className="text-gray-400 text-sm text-center py-6">
                Sin datos de preparación todavía — se acumulan con el uso del sistema
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="pb-2 pr-4">Sede</th>
                        <th className="pb-2 pr-4 text-right">Tiempo prom.</th>
                        <th className="pb-2 text-right">Muestras</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(loc => (
                        <tr key={loc.locationId} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 pr-4 font-medium text-gray-800">{loc.locationName}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                                <span className={`font-semibold ${loc.avgMinutes > 30 ? 'text-red-500' :
                                        loc.avgMinutes > 20 ? 'text-amber-500' : 'text-emerald-500'
                                    }`}>
                                    {formatMinutes(loc.avgMinutes)}
                                </span>
                            </td>
                            <td className="py-2 text-right text-gray-400">{loc.sampleCount}</td>
                        </tr>
                    ))}
                </tbody>
                {platformAvg !== null && (
                    <tfoot>
                        <tr className="border-t-2 border-gray-200 font-semibold text-gray-700">
                            <td className="pt-2 pr-4">Promedio general</td>
                            <td className="pt-2 pr-4 text-right tabular-nums">{formatMinutes(platformAvg)}</td>
                            <td />
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminOperationsKpi() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analytics/operations');
            if (!res.ok) throw new Error('Error al cargar las métricas');
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Error desconocido');
            setData(json.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Cargando métricas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <p className="text-red-500 font-medium text-sm">{error}</p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                    <MdRefresh className="w-4 h-4" />
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                    Solo tu sede · Hora local Argentina
                </p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
                >
                    <MdRefresh className="w-3.5 h-3.5" />
                    Actualizar
                </button>
            </div>

            {/* Gráfico de órdenes por hora */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Órdenes por hora</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Horas pico de tu sede</p>
                    </div>
                    <MdBarChart className="w-5 h-5 text-orange-400" />
                </div>
                <HourChart data={data?.ordersByHour} />
            </div>

            {/* Tabla de tiempo promedio de preparación */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Tiempo promedio de preparación</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Desde confirmación hasta pedido listo</p>
                    </div>
                    <MdAccessTime className="w-5 h-5 text-orange-400" />
                </div>
                <PrepTable
                    data={data?.avgPreparation?.byLocation}
                    platformAvg={data?.avgPreparation?.platformAvgMinutes}
                />
                <p className="text-[11px] text-gray-400 mt-4 border-t border-gray-50 pt-3">
                    🟢 &lt;20 min excelente · 🟡 20-30 min aceptable · 🔴 &gt;30 min a mejorar
                </p>
            </div>
        </div>
    );
}
