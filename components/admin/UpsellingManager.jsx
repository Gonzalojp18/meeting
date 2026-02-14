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
    MdDeselect,
    MdMoreVert
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(null);

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
        console.log('[toggleDisplayLocation] Called:', { id, location, currentValue });
        const upselling = upsellings.find(u => u._id === id);
        if (!upselling) {
            console.log('[toggleDisplayLocation] Upselling not found');
            return;
        }

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

            console.log('[toggleDisplayLocation] Response status:', res.status);

            if (res.ok) {
                setUpsellings(prev =>
                    prev.map(u => u._id === id
                        ? { ...u, displayLocations: newLocations }
                        : u
                    )
                );
                console.log('[toggleDisplayLocation] Updated successfully');
            } else {
                const data = await res.json();
                console.error('[toggleDisplayLocation] Error:', data);
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
        console.log('[bulkToggleLocation] Called:', { location, enable, count: visibleIds.length });
        if (visibleIds.length === 0) return;

        const locationNames = { inMenu: 'Menú', inCheckout: 'Checkout' };

        if (!confirm(`¿${enable ? 'Activar' : 'Desactivar'} "${locationNames[location]}" para los ${visibleIds.length} upsellings visibles?`)) {
            return;
        }

        setBulkLoading(location);

        try {
            console.log('[bulkToggleLocation] Sending request...');
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

            console.log('[bulkToggleLocation] Response status:', res.status);
            const data = await res.json();
            console.log('[bulkToggleLocation] Response data:', data);

            if (res.ok && data.success) {
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
                console.log('[bulkToggleLocation] Updated successfully');
            } else {
                console.error('[bulkToggleLocation] Error:', data.error);
                alert('Error: ' + (data.error || 'No se pudo actualizar'));
            }
        } catch (err) {
            console.error('Error bulk updating location:', err);
            alert('Error de conexión');
        } finally {
            setBulkLoading(null);
        }
    };

    // Bulk toggle active status for all visible upsellings
    const bulkToggleActive = async (enable) => {
        const visibleIds = upsellings.map(u => u._id);
        console.log('[bulkToggleActive] Called with', visibleIds.length, 'upsellings, enable:', enable);
        if (visibleIds.length === 0) return;

        if (!confirm(`¿${enable ? 'Activar' : 'Desactivar'} los ${visibleIds.length} upsellings visibles?`)) {
            return;
        }

        setBulkLoading('isActive');

        try {
            console.log('[bulkToggleActive] Sending request...');
            const res = await fetch('/api/upselling/bulk', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: visibleIds,
                    action: 'toggleActive',
                    value: enable
                })
            });

            console.log('[bulkToggleActive] Response status:', res.status);
            const data = await res.json();
            console.log('[bulkToggleActive] Response data:', data);

            if (res.ok && data.success) {
                setUpsellings(prev =>
                    prev.map(u => ({ ...u, isActive: enable }))
                );
                console.log('[bulkToggleActive] Updated successfully');
            } else {
                console.error('[bulkToggleActive] Error:', data.error);
                alert('Error: ' + (data.error || 'No se pudo actualizar'));
            }
        } catch (err) {
            console.error('Error bulk updating active status:', err);
            alert('Error de conexión');
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
        <div className="space-y-4">
            {/* Stats Cards - MÁS COMPACTOS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total</p>
                    <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg border border-green-200 p-3">
                    <p className="text-xs font-semibold text-green-600 uppercase mb-1">Activas</p>
                    <p className="text-xl font-bold text-green-700">{stats.active}</p>
                </div>
                <div className="bg-white rounded-lg border border-blue-200 p-3">
                    <div className="flex items-center gap-1 mb-1">
                        <MdRestaurantMenu className="h-3 w-3 text-blue-500" />
                        <p className="text-xs font-semibold text-blue-600 uppercase">Menú</p>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{stats.inMenu}</p>
                </div>
                <div className="bg-white rounded-lg border border-purple-200 p-3">
                    <div className="flex items-center gap-1 mb-1">
                        <MdReceipt className="h-3 w-3 text-purple-500" />
                        <p className="text-xs font-semibold text-purple-600 uppercase">Checkout</p>
                    </div>
                    <p className="text-xl font-bold text-purple-700">{stats.inCheckout}</p>
                </div>
                <div className="bg-white rounded-lg border border-emerald-200 p-3">
                    <div className="flex items-center gap-1 mb-1">
                        <MdTrendingUp className="h-3 w-3 text-emerald-500" />
                        <p className="text-xs font-semibold text-emerald-600 uppercase">Conv. Prom.</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">{stats.avgConversion}%</p>
                </div>
            </div>

            {/* Bulk Actions - 1 LÍNEA COMPACTA */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Masivas ({upsellings.length}):</span>

                    {/* Active/Inactive */}
                    <button
                        onClick={() => bulkToggleActive(true)}
                        disabled={bulkLoading}
                        className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors disabled:opacity-50"
                    >
                        ✓ Activar
                    </button>
                    <button
                        onClick={() => bulkToggleActive(false)}
                        disabled={bulkLoading}
                        className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors disabled:opacity-50"
                    >
                        ✗ Desactivar
                    </button>

                    <div className="h-4 w-px bg-gray-300"></div>

                    {/* Menu */}
                    <button
                        onClick={() => bulkToggleLocation('inMenu', true)}
                        disabled={bulkLoading}
                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors disabled:opacity-50"
                    >
                        🍽️ Menú
                    </button>
                    <button
                        onClick={() => bulkToggleLocation('inMenu', false)}
                        disabled={bulkLoading}
                        className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors disabled:opacity-50"
                    >
                        ✗ Menú
                    </button>

                    <div className="h-4 w-px bg-gray-300"></div>

                    {/* Checkout */}
                    <button
                        onClick={() => bulkToggleLocation('inCheckout', true)}
                        disabled={bulkLoading}
                        className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors disabled:opacity-50"
                    >
                        🧾 Checkout
                    </button>
                    <button
                        onClick={() => bulkToggleLocation('inCheckout', false)}
                        disabled={bulkLoading}
                        className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors disabled:opacity-50"
                    >
                        ✗ Checkout
                    </button>

                    {bulkLoading && (
                        <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full ml-2"></div>
                    )}
                </div>
            </div>

            {/* Search & Filters - INLINE HORIZONTAL */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Toggle Filters */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters
                            ? 'bg-orange-50 border-orange-300 text-orange-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <MdFilterList className="h-4 w-4" />
                        <span className="hidden sm:inline">Filtros</span>
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={fetchUpsellings}
                        className="flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
                    >
                        <MdRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        >
                            {types.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.timing}
                            onChange={(e) => setFilters(prev => ({ ...prev, timing: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        >
                            {timings.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.isActive}
                            onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-500"></div>
                </div>
            )}

            {/* DESKTOP: Tabla optimizada (6 columnas vs 10) */}
            {!loading && upsellings.length > 0 && (
                <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                                        Estado / Nombre
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                                        Horario
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                                        Tipo
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase">
                                        Ubicación
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase">
                                        Conv.
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase w-16">

                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {upsellings.map(upselling => {
                                    const timingBadge = getTimingBadge(upselling.timing);
                                    return (
                                        <tr key={upselling._id} className={`hover:bg-gray-50 transition-colors ${!upselling.isActive ? 'opacity-50' : ''}`}>
                                            {/* Estado + Nombre */}
                                            <td className="px-3 py-3">
                                                <div className="flex items-start gap-2">
                                                    <button
                                                        onClick={() => toggleActive(upselling._id, upselling.isActive)}
                                                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${upselling.isActive
                                                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                            }`}
                                                        title={upselling.isActive ? 'Desactivar' : 'Activar'}
                                                    >
                                                        {upselling.isActive ? <MdVisibility className="h-4 w-4" /> : <MdVisibilityOff className="h-4 w-4" />}
                                                    </button>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 text-sm truncate">{upselling.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{upselling.copyText}</p>
                                                        {upselling.triggerItemName && (
                                                            <p className="text-xs text-gray-400 mt-0.5">→ {upselling.triggerItemName}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Horario */}
                                            <td className="px-3 py-3">
                                                <select
                                                    value={upselling.timing || 'todo-el-dia'}
                                                    onChange={(e) => updateTiming(upselling._id, e.target.value)}
                                                    className={`px-2 py-1 text-xs font-medium rounded border cursor-pointer ${timingBadge.bg} ${timingBadge.text} border-transparent hover:border-gray-300 focus:ring-1 focus:ring-orange-500`}
                                                >
                                                    <option value="mañana">🌅 Mañana</option>
                                                    <option value="tarde">🌇 Tarde</option>
                                                    <option value="todo-el-dia">🕐 Todo el día</option>
                                                </select>
                                            </td>

                                            {/* Tipo */}
                                            <td className="px-3 py-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTypeBadge(upselling.type)}`}>
                                                    {upselling.type}
                                                </span>
                                            </td>

                                            {/* Ubicación (Menú + Checkout inline) */}
                                            <td className="px-3 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => toggleDisplayLocation(upselling._id, 'inMenu', upselling.displayLocations?.inMenu)}
                                                        className={`p-1 rounded transition-colors ${upselling.displayLocations?.inMenu
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : 'bg-gray-100 text-gray-400'
                                                            }`}
                                                        title="Toggle en Menú"
                                                    >
                                                        <MdRestaurantMenu className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleDisplayLocation(upselling._id, 'inCheckout', upselling.displayLocations?.inCheckout)}
                                                        className={`p-1 rounded transition-colors ${upselling.displayLocations?.inCheckout
                                                            ? 'bg-purple-100 text-purple-600'
                                                            : 'bg-gray-100 text-gray-400'
                                                            }`}
                                                        title="Toggle en Checkout"
                                                    >
                                                        <MdReceipt className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Conversión */}
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1">
                                                        <MdTrendingUp className={`h-3 w-3 ${parseFloat(upselling.conversionRate) > 5 ? 'text-green-500' : 'text-gray-400'}`} />
                                                        <span className="text-sm font-medium text-gray-700">{upselling.conversionRate}%</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">{upselling.metrics?.clicks?.total || 0}c</span>
                                                </div>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    onClick={() => deleteUpselling(upselling._id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <MdDelete className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MOBILE: Cards (0 horizontal scroll) */}
            {!loading && upsellings.length > 0 && (
                <div className="md:hidden space-y-3">
                    {upsellings.map(upselling => {
                        const timingBadge = getTimingBadge(upselling.timing);
                        return (
                            <div
                                key={upselling._id}
                                className={`bg-white rounded-lg border border-gray-200 p-3 ${!upselling.isActive ? 'opacity-50' : ''}`}
                            >
                                {/* Header: Toggle + Nombre */}
                                <div className="flex items-start gap-2 mb-2">
                                    <button
                                        onClick={() => toggleActive(upselling._id, upselling.isActive)}
                                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${upselling.isActive
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-gray-100 text-gray-400'
                                            }`}
                                    >
                                        {upselling.isActive ? <MdVisibility className="h-5 w-5" /> : <MdVisibilityOff className="h-5 w-5" />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 text-sm truncate">{upselling.name}</h4>
                                        <p className="text-xs text-gray-600 line-clamp-2">{upselling.copyText}</p>
                                        {upselling.triggerItemName && (
                                            <p className="text-xs text-gray-400 mt-1">→ {upselling.triggerItemName}</p>
                                        )}
                                    </div>

                                    {/* 3-dot menu */}
                                    <div className="relative flex-shrink-0">
                                        <button
                                            onClick={() => setMobileMenuOpen(mobileMenuOpen === upselling._id ? null : upselling._id)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <MdMoreVert className="h-5 w-5 text-gray-400" />
                                        </button>

                                        {mobileMenuOpen === upselling._id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setMobileMenuOpen(null)}
                                                />
                                                <div className="absolute right-0 top-10 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                                    <button
                                                        onClick={() => {
                                                            deleteUpselling(upselling._id)
                                                            setMobileMenuOpen(null)
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        <MdDelete className="h-4 w-4" />
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Meta info inline */}
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {/* Timing */}
                                    <select
                                        value={upselling.timing || 'todo-el-dia'}
                                        onChange={(e) => updateTiming(upselling._id, e.target.value)}
                                        className={`px-2 py-1 text-xs font-medium rounded border ${timingBadge.bg} ${timingBadge.text}`}
                                    >
                                        <option value="mañana">🌅 Mañana</option>
                                        <option value="tarde">🌇 Tarde</option>
                                        <option value="todo-el-dia">🕐 Todo el día</option>
                                    </select>

                                    {/* Tipo */}
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTypeBadge(upselling.type)}`}>
                                        {upselling.type}
                                    </span>

                                    {/* Ubicaciones */}
                                    <button
                                        onClick={() => toggleDisplayLocation(upselling._id, 'inMenu', upselling.displayLocations?.inMenu)}
                                        className={`p-1 rounded ${upselling.displayLocations?.inMenu ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                                    >
                                        <MdRestaurantMenu className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => toggleDisplayLocation(upselling._id, 'inCheckout', upselling.displayLocations?.inCheckout)}
                                        className={`p-1 rounded ${upselling.displayLocations?.inCheckout ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}
                                    >
                                        <MdReceipt className="h-4 w-4" />
                                    </button>

                                    {/* Conv */}
                                    <div className="flex items-center gap-1 ml-auto">
                                        <MdTrendingUp className={`h-3 w-3 ${parseFloat(upselling.conversionRate) > 5 ? 'text-green-500' : 'text-gray-400'}`} />
                                        <span className="text-xs font-medium text-gray-700">{upselling.conversionRate}%</span>
                                        <span className="text-xs text-gray-400">({upselling.metrics?.clicks?.total || 0}c)</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Empty State */}
            {!loading && upsellings.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <MdTrendingUp className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-base font-semibold text-gray-900 mb-2">No se encontraron upsellings</h3>
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