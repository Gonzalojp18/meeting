'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    MdSearch,
    MdFilterList,
    MdAdd,
    MdEdit,
    MdDelete,
    MdVisibility,
    MdVisibilityOff,
    MdTrendingUp,
    MdReceipt,
    MdRestaurantMenu,
    MdClose,
    MdCheck,
    MdRefresh,
    MdWbSunny,
    MdNightlight,
    MdSchedule,
    MdSelectAll,
    MdDeselect
} from 'react-icons/md';

/**
 * UpsellingManager Component
 * 
 * Panel de administración para gestionar upsellings inteligentes.
 * Incluye filtros, toggle de activación, métricas de conversión, y control de ubicación.
 */
export default function UpsellingManager() {
    const [upsellings, setUpsellings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bulkLoading, setBulkLoading] = useState(null); // 'inMenu', 'inCheckout', 'isActive'

    // Filtros
    const [filters, setFilters] = useState({
        category: '',
        type: '',
        isActive: '',
        timing: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Modal de edición
    const [editModal, setEditModal] = useState({ open: false, upselling: null });

    // Categorías y tipos disponibles
    const categories = [
        { value: '', label: 'Todas las categorías' },
        { value: 'cafeteria', label: '☕ Cafetería' },
        { value: 'desayunos', label: '🥐 Desayunos' },
        { value: 'hamburguesas', label: '🍔 Hamburguesas' },
        { value: 'sandwiches', label: '🥪 Sandwiches' },
        { value: 'platos', label: '🍝 Platos' },
        { value: 'ensaladas', label: '🥗 Ensaladas' },
        { value: 'wraps', label: '🌯 Wraps' },
        { value: 'tartas', label: '🥧 Tartas' },
        { value: 'bigtoast', label: '🧇 BigToast' },
        { value: 'entradas', label: '🍟 Entradas' },
        { value: 'postres', label: '🍩 Postres' },
        { value: 'muffins', label: '🧁 Muffins' },
        { value: 'alfajores', label: '🍪 Alfajores' },
        { value: 'licuados', label: '🍹 Licuados' },
        { value: 'detox', label: '🌿 Detox' },
        { value: 'bebidas', label: '🍺 Bebidas' },
        { value: 'combos-especiales', label: '🎯 Combos Especiales' }
    ];

    const types = [
        { value: '', label: 'Todos los tipos' },
        { value: 'upsell', label: 'Upsell' },
        { value: 'cross-sell', label: 'Cross-sell' },
        { value: 'combo', label: 'Combo' },
        { value: 'upgrade', label: 'Upgrade' }
    ];

    const timings = [
        { value: '', label: 'Todos los horarios', icon: MdSchedule },
        { value: 'mañana', label: '🌅 Mañana (8:30-12h)', icon: MdWbSunny },
        { value: 'tarde', label: '🌇 Tarde (12-20:30h)', icon: MdNightlight },
        { value: 'todo-el-dia', label: '🕐 Todo el día', icon: MdSchedule }
    ];

    // Fetch upsellings
    const fetchUpsellings = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let url = '/api/upselling?';
            if (filters.category) url += `category=${filters.category}&`;
            if (filters.type) url += `type=${filters.type}&`;
            if (filters.isActive) url += `isActive=${filters.isActive}&`;
            if (filters.timing) url += `timing=${filters.timing}&`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                let filtered = data.data;

                // Filtro de búsqueda local
                if (filters.search) {
                    const search = filters.search.toLowerCase();
                    filtered = filtered.filter(u =>
                        u.name.toLowerCase().includes(search) ||
                        u.copyText.toLowerCase().includes(search) ||
                        u.triggerItemName?.toLowerCase().includes(search)
                    );
                }

                setUpsellings(filtered);
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error('Error fetching upsellings:', err);
            setError('Error al cargar upsellings');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchUpsellings();
    }, [fetchUpsellings]);

    // Toggle active status
    const toggleActive = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/upselling/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            });

            if (res.ok) {
                setUpsellings(prev =>
                    prev.map(u => u._id === id ? { ...u, isActive: !currentStatus } : u)
                );
            }
        } catch (err) {
            console.error('Error toggling upselling:', err);
        }
    };

    // Toggle display location
    const toggleDisplayLocation = async (id, location, currentValue) => {
        const upselling = upsellings.find(u => u._id === id);
        if (!upselling) return;

        const newLocations = {
            ...upselling.displayLocations,
            [location]: !currentValue
        };

        try {
            const res = await fetch(`/api/upselling/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayLocations: newLocations })
            });

            if (res.ok) {
                setUpsellings(prev =>
                    prev.map(u => u._id === id
                        ? { ...u, displayLocations: newLocations }
                        : u
                    )
                );
            }
        } catch (err) {
            console.error('Error updating display location:', err);
        }
    };

    // Update timing for a single upselling
    const updateTiming = async (id, newTiming) => {
        try {
            const res = await fetch(`/api/upselling/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timing: newTiming })
            });

            if (res.ok) {
                setUpsellings(prev =>
                    prev.map(u => u._id === id ? { ...u, timing: newTiming } : u)
                );
            }
        } catch (err) {
            console.error('Error updating timing:', err);
        }
    };

    // Bulk toggle display location for all visible upsellings
    const bulkToggleLocation = async (location, enable) => {
        const visibleIds = upsellings.map(u => u._id);
        if (visibleIds.length === 0) return;

        const action = enable ? 'activar' : 'desactivar';
        const locationNames = { inMenu: 'Menú', inCheckout: 'Checkout' };

        if (!confirm(`¿${enable ? 'Activar' : 'Desactivar'} "${locationNames[location]}" para los ${visibleIds.length} upsellings visibles?`)) {
            return;
        }

        setBulkLoading(location);

        try {
            const res = await fetch('/api/upselling/bulk', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: visibleIds,
                    action: 'toggleLocation',
                    location,
                    value: enable
                })
            });

            if (res.ok) {
                // Update local state
                setUpsellings(prev =>
                    prev.map(u => ({
                        ...u,
                        displayLocations: {
                            ...u.displayLocations,
                            [location]: enable
                        }
                    }))
                );
            }
        } catch (err) {
            console.error('Error bulk updating location:', err);
        } finally {
            setBulkLoading(null);
        }
    };

    // Bulk toggle active status for all visible upsellings
    const bulkToggleActive = async (enable) => {
        const visibleIds = upsellings.map(u => u._id);
        if (visibleIds.length === 0) return;

        if (!confirm(`¿${enable ? 'Activar' : 'Desactivar'} los ${visibleIds.length} upsellings visibles?`)) {
            return;
        }

        setBulkLoading('isActive');

        try {
            const res = await fetch('/api/upselling/bulk', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: visibleIds,
                    action: 'toggleActive',
                    value: enable
                })
            });

            if (res.ok) {
                setUpsellings(prev =>
                    prev.map(u => ({ ...u, isActive: enable }))
                );
            }
        } catch (err) {
            console.error('Error bulk updating active status:', err);
        } finally {
            setBulkLoading(null);
        }
    };

    // Delete upselling
    const deleteUpselling = async (id) => {
        if (!confirm('¿Eliminar esta promoción de upselling?')) return;

        try {
            const res = await fetch(`/api/upselling/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setUpsellings(prev => prev.filter(u => u._id !== id));
            }
        } catch (err) {
            console.error('Error deleting upselling:', err);
        }
    };

    // Stats
    const stats = {
        total: upsellings.length,
        active: upsellings.filter(u => u.isActive).length,
        inMenu: upsellings.filter(u => u.displayLocations?.inMenu).length,
        inCheckout: upsellings.filter(u => u.displayLocations?.inCheckout).length,
        avgConversion: upsellings.length > 0
            ? (upsellings.reduce((sum, u) => sum + parseFloat(u.conversionRate || 0), 0) / upsellings.length).toFixed(2)
            : 0
    };

    // Get type badge color
    const getTypeBadge = (type) => {
        const badges = {
            'upsell': 'bg-blue-100 text-blue-700 border-blue-200',
            'cross-sell': 'bg-purple-100 text-purple-700 border-purple-200',
            'combo': 'bg-orange-100 text-orange-700 border-orange-200',
            'upgrade': 'bg-green-100 text-green-700 border-green-200'
        };
        return badges[type] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    // Get ticket level badge
    const getTicketBadge = (level) => {
        const badges = {
            'bajo': 'bg-gray-100 text-gray-600',
            'medio': 'bg-yellow-100 text-yellow-700',
            'alto': 'bg-red-100 text-red-700'
        };
        return badges[level] || 'bg-gray-100 text-gray-600';
    };

    // Get timing badge
    const getTimingBadge = (timing) => {
        const badges = {
            'mañana': { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🌅' },
            'tarde': { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🌇' },
            'todo-el-dia': { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🕐' }
        };
        return badges[timing] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: '⏰' };
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 p-4">
                    <p className="text-xs font-semibold text-green-600 uppercase">Activas</p>
                    <p className="text-2xl font-bold text-green-700">{stats.active}</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <MdRestaurantMenu className="h-4 w-4 text-blue-500" />
                        <p className="text-xs font-semibold text-blue-600 uppercase">En Menú</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{stats.inMenu}</p>
                </div>
                <div className="bg-white rounded-xl border border-purple-200 p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <MdReceipt className="h-4 w-4 text-purple-500" />
                        <p className="text-xs font-semibold text-purple-600 uppercase">En Checkout</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{stats.inCheckout}</p>
                </div>
                <div className="bg-white rounded-xl border border-emerald-200 p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <MdTrendingUp className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-semibold text-emerald-600 uppercase">Conv. Prom.</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{stats.avgConversion}%</p>
                </div>
            </div>

            {/* Bulk Actions */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">Acciones masivas ({upsellings.length} visibles):</span>

                    {/* Bulk Active Toggle */}
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
                        <button
                            onClick={() => bulkToggleActive(true)}
                            disabled={bulkLoading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50"
                        >
                            <MdSelectAll className="h-4 w-4" />
                            Activar Todos
                        </button>
                        <button
                            onClick={() => bulkToggleActive(false)}
                            disabled={bulkLoading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                        >
                            <MdDeselect className="h-4 w-4" />
                            Desactivar Todos
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-300"></div>

                    {/* Bulk Menu Toggle */}
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-blue-200 p-1">
                        <MdRestaurantMenu className="h-4 w-4 text-blue-500 ml-2" />
                        <button
                            onClick={() => bulkToggleLocation('inMenu', true)}
                            disabled={bulkLoading}
                            className="px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        >
                            ✓ Menú
                        </button>
                        <button
                            onClick={() => bulkToggleLocation('inMenu', false)}
                            disabled={bulkLoading}
                            className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
                        >
                            ✗ Menú
                        </button>
                    </div>

                    {/* Bulk Checkout Toggle */}
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-purple-200 p-1">
                        <MdReceipt className="h-4 w-4 text-purple-500 ml-2" />
                        <button
                            onClick={() => bulkToggleLocation('inCheckout', true)}
                            disabled={bulkLoading}
                            className="px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
                        >
                            ✓ Checkout
                        </button>
                        <button
                            onClick={() => bulkToggleLocation('inCheckout', false)}
                            disabled={bulkLoading}
                            className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
                        >
                            ✗ Checkout
                        </button>
                    </div>



                    {bulkLoading && (
                        <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                    )}
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, copy o producto..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Toggle Filters */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${showFilters
                            ? 'bg-orange-50 border-orange-300 text-orange-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <MdFilterList className="h-5 w-5" />
                        Filtros
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={fetchUpsellings}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        <MdRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        >
                            {types.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.timing}
                            onChange={(e) => setFilters(prev => ({ ...prev, timing: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        >
                            {timings.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.isActive}
                            onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">Todos los estados</option>
                            <option value="true">Solo activas</option>
                            <option value="false">Solo inactivas</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500"></div>
                </div>
            )}

            {/* Upsellings Table */}
            {!loading && upsellings.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Estado</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Horario</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Copy</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tipo</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        <MdRestaurantMenu className="inline h-4 w-4" title="En Menú" />
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        <MdReceipt className="inline h-4 w-4" title="En Checkout" />
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Conv.</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {upsellings.map(upselling => {
                                    const timingBadge = getTimingBadge(upselling.timing);
                                    return (
                                        <tr key={upselling._id} className={`hover:bg-gray-50 transition-colors ${!upselling.isActive ? 'opacity-50' : ''}`}>
                                            {/* Toggle Active */}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => toggleActive(upselling._id, upselling.isActive)}
                                                    className={`p-2 rounded-lg transition-colors ${upselling.isActive
                                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                        }`}
                                                    title={upselling.isActive ? 'Desactivar' : 'Activar'}
                                                >
                                                    {upselling.isActive ? <MdVisibility className="h-5 w-5" /> : <MdVisibilityOff className="h-5 w-5" />}
                                                </button>
                                            </td>

                                            {/* Name */}
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{upselling.name}</p>
                                                    {upselling.triggerItemName && (
                                                        <p className="text-xs text-gray-500">Trigger: {upselling.triggerItemName}</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Timing */}
                                            <td className="px-4 py-3">
                                                <select
                                                    value={upselling.timing || 'todo-el-dia'}
                                                    onChange={(e) => updateTiming(upselling._id, e.target.value)}
                                                    className={`px-2 py-1 text-xs font-medium rounded-lg border cursor-pointer ${timingBadge.bg} ${timingBadge.text} border-transparent hover:border-gray-300 focus:ring-2 focus:ring-orange-500`}
                                                >
                                                    <option value="mañana">🌅 Mañana</option>
                                                    <option value="tarde">🌇 Tarde</option>
                                                    <option value="todo-el-dia">🕐 Todo el día</option>
                                                </select>
                                            </td>

                                            {/* Copy */}
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-700 max-w-[200px] truncate">{upselling.copyText}</p>
                                            </td>

                                            {/* Type */}
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTypeBadge(upselling.type)}`}>
                                                    {upselling.type}
                                                </span>
                                            </td>

                                            {/* Display Locations */}
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => toggleDisplayLocation(upselling._id, 'inMenu', upselling.displayLocations?.inMenu)}
                                                    className={`p-1.5 rounded-lg transition-colors ${upselling.displayLocations?.inMenu
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'bg-gray-100 text-gray-400'
                                                        }`}
                                                    title="Toggle en Menú"
                                                >
                                                    <MdCheck className="h-4 w-4" />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => toggleDisplayLocation(upselling._id, 'inCheckout', upselling.displayLocations?.inCheckout)}
                                                    className={`p-1.5 rounded-lg transition-colors ${upselling.displayLocations?.inCheckout
                                                        ? 'bg-purple-100 text-purple-600'
                                                        : 'bg-gray-100 text-gray-400'
                                                        }`}
                                                    title="Toggle en Checkout"
                                                >
                                                    <MdCheck className="h-4 w-4" />
                                                </button>
                                            </td>

                                            {/* Conversion Rate */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <MdTrendingUp className={`h-4 w-4 ${parseFloat(upselling.conversionRate) > 5 ? 'text-green-500' : 'text-gray-400'}`} />
                                                    <span className="text-sm font-medium text-gray-700">{upselling.conversionRate}%</span>
                                                </div>
                                                <p className="text-xs text-gray-400">{upselling.metrics?.clicks?.total || 0} clicks</p>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => deleteUpselling(upselling._id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <MdDelete className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && upsellings.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <MdTrendingUp className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron upsellings</h3>
                    <p className="text-sm text-gray-500">
                        {filters.search || filters.category || filters.type || filters.isActive || filters.timing
                            ? 'Intenta con otros filtros'
                            : 'Ejecuta el seed para cargar las combinaciones'
                        }
                    </p>
                </div>
            )}
        </div>
    );
}
