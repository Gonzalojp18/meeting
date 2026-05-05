'use client';

import { useState, useMemo } from 'react';
import axios from 'axios';
import { MdCheck, MdWarning, MdTrendingUp, MdTrendingDown } from 'react-icons/md';
import API_URI from '../../utils/getApiUri';

const LOCATION_LABELS = {
    location1: 'Sede 1',
    location2: 'Sede 2',
    location3: 'Sede 3 (solo visual)',
};

const BulkPriceUpdate = ({ data, menuType, locations, onRefetch }) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [percentage, setPercentage] = useState('');
    const [direction, setDirection] = useState('increase');
    const [selectedLocations, setSelectedLocations] = useState({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const categories = useMemo(() => {
        return (data?.categories || []).filter(cat => (cat.items || []).length > 0);
    }, [data]);

    const activeLocations = useMemo(() => {
        return (locations || []).filter(loc => loc.nameId !== 'location3');
    }, [locations]);

    const selectedCategory = useMemo(() => {
        return categories.find(c => c._id === selectedCategoryId);
    }, [categories, selectedCategoryId]);

    const preview = useMemo(() => {
        if (!selectedCategory || !percentage || percentage === '0') return null;

        const pct = parseFloat(percentage);
        if (isNaN(pct) || pct === 0 || pct < -100) return null;

        const multiplier = direction === 'increase'
            ? (1 + pct / 100)
            : (1 - pct / 100);

        const locsToApply = Object.entries(selectedLocations)
            .filter(([, v]) => v)
            .map(([k]) => k);

        return selectedCategory.items.map(item => {
            if (!item.prices) return null;

            const oldPrices = {};
            const newPrices = {};

            for (const [key, price] of Object.entries(item.prices)) {
                oldPrices[key] = price;

                if (key === 'location3' || (locsToApply.length > 0 && !locsToApply.includes(key))) {
                    newPrices[key] = price;
                } else if (typeof price === 'number') {
                    newPrices[key] = Math.max(0, Math.round(price * multiplier));
                } else {
                    newPrices[key] = price;
                }
            }

            return { name: item.name, oldPrices, newPrices };
        }).filter(Boolean);
    }, [selectedCategory, percentage, direction, selectedLocations]);

    const handleToggleLocation = (locId) => {
        setSelectedLocations(prev => ({
            ...prev,
            [locId]: !prev[locId],
        }));
    };

    const handleApply = async () => {
        if (!selectedCategoryId || !percentage) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setShowConfirm(false);

        try {
            const pct = direction === 'increase'
                ? parseFloat(percentage)
                : -parseFloat(percentage);

            const locsToApply = Object.entries(selectedLocations)
                .filter(([, v]) => v)
                .map(([k]) => k);

            const res = await axios.post(
                `${API_URI}/api/admin/menu/bulk-prices`,
                {
                    menuType,
                    categoryId: selectedCategoryId,
                    percentage: pct,
                    locationKeys: locsToApply.length > 0 ? locsToApply : undefined,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true,
                }
            );

            setResult(res.data);
            onRefetch?.();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar precios');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSelectedCategoryId('');
        setPercentage('');
        setDirection('increase');
        setSelectedLocations({});
        setResult(null);
        setError(null);
        setShowConfirm(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {direction === 'increase' ? <MdTrendingUp className="text-green-600" /> : <MdTrendingDown className="text-red-600" />}
                    Ajuste Masivo de Precios
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    Ajustá el precio de todos los productos de una categoría por porcentaje.
                    Menú activo: <span className="font-bold">{menuType === 'executive' ? 'B2B Ejecutivo' : 'Standard/Takeaway'}</span>
                </p>
            </div>

            {/* Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                {/* Categoría */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                    <select
                        value={selectedCategoryId}
                        onChange={(e) => { setSelectedCategoryId(e.target.value); setResult(null); setError(null); }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="">Seleccionar categoría...</option>
                        {categories.map(cat => (
                            <option key={cat._id} value={cat._id}>
                                {cat.name} ({cat.items.length} productos)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Dirección y Porcentaje */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDirection('increase')}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold border transition-all ${
                                    direction === 'increase'
                                        ? 'bg-green-100 text-green-700 border-green-300'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                ↑ Aumento
                            </button>
                            <button
                                onClick={() => setDirection('decrease')}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold border transition-all ${
                                    direction === 'decrease'
                                        ? 'bg-red-100 text-red-700 border-red-300'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                ↓ Descuento
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Porcentaje (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={percentage}
                            onChange={(e) => { setPercentage(e.target.value); setResult(null); setError(null); }}
                            placeholder="Ej: 5"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                </div>

                {/* Sedes */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sedes a actualizar</label>
                    <p className="text-xs text-gray-500 mb-2">Sin selección = todas las sedes. Location3 nunca se modifica.</p>
                    <div className="flex flex-wrap gap-2">
                        {activeLocations.map(loc => (
                            <button
                                key={loc.nameId}
                                onClick={() => handleToggleLocation(loc.nameId)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    selectedLocations[loc.nameId]
                                        ? 'bg-orange-100 text-orange-700 border-orange-300'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                {loc.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                {preview && preview.length > 0 && (
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Vista previa ({preview.length} productos)
                        </label>
                        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Producto</th>
                                        {activeLocations.map(loc => (
                                            <th key={loc.nameId} className="text-right px-3 py-2 font-semibold text-gray-600">
                                                {loc.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((p, idx) => (
                                        <tr key={idx} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                            <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                                            {activeLocations.map(loc => {
                                                const oldP = p.oldPrices?.[loc.nameId];
                                                const newP = p.newPrices?.[loc.nameId];
                                                const changed = typeof oldP === 'number' && oldP !== newP;
                                                return (
                                                    <td key={loc.nameId} className="text-right px-3 py-2">
                                                        {changed ? (
                                                            <span>
                                                                <span className="text-gray-400 line-through mr-1">${oldP?.toLocaleString()}</span>
                                                                <span className="text-green-600 font-bold">${newP?.toLocaleString()}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500">
                                                                {typeof oldP === 'number' ? `$${oldP.toLocaleString()}` : '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={!selectedCategoryId || !percentage || loading}
                        className="flex-1 bg-orange-500 text-white py-2.5 px-4 rounded-lg font-bold text-sm hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Aplicando...' : 'Aplicar Cambio'}
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Limpiar
                    </button>
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <MdWarning className="text-amber-500" size={24} />
                            <h4 className="text-lg font-bold text-gray-900">Confirmar Cambio de Precios</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Se aplicará un <span className="font-bold">{direction === 'increase' ? 'aumento' : 'descuento'} del {percentage}%</span>
                            {' '}a <span className="font-bold">{selectedCategory?.items?.length || 0} productos</span>
                            {' '}en la categoría <span className="font-bold">{selectedCategory?.name}</span>.
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                            Este cambio es inmediato y afecta el menú <span className="font-bold">{menuType === 'executive' ? 'B2B Ejecutivo' : 'Standard'}</span>.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleApply}
                                disabled={loading}
                                className="flex-1 bg-orange-500 text-white py-2.5 px-4 rounded-lg font-bold text-sm hover:bg-orange-600 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <MdCheck size={16} />
                                {loading ? 'Aplicando...' : 'Confirmar'}
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result */}
            {result && result.success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <MdCheck className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                        <p className="font-bold text-green-800">Precios actualizados correctamente</p>
                        <p className="text-sm text-green-700 mt-1">
                            {result.updated} productos en "{result.categoryName}" ajustados {result.percentage > 0 ? '+' : ''}{result.percentage}%.
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <MdWarning className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                    <p className="font-bold text-red-800">{error}</p>
                </div>
            )}
        </div>
    );
};

export default BulkPriceUpdate;
