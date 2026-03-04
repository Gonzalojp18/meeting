'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    MdTrendingUp, MdCancel, MdPayment, MdAccessTime,
    MdPeopleAlt, MdHub, MdBarChart, MdRefresh
} from 'react-icons/md';

// ─── Constante visual ──────────────────────────────────────────────────────────
const COMMISSION_RATE_DISPLAY = '10%';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(value) {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatPercent(value) {
    if (value == null) return '—';
    return `${value}%`;
}

function formatMinutes(value) {
    if (value == null) return '—';
    if (value < 60) return `${value} min`;
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return `${h}h ${m}m`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, badge }) {
    const colors = {
        purple: 'from-purple-500 to-indigo-600',
        green: 'from-emerald-500 to-teal-600',
        red: 'from-red-500 to-rose-600',
        blue: 'from-blue-500 to-cyan-600',
        orange: 'from-orange-500 to-amber-600',
        slate: 'from-slate-500 to-gray-600',
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`bg-gradient-to-br ${colors[color] || colors.purple} p-4`}>
                <div className="flex items-center justify-between">
                    <Icon className="w-6 h-6 text-white/80" />
                    {badge && (
                        <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="mt-3 text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-white/70 mt-0.5">{label}</p>
            </div>
            {sub && (
                <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
                    {sub}
                </div>
            )}
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
        <div className="flex items-end gap-1 h-32 w-full">
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
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {hour}:00 · {count}
                        </div>

                        <div
                            className={`w-full rounded-t transition-all ${isHighlight
                                    ? 'bg-purple-500'
                                    : count > 0
                                        ? 'bg-purple-200 group-hover:bg-purple-400'
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
                Sin datos de preparación (se acumulan con el uso)
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
                            <td className="pt-2 pr-4">Promedio plataforma</td>
                            <td className="pt-2 pr-4 text-right tabular-nums">{formatMinutes(platformAvg)}</td>
                            <td />
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const [kpis, setKpis] = useState(null);
    const [ops, setOps] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [kpisRes, opsRes] = await Promise.all([
                fetch('/api/superadmin/analytics/kpis'),
                fetch('/api/analytics/operations'),
            ]);

            if (!kpisRes.ok || !opsRes.ok) {
                throw new Error('Error al cargar los datos');
            }

            const [kpisJson, opsJson] = await Promise.all([kpisRes.json(), opsRes.json()]);

            if (!kpisJson.success || !opsJson.success) {
                throw new Error(kpisJson.error || opsJson.error || 'Error desconocido');
            }

            setKpis(kpisJson.data);
            setOps(opsJson.data);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Cargando métricas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
                <p className="text-red-500 font-medium">{error}</p>
                <button
                    onClick={fetchAll}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                    <MdRefresh className="w-4 h-4" />
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Analytics de Plataforma</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {lastUpdated ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-AR')}` : ''}
                    </p>
                </div>
                <button
                    onClick={fetchAll}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-sm shadow-sm"
                >
                    <MdRefresh className="w-4 h-4" />
                    Actualizar
                </button>
            </div>

            {/* KPI Cards — Fila 1: Financieros */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Financiero
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        icon={MdTrendingUp}
                        color="purple"
                        label="GMV Total"
                        value={formatCurrency(kpis?.gmv)}
                        sub="Suma de pagos aprobados"
                    />
                    <KpiCard
                        icon={MdBarChart}
                        color="orange"
                        label="Comisión hipotética"
                        value={formatCurrency(kpis?.hypotheticalCommission)}
                        sub={`Escenario: ${COMMISSION_RATE_DISPLAY} del GMV`}
                        badge="Hipotético"
                    />
                    <KpiCard
                        icon={MdPayment}
                        color="green"
                        label="Tasa de pago exitoso"
                        value={formatPercent(kpis?.paymentSuccessRate)}
                        sub="Aprobados / (aprobados + rechazados)"
                    />
                    <KpiCard
                        icon={MdCancel}
                        color="red"
                        label="Tasa de cancelación"
                        value={formatPercent(kpis?.cancellationRate)}
                        sub="Canceladas / total de órdenes"
                    />
                </div>
            </section>

            {/* KPI Cards — Fila 2: Clientes */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Retención de Clientes
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <KpiCard
                        icon={MdPeopleAlt}
                        color="blue"
                        label="Clientes únicos (aprobados)"
                        value={kpis?.recurrence?.uniqueCustomers ?? '—'}
                        sub="Por número de teléfono"
                    />
                    <KpiCard
                        icon={MdPeopleAlt}
                        color="blue"
                        label="Tasa de recurrencia"
                        value={formatPercent(kpis?.recurrence?.recurrenceRate)}
                        sub={`${kpis?.recurrence?.recurringCustomers ?? 0} clientes con ≥2 pedidos`}
                    />
                    <KpiCard
                        icon={MdHub}
                        color="slate"
                        label="Retención por red"
                        value={kpis?.networkRetention?.customersInMultipleLocations ?? '—'}
                        sub="Clientes en más de 1 sede"
                    />
                </div>
            </section>

            {/* Gráfico de horas pico */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-gray-900">Órdenes por hora</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Horas pico de la plataforma (hora local Argentina)</p>
                    </div>
                    <MdAccessTime className="w-5 h-5 text-purple-400" />
                </div>
                <HourChart data={ops?.ordersByHour} />
            </section>

            {/* Tabla de tiempo de preparación */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-gray-900">Tiempo promedio de preparación</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Desde confirmación hasta pedido listo · por sede</p>
                    </div>
                    <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-1 rounded-full border border-amber-200">
                        Se acumula con el uso
                    </span>
                </div>
                <PrepTable
                    data={ops?.avgPreparation?.byLocation}
                    platformAvg={ops?.avgPreparation?.platformAvgMinutes}
                />
            </section>
        </div>
    );
}
