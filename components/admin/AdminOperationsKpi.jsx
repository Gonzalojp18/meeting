'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    MdAccessTime,
    MdBarChart,
    MdRefresh,
    MdTimer,
    MdLoop,
    MdTrendingDown,
    MdTrendingUp
} from 'react-icons/md';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatMinutes(value) {
    if (value == null) return '—';
    if (value < 1) return '<1 min';
    if (value < 60) return `${value} min`;
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getStatusDot(value, thresholds) {
    if (value == null) return '⚪';
    if (value > thresholds.bad) return '🔴';
    if (value > thresholds.warn) return '🟡';
    return '🟢';
}

// ─── KPI Summary Card ────────────────────────────────────────────────────────
function KpiSummaryCard({ icon: Icon, iconColor, label, subtitle, value, thresholds }) {
    const dot = thresholds ? getStatusDot(value, thresholds) : null;
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${iconColor}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
            <div className="text-right">
                <p className="text-2xl font-black text-gray-900 tabular-nums">
                    {dot && <span className="mr-1 text-base">{dot}</span>}
                    {formatMinutes(value)}
                </p>
            </div>
        </div>
    );
}

// ─── Gráfico de barras (horas pico) ───────────────────────────────────────────
function HourChart({ data }) {
    if (!data || data.length === 0) {
        return <p className="text-gray-400 text-sm text-center py-8">Sin datos disponibles</p>;
    }

    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="flex items-end gap-[3px] h-32 w-full">
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
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none shadow-lg">
                            {hour}:00 · {count} pedidos
                        </div>
                        <div
                            className={`w-full rounded-t-sm transition-all duration-200 ${isHighlight
                                    ? 'bg-orange-500 shadow-sm'
                                    : count > 0
                                        ? 'bg-orange-200 group-hover:bg-orange-400'
                                        : 'bg-gray-50'
                                }`}
                            style={{ height: `${Math.max(height, count > 0 ? 6 : 2)}%` }}
                        />
                        {hour % 4 === 0 && (
                            <span className="text-[10px] text-gray-400 mt-1 font-medium">{hour}h</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Tabla reutilizable para métricas por sede ────────────────────────────────
function MetricTable({ data, platformAvg, thresholds, emptyMessage }) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400 text-sm">{emptyMessage || 'Sin datos todavía'}</p>
                <p className="text-gray-300 text-xs mt-1">Los datos se acumulan automáticamente</p>
            </div>
        );
    }

    const getColor = (value) => {
        if (!thresholds) return 'text-gray-800';
        if (value > thresholds.bad) return 'text-red-600 font-bold';
        if (value > thresholds.warn) return 'text-amber-600 font-semibold';
        return 'text-emerald-600 font-semibold';
    };

    const getDot = (value) => {
        if (!thresholds) return '';
        if (value > thresholds.bad) return '🔴';
        if (value > thresholds.warn) return '🟡';
        return '🟢';
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="pb-2.5 pr-3">Sede</th>
                        <th className="pb-2.5 pr-3 text-right">Prom.</th>
                        <th className="pb-2.5 text-right">Pedidos</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(loc => (
                        <tr key={loc.locationId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                            <td className="py-2.5 pr-3 font-medium text-gray-800 text-sm">{loc.locationName}</td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">
                                <span className={`${getColor(loc.avgMinutes)}`}>
                                    {getDot(loc.avgMinutes)} {formatMinutes(loc.avgMinutes)}
                                </span>
                            </td>
                            <td className="py-2.5 text-right text-gray-400 text-xs">{loc.sampleCount}</td>
                        </tr>
                    ))}
                </tbody>
                {platformAvg !== null && (
                    <tfoot>
                        <tr className="border-t-2 border-gray-200">
                            <td className="pt-3 pr-3 font-bold text-gray-700 text-sm">Promedio general</td>
                            <td className="pt-3 pr-3 text-right tabular-nums font-bold text-gray-700">{formatMinutes(platformAvg)}</td>
                            <td />
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
}

// ─── Metric Detail Card ───────────────────────────────────────────────────────
function MetricDetailCard({ icon: Icon, iconBg, title, subtitle, data, platformAvg, thresholds, legend, emptyMessage }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="font-bold text-gray-900 text-[15px]">{title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${iconBg}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Card Body */}
            <div className="p-5">
                <MetricTable
                    data={data}
                    platformAvg={platformAvg}
                    thresholds={thresholds}
                    emptyMessage={emptyMessage}
                />
            </div>

            {/* Card Footer — Legend */}
            {legend && (
                <div className="px-5 pb-4">
                    <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
                        {legend}
                    </p>
                </div>
            )}
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
            <div className="flex items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Cargando métricas operacionales...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="p-4 bg-red-50 rounded-full">
                    <MdTrendingDown className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-500 font-medium text-sm">{error}</p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors text-sm font-medium shadow-sm"
                >
                    <MdRefresh className="w-4 h-4" />
                    Reintentar
                </button>
            </div>
        );
    }

    const prepAvg = data?.avgPreparation?.platformAvgMinutes;
    const waitAvg = data?.pickupWait?.platformAvgMinutes;
    const cycleAvg = data?.fullCycle?.platformAvgMinutes;

    return (
        <div className="space-y-6">

            {/* ─── Header Row ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                    Datos de tu sede · Hora Argentina (GMT-3)
                </p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors"
                >
                    <MdRefresh className="w-3.5 h-3.5" />
                    Actualizar
                </button>
            </div>

            {/* ─── KPI Summary Cards (Big Numbers) ──────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiSummaryCard
                    icon={MdAccessTime}
                    iconColor="bg-orange-100 text-orange-600"
                    label="Preparación"
                    subtitle="Confirmación → Listo"
                    value={prepAvg}
                    thresholds={{ warn: 20, bad: 30 }}
                />
                <KpiSummaryCard
                    icon={MdTimer}
                    iconColor="bg-blue-100 text-blue-600"
                    label="Espera Retiro"
                    subtitle="Listo → Entregado"
                    value={waitAvg}
                    thresholds={{ warn: 10, bad: 20 }}
                />
                <KpiSummaryCard
                    icon={MdLoop}
                    iconColor="bg-purple-100 text-purple-600"
                    label="Ciclo Completo"
                    subtitle="Creación → Completado"
                    value={cycleAvg}
                    thresholds={{ warn: 40, bad: 60 }}
                />
            </div>

            {/* ─── Gráfico de órdenes por hora ──────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="font-bold text-gray-900 text-[15px]">Órdenes por hora</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Distribución de pedidos a lo largo del día</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-orange-500">
                        <MdBarChart className="w-5 h-5 text-white" />
                    </div>
                </div>
                <HourChart data={data?.ordersByHour} />
            </div>

            {/* ─── Detalle por sede: 3 métricas ────────────────────────────── */}
            <div>
                <h3 className="font-bold text-gray-900 text-[15px] mb-3 flex items-center gap-2">
                    <MdTrendingUp className="w-5 h-5 text-orange-400" />
                    Detalle por sede
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <MetricDetailCard
                        icon={MdAccessTime}
                        iconBg="bg-orange-500"
                        title="Preparación"
                        subtitle="Confirmación → Listo"
                        data={data?.avgPreparation?.byLocation}
                        platformAvg={prepAvg}
                        thresholds={{ warn: 20, bad: 30 }}
                        legend="🟢 <20 min excelente · 🟡 20-30 min aceptable · 🔴 >30 min a mejorar"
                        emptyMessage="Sin datos de preparación"
                    />
                    <MetricDetailCard
                        icon={MdTimer}
                        iconBg="bg-blue-500"
                        title="Espera de Retiro"
                        subtitle="Listo → Entregado"
                        data={data?.pickupWait?.byLocation}
                        platformAvg={waitAvg}
                        thresholds={{ warn: 10, bad: 20 }}
                        legend="🟢 <10 min rápido · 🟡 10-20 min normal · 🔴 >20 min demorado"
                        emptyMessage="Sin datos de retiro"
                    />
                    <MetricDetailCard
                        icon={MdLoop}
                        iconBg="bg-purple-500"
                        title="Ciclo Completo"
                        subtitle="Creación → Completado"
                        data={data?.fullCycle?.byLocation}
                        platformAvg={cycleAvg}
                        thresholds={{ warn: 40, bad: 60 }}
                        legend="🟢 <40 min ágil · 🟡 40-60 min normal · 🔴 >60 min a optimizar"
                        emptyMessage="Sin datos de ciclo completo"
                    />
                </div>
            </div>
        </div>
    );
}
