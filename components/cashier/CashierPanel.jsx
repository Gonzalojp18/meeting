'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useFetch } from '../../hooks/useFetch';
import API_URI from '../../utils/getApiUri';
import axios from 'axios';
import {
    MdLogout,
    MdRefresh,
    MdAccessTime,
    MdCheckCircle,
    MdLocalShipping,
    MdRestaurant,
    MdCancel,
    MdExpandMore,
    MdExpandLess,
    MdTimer,
    MdPrint
} from 'react-icons/md';

const ORDER_STATUSES = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: MdAccessTime },
    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: MdCheckCircle },
    preparing: { label: 'Preparando', color: 'bg-orange-100 text-orange-800', icon: MdRestaurant },
    ready: { label: 'Listo', color: 'bg-green-100 text-green-800', icon: MdCheckCircle },
    completed: { label: 'Completado', color: 'bg-gray-100 text-gray-800', icon: MdCheckCircle },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: MdCancel }
};

// Colores diferenciados por sede
const LOCATION_COLORS = [
    { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', shadow: 'shadow-blue-200', accent: '#3b82f6' },
    { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700', shadow: 'shadow-purple-200', accent: '#a855f7' },
    { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-700', shadow: 'shadow-teal-200', accent: '#14b8a6' },
    { bg: 'bg-pink-50', border: 'border-pink-400', text: 'text-pink-700', shadow: 'shadow-pink-200', accent: '#ec4899' },
    { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', shadow: 'shadow-amber-200', accent: '#f59e0b' },
    { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-700', shadow: 'shadow-indigo-200', accent: '#6366f1' }
];

const CashierPanel = ({ standalone = true }) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const token = session?.user?.token;
    const userLocations = session?.user?.assignedLocations || [];
    const isAdmin = session?.user?.role === 'admin';

    // Obtener las ubicaciones disponibles
    const { data: menuData } = useFetch(`${API_URI}/api/menu`, token);

    // Determinar ubicaciones accesibles (usar nameId como identificador)
    const accessibleLocations = isAdmin
        ? menuData?.locations || []
        : menuData?.locations?.filter(loc => userLocations.includes(loc.nameId)) || [];

    // Auto-seleccionar primera ubicación
    useEffect(() => {
        if (!selectedLocation && accessibleLocations.length > 0) {
            setSelectedLocation(accessibleLocations[0].nameId);
        }
    }, [accessibleLocations, selectedLocation]);

    // Fetch de órdenes
    const {
        data: orders,
        loading: ordersLoading,
        error: ordersError,
        refetch: refetchOrders
    } = useFetch(
        selectedLocation ? `${API_URI}/api/orders?locationId=${selectedLocation}` : null,
        token
    );

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    const handleLogout = () => {
        signOut({ callbackUrl: '/login' });
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await axios.patch(
                `${API_URI}/api/orders/${orderId}`,
                { status: newStatus },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                }
            );
            refetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Error al actualizar el pedido');
        }
    };

    const handlePrintTicket = async (orderId) => {
        try {
            await axios.get(
                `${API_URI}/api/admin/printers?action=reprint&orderId=${orderId}&type=cashier`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                }
            );
            // No alert to keep it smooth, or a subtle message if needed
        } catch (error) {
            console.error('Error printing ticket:', error);
            alert('Error al imprimir el ticket');
        }
    };

    const getNextStatus = (currentStatus) => {
        const flow = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
        const currentIndex = flow.indexOf(currentStatus);
        if (currentIndex < flow.length - 1) {
            return flow[currentIndex + 1];
        }
        return null;
    };

    const filteredOrders = orders?.filter(order => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'active') return !['completed', 'cancelled'].includes(order.status);
        return order.status === filterStatus;
    }) || [];

    // Obtener el color de la sede actual
    const locationIndex = accessibleLocations.findIndex(l => l.nameId === selectedLocation);
    const locationColor = LOCATION_COLORS[locationIndex % LOCATION_COLORS.length] || LOCATION_COLORS[0];

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    };

    if (status === 'loading') {
        return (
            <div className={`${standalone ? 'min-h-screen' : 'py-20'} flex items-center justify-center bg-gray-100`}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className={`${standalone ? 'min-h-screen' : ''} bg-gray-100`}>
            {/* Header */}
            {standalone && (
                <header className="bg-gray-800 text-white p-4 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold">
                                {session?.user?.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">Panel de Caja</h1>
                                <p className="text-gray-400 text-sm">{session?.user?.name} - {session?.user?.role}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Selector de ubicación con indicador de color */}
                            {accessibleLocations.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full ring-2 ring-white"
                                        style={{ backgroundColor: locationColor.accent }}
                                    />
                                    <select
                                        value={selectedLocation || ''}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:ring-2 focus:ring-orange-500"
                                        style={{ borderColor: locationColor.accent }}
                                    >
                                        {accessibleLocations.map((loc, idx) => (
                                            <option key={loc.nameId} value={loc.nameId}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                onClick={refetchOrders}
                                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                                title="Actualizar"
                            >
                                <MdRefresh size={24} />
                            </button>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <MdLogout size={20} />
                                Salir
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* Filtros */}
            <div className={`bg-white shadow-sm border-b ${standalone ? 'sticky top-[72px] z-40' : ''}`}>
                <div className="max-w-7xl mx-auto px-4 py-3 lg:py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:inline-block">Filtrar:</span>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide flex-1 min-w-0">
                                {[
                                    { key: 'all', label: 'Todos' },
                                    { key: 'active', label: 'Activos' },
                                    { key: 'pending', label: 'Pendientes' },
                                    { key: 'confirmed', label: 'Confirmados' },
                                    { key: 'preparing', label: 'Preparando' },
                                    { key: 'ready', label: 'Listos' },
                                    { key: 'completed', label: 'Completados' }
                                ].map(filter => (
                                    <button
                                        key={filter.key}
                                        onClick={() => setFilterStatus(filter.key)}
                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 border ${filterStatus === filter.key
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-md transform scale-105'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50'
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Controles adicionales (Location + Refresh) para modo Admin/Embedded */}
                        <div className="flex items-center gap-2 sm:gap-3 self-end lg:self-auto sm:justify-end">
                            {!standalone && accessibleLocations.length > 0 && (
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex-1 sm:flex-none">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter hidden md:inline">Sede:</span>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                                            style={{ backgroundColor: locationColor.accent }}
                                        />
                                        <select
                                            value={selectedLocation || ''}
                                            onChange={(e) => setSelectedLocation(e.target.value)}
                                            className="bg-transparent text-gray-700 text-xs font-bold focus:outline-none cursor-pointer pr-1 w-full sm:w-auto"
                                        >
                                            {accessibleLocations.map((loc) => (
                                                <option key={loc.nameId} value={loc.nameId}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {!standalone && (
                                <button
                                    onClick={refetchOrders}
                                    className="p-2 bg-gray-50 text-gray-600 rounded-xl border border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm group flex-shrink-0"
                                    title="Actualizar pedidos"
                                >
                                    <MdRefresh className={`${ordersLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido principal con borde superior de color de sede */}
            <main className="max-w-7xl mx-auto p-4">
                {/* Indicador de color de sede */}
                {selectedLocation && (
                    <div
                        className="h-1 rounded-full mb-4"
                        style={{ backgroundColor: locationColor.accent }}
                    />
                )}
                {/* Info de sede seleccionada con color diferenciado */}
                {selectedLocation && (
                    <div
                        className={`mb-4 p-4 ${locationColor.bg} border-2 ${locationColor.border} rounded-xl shadow-lg ${locationColor.shadow}`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: locationColor.accent }}
                            />
                            <div>
                                <p className={`${locationColor.text} font-bold text-lg`}>
                                    {accessibleLocations.find(l => l.nameId === selectedLocation)?.name || selectedLocation}
                                </p>
                                <p className={`${locationColor.text} text-sm opacity-75`}>
                                    {filteredOrders.length} pedido(s) {filterStatus !== 'all' ? `(${filterStatus})` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {ordersLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Cargando pedidos...</p>
                    </div>
                ) : ordersError ? (
                    <div className="text-center py-12 text-red-500">
                        Error al cargar los pedidos. Intenta de nuevo.
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <MdRestaurant className="mx-auto text-gray-300" size={64} />
                        <p className="mt-4 text-gray-500">No hay pedidos {filterStatus !== 'all' ? `con estado "${filterStatus}"` : ''}</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredOrders.map(order => {
                            const statusInfo = ORDER_STATUSES[order.status] || ORDER_STATUSES.pending;
                            const StatusIcon = statusInfo.icon;
                            const isExpanded = expandedOrder === order._id;
                            const nextStatus = getNextStatus(order.status);

                            return (
                                <div
                                    key={order._id}
                                    className="bg-white rounded-xl shadow-md overflow-hidden border-l-4"
                                    style={{ borderLeftColor: order.status === 'pending' ? '#f59e0b' : order.status === 'ready' ? '#10b981' : '#6b7280' }}
                                >
                                    {/* Header del pedido */}
                                    <div
                                        className="p-4 cursor-pointer hover:bg-gray-50"
                                        onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-lg">#{order.orderNumber?.slice(-6) || 'N/A'}</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${statusInfo.color}`}>
                                                <StatusIcon size={14} />
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <span>{formatDate(order.createdAt)} - {formatTime(order.createdAt)}</span>
                                            <span className="flex items-center gap-1">
                                                {order.deliveryMethod === 'A domicilio' ? <MdLocalShipping /> : <MdRestaurant />}
                                                {order.deliveryMethod}
                                            </span>
                                        </div>

                                        {/* Contador de tiempo transcurrido */}
                                        {!['completed', 'cancelled'].includes(order.status) && (
                                            <div className="mt-2">
                                                <OrderTimer createdAt={order.createdAt} />
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="font-medium">{order.customer?.name} {order.customer?.lastname}</span>
                                            <span className="font-bold text-orange-600">${order.total?.toLocaleString()}</span>
                                        </div>

                                        <div className="mt-2 text-right">
                                            {isExpanded ? <MdExpandLess className="inline" /> : <MdExpandMore className="inline" />}
                                        </div>
                                    </div>

                                    {/* Detalles expandidos */}
                                    {isExpanded && (
                                        <div className="border-t bg-gray-50 p-4">
                                            {/* Items */}
                                            <div className="mb-4">
                                                <h4 className="font-medium text-sm text-gray-700 mb-2">Items:</h4>
                                                <ul className="space-y-1">
                                                    {order.items?.map((item, idx) => (
                                                        <li key={idx} className="flex justify-between text-sm">
                                                            <span>{item.quantity}x {item.name}</span>
                                                            <span className="text-gray-500">${(item.price * item.quantity).toLocaleString()}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Info cliente */}
                                            <div className="mb-4 text-sm">
                                                <p><strong>Tel:</strong> {order.customer?.phone}</p>
                                                {order.customer?.email && <p><strong>Email:</strong> {order.customer?.email}</p>}
                                                {order.deliveryAddress && <p><strong>Dirección:</strong> {order.deliveryAddress}</p>}
                                                {order.notes && <p><strong>Notas:</strong> {order.notes}</p>}
                                            </div>

                                            {/* Acciones */}
                                            <div className="flex gap-2">
                                                {nextStatus && order.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(order._id, nextStatus)}
                                                        className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                                                    >
                                                        Pasar a: {ORDER_STATUSES[nextStatus]?.label}
                                                    </button>
                                                )}
                                                {order.status !== 'cancelled' && order.status !== 'completed' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(order._id, 'cancelled')}
                                                        className="bg-red-100 text-red-600 py-2 px-4 rounded-lg font-medium hover:bg-red-200 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handlePrintTicket(order._id)}
                                                    className="inline-flex items-center justify-center gap-1 bg-indigo-100 text-indigo-700 py-2 px-3 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
                                                    title="Imprimir ticket de compra"
                                                >
                                                    <MdPrint size={18} />
                                                    Ticket
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Auto-refresh cada 30 segundos */}
            <AutoRefresh refetch={refetchOrders} interval={30000} />
        </div>
    );
};

// Componente contador de tiempo transcurrido
const OrderTimer = ({ createdAt }) => {
    const [elapsed, setElapsed] = useState('');
    const [colorClass, setColorClass] = useState('text-green-600 bg-green-50');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const created = new Date(createdAt);
            const diffMs = now - created;
            const diffSec = Math.floor(diffMs / 1000);
            const hours = Math.floor(diffSec / 3600);
            const minutes = Math.floor((diffSec % 3600) / 60);
            const seconds = diffSec % 60;

            if (hours > 0) {
                setElapsed(`${hours}h ${minutes}m`);
            } else if (minutes > 0) {
                setElapsed(`${minutes}m ${seconds}s`);
            } else {
                setElapsed(`${seconds}s`);
            }

            // Color basado en el tiempo transcurrido
            const totalMinutes = diffSec / 60;
            if (totalMinutes >= 20) {
                setColorClass('text-red-600 bg-red-50 border-red-200');
            } else if (totalMinutes >= 10) {
                setColorClass('text-yellow-600 bg-yellow-50 border-yellow-200');
            } else {
                setColorClass('text-green-600 bg-green-50 border-green-200');
            }
        };

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [createdAt]);

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
            <MdTimer size={14} />
            {elapsed}
        </span>
    );
};

// Componente para auto-refresh
const AutoRefresh = ({ refetch, interval }) => {
    useEffect(() => {
        const timer = setInterval(() => {
            refetch();
        }, interval);

        return () => clearInterval(timer);
    }, [refetch, interval]);

    return null;
};

export default CashierPanel;
