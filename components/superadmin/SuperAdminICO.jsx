'use client';

import { useState, useEffect, useCallback } from 'react';
import { MdRefresh, MdInfo, MdWarning, MdCheckCircle, MdQueryStats } from 'react-icons/md';

// ─── Paleta de colores por estado ────────────────────────────────────────────
const STATUS_COLORS = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', bar: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500' },
};

// ─── Gauge circular SVG ───────────────────────────────────────────────────────
function ScoreGauge({ score, color = 'blue', size = 140 }) {
    const c = STATUS_COLORS[color] || STATUS_COLORS.blue;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 120 120" className="-rotate-90">
                {/* Track */}
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
                {/* Progress */}
                <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke={color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'amber' ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${progress} ${circumference}`}
                    style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
                />
            </svg>
            <div className="absolute text-center">
                <p className="text-2xl font-bold text-gray-900 leading-none">{score}</p>
                <p className="text-xs text-gray-400 mt-0.5">/100</p>
            </div>
        </div>
    );
}

// ─── Barra de dimensión ───────────────────────────────────────────────────────
function DimensionRow({ label, score, weight, detail, color }) {
    const c = STATUS_COLORS[score >= 76 ? 'emerald' : score >= 51 ? 'blue' : score >= 26 ? 'amber' : 'red'];
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-700 font-medium">{label}</span>
                    <span className="text-gray-400">({weight}%)</span>
                </div>
                <span className={`font-bold ${c.text}`}>{score}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                    className={`h-1.5 rounded-full ${c.bar} transition-all duration-700`}
                    style={{ width: `${score}%` }}
                />
            </div>
            {detail && <p className="text-xs text-gray-400">{detail}</p>}
        </div>
    );
}

// ─── Card de una sede ─────────────────────────────────────────────────────────
function LocationCard({ loc, isExpanded, onToggle }) {
    if (!loc.hasEnoughData) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MdQueryStats className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-gray-900">{loc.locationName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Generando diagnóstico — {loc.samplesCollected} / 30 órdenes registradas
                    </p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                        <div
                            className="h-1.5 bg-gray-300 rounded-full"
                            style={{ width: `${(loc.samplesCollected / 30) * 100}%` }}
                        />
                    </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                    Faltan {loc.samplesNeeded}
                </span>
            </div>
        );
    }

    const c = STATUS_COLORS[loc.statusColor] || STATUS_COLORS.gray;

    return (
        <div className={`bg-white border rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${c.border}`}>
            {/* Header clickeable */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 p-5 text-left"
            >
                <ScoreGauge score={loc.score} color={loc.statusColor} size={80} />
                <div className="flex-1">
                    <p className="font-bold text-gray-900 text-base">{loc.locationName}</p>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${c.badge}`}>
                        {loc.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{loc.sampleCount} órdenes analizadas</p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className={`text-3xl font-black ${c.text}`}>{loc.score}</p>
                    <p className="text-xs text-gray-400">ICO</p>
                </div>
            </button>

            {/* Desglose expandible */}
            {isExpanded && (
                <div className={`border-t ${c.border} px-5 py-4 space-y-3 ${c.bg}`}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Desglose por dimensión</p>
                    {Object.values(loc.dimensions).map(dim => (
                        <DimensionRow
                            key={dim.label}
                            label={dim.label}
                            score={dim.score}
                            weight={dim.weight}
                            detail={dim.detail}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SuperAdminICO() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [period, setPeriod] = useState('30');

    const fetchICO = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const days = parseInt(period);
            const to = new Date();
            const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const res = await fetch(
                `/api/superadmin/analytics/ico?from=${from.toISOString()}&to=${to.toISOString()}`
            );
            if (!res.ok) throw new Error('Error al obtener el ICO');
            const json = await res.json();
            setData(json.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchICO(); }, [fetchICO]);

    const platform = data?.platformICO;
    const pc = platform ? STATUS_COLORS[platform.statusColor] : null;

    return (
        <div className="space-y-6">

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Índice de Consistencia Operativa</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Diagnóstico estructural de la operación · No es un ranking · No es público
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="7">Últimos 7 días</option>
                        <option value="30">Últimos 30 días</option>
                        <option value="60">Últimos 60 días</option>
                        <option value="90">Últimos 90 días</option>
                    </select>
                    <button
                        onClick={fetchICO}
                        disabled={loading}
                        className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        <MdRefresh className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Metodología ───────────────────────────────────────────────── */}
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex gap-3">
                <MdInfo className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-700 space-y-1">
                    <p className="font-semibold">Cómo se calcula el ICO</p>
                    <p>Cumplimiento de tiempos (30%) · Consistencia σ (25%) · Control de cancelaciones (20%) · Actividad sostenida (15%) · Estabilidad horaria (10%)</p>
                    <p className="text-purple-500">Requiere mínimo 30 órdenes con timestamps para garantizar validez estadística.</p>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-gray-500 mt-3">Calculando ICO…</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                    <MdWarning className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {!loading && !error && data && (
                <>
                    {/* ── ICO Global de la plataforma ─────────────────────── */}
                    {platform ? (
                        <div className={`rounded-2xl p-6 border ${pc.border} ${pc.bg} flex flex-col sm:flex-row items-center gap-6`}>
                            <ScoreGauge score={platform.score} color={platform.statusColor} size={120} />
                            <div className="flex-1 text-center sm:text-left">
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">ICO Global · Plataforma</p>
                                <p className={`text-2xl font-black ${pc.text}`}>{platform.status}</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    {platform.locationsEvaluated} sede(s) evaluada(s)
                                    {platform.locationsPending > 0 && ` · ${platform.locationsPending} en período de rodaje`}
                                </p>
                            </div>
                            <div className="text-center sm:text-right flex-shrink-0">
                                <p className={`text-5xl font-black ${pc.text}`}>{platform.score}</p>
                                <p className="text-sm text-gray-400">/ 100</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center">
                            <MdQueryStats className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="font-semibold text-gray-600">ICO global no disponible aún</p>
                            <p className="text-sm text-gray-400 mt-1">Ninguna sede alcanzó el mínimo de 30 órdenes con timestamps.</p>
                        </div>
                    )}

                    {/* ── Sedes ────────────────────────────────────────────── */}
                    <div>
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                            ICO por Sede
                        </h2>
                        <div className="space-y-3">
                            {data.locations.map(loc => (
                                <LocationCard
                                    key={loc.locationId}
                                    loc={loc}
                                    isExpanded={expanded === loc.locationId}
                                    onToggle={() => setExpanded(
                                        expanded === loc.locationId ? null : loc.locationId
                                    )}
                                />
                            ))}
                            {data.locations.length === 0 && (
                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center">
                                    <p className="text-sm text-gray-500">No hay datos de órdenes en el período seleccionado.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Escala de referencia ─────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { range: '91 – 100', label: 'Alta consistencia operativa', color: 'emerald' },
                            { range: '76 – 90', label: 'Operación estable', color: 'blue' },
                            { range: '51 – 75', label: 'En consolidación', color: 'amber' },
                            { range: '0 – 50', label: 'Ajustes necesarios', color: 'red' },
                        ].map(({ range, label, color }) => {
                            const c = STATUS_COLORS[color];
                            return (
                                <div key={range} className={`rounded-xl p-3 border ${c.border} ${c.bg}`}>
                                    <p className={`text-sm font-black ${c.text}`}>{range}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
