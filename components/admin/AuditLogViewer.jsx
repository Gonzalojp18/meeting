'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import API_URI from '@/utils/getApiUri';
import {
    MdRefresh,
    MdPerson,
    MdEdit,
    MdDelete,
    MdAdd,
    MdLogin,
    MdSwapHoriz,
    MdHistory,
    MdSearch,
    MdCalendarToday,
} from 'react-icons/md';

// Configuración de acciones con colores más suaves
const ACTION_CONFIG = {
    CREATE: {
        label: 'Creó',
        icon: MdAdd,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200'
    },
    UPDATE: {
        label: 'Actualizó',
        icon: MdEdit,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200'
    },
    DELETE: {
        label: 'Eliminó',
        icon: MdDelete,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200'
    },
    LOGIN: {
        label: 'Inició sesión',
        icon: MdLogin,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200'
    },
    STATUS_CHANGE: {
        label: 'Cambió estado de',
        icon: MdSwapHoriz,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200'
    }
};

// Configuración de entidades
const ENTITY_NAMES = {
    user: 'usuario',
    menu: 'menú',
    dish: 'plato',
    category: 'categoría',
    order: 'pedido',
    settings: 'configuración',
    printer: 'impresora',
    session: 'sesión'
};

const AuditLogViewer = () => {
    const { data: session, status } = useSession();
    const isAdmin = session?.user?.role === 'admin';

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0
    });

    // Filtros simplificados
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('today'); // today, week, month, all

    const fetchLogs = useCallback(async (page = 1) => {
        if (!isAdmin) return;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({ page, limit: 20 });

            // Aplicar filtro de fecha
            const today = new Date();
            if (dateFilter === 'today') {
                const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
                params.append('startDate', startOfDay);
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
                params.append('startDate', weekAgo);
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
                params.append('startDate', monthAgo);
            }

            const response = await axios.get(
                `${API_URI}/api/admin/audit-logs?${params.toString()}`,
                { withCredentials: true }
            );

            setLogs(response.data.logs || []);
            setPagination(response.data.pagination || {
                currentPage: 1,
                totalPages: 1,
                totalCount: 0
            });
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Error al cargar los registros');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, dateFilter]);

    useEffect(() => {
        if (status === 'authenticated' && isAdmin) {
            fetchLogs(1);
        }
    }, [status, isAdmin, dateFilter, fetchLogs]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays} días`;

        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleBadge = (role) => {
        const badges = {
            admin: { label: 'Admin', class: 'bg-purple-100 text-purple-700' },
            manager: { label: 'Manager', class: 'bg-blue-100 text-blue-700' },
            staff: { label: 'Staff', class: 'bg-gray-100 text-gray-700' }
        };
        return badges[role] || badges.staff;
    };

    // Filtrar logs por búsqueda
    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            log.performedBy?.userName?.toLowerCase().includes(search) ||
            log.details?.toLowerCase().includes(search) ||
            log.entityName?.toLowerCase().includes(search)
        );
    });

    if (status === 'loading' || (loading && logs.length === 0)) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-3 text-gray-500">Cargando actividad...</span>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="text-center py-12">
                <MdHistory className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">Solo administradores pueden ver el registro de actividad</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header compacto */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Actividad Reciente</h3>
                    <p className="text-sm text-gray-500">{pagination.totalCount} registros</p>
                </div>

                <button
                    onClick={() => fetchLogs(pagination.currentPage)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Barra de búsqueda y filtros simplificados */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Búsqueda */}
                <div className="flex-1 relative">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por usuario o acción..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                {/* Filtro de periodo */}
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    {[
                        { value: 'today', label: 'Hoy' },
                        { value: 'week', label: '7 días' },
                        { value: 'month', label: '30 días' },
                        { value: 'all', label: 'Todo' }
                    ].map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => setDateFilter(filter.value)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${dateFilter === filter.value
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Timeline de actividad */}
            <div className="space-y-3">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <MdHistory className="mx-auto h-16 w-16 mb-3 opacity-50" />
                        <p className="font-medium">No hay actividad registrada</p>
                        <p className="text-sm mt-1">Las acciones aparecerán aquí cuando se realicen cambios</p>
                    </div>
                ) : (
                    filteredLogs.map((log, index) => {
                        const actionConfig = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
                        const ActionIcon = actionConfig.icon;
                        const roleBadge = getRoleBadge(log.performedBy?.userRole);
                        const entityName = ENTITY_NAMES[log.entity] || log.entity;

                        return (
                            <div
                                key={log._id}
                                className={`relative pl-8 pb-6 ${index === filteredLogs.length - 1 ? '' : 'border-l-2 border-gray-200'}`}
                            >
                                {/* Icono de acción en el timeline */}
                                <div className={`absolute left-0 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center ${actionConfig.bg} ${actionConfig.border} border-2`}>
                                    <ActionIcon className={actionConfig.color} size={16} />
                                </div>

                                {/* Contenido */}
                                <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-semibold text-gray-900">
                                                    {log.performedBy?.userName || 'Usuario'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge.class}`}>
                                                    {roleBadge.label}
                                                </span>
                                                <span className={`text-sm font-medium ${actionConfig.color}`}>
                                                    {actionConfig.label}
                                                </span>
                                                {log.entityName && (
                                                    <span className="text-sm text-gray-600">
                                                        {entityName} <span className="font-medium">"{log.entityName}"</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {log.details}
                                            </p>
                                        </div>
                                        <div className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatDate(log.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-gray-500">
                        Página {pagination.currentPage} de {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchLogs(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrevPage || loading}
                            className="px-4 py-2 border rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => fetchLogs(pagination.currentPage + 1)}
                            disabled={!pagination.hasNextPage || loading}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogViewer;
