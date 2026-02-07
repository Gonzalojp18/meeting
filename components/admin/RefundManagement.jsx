'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { MdRefresh, MdCheckCircle, MdError, MdHourglassEmpty, MdInfo } from 'react-icons/md';
import API_URI from '@/utils/getApiUri';

const RefundManagement = () => {
    const { data: session } = useSession();
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({});
    const [selectedStatus, setSelectedStatus] = useState('pending'); // pending, processing, completed, failed
    const [processing, setProcessing] = useState(new Set());
    const [expandedOrders, setExpandedOrders] = useState(new Set());

    const token = session?.user?.token;

    // Fetch refunds
    const fetchRefunds = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const res = await axios.get(`${API_URI}/api/admin/refunds`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    status: selectedStatus === 'all' ? null : selectedStatus,
                    limit: 50
                }
            });

            setRefunds(res.data.refunds);
            setSummary(res.data.summary);
        } catch (error) {
            console.error('Error fetching refunds:', error);
            alert('Error al cargar reembolsos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefunds();
    }, [token, selectedStatus]);

    // Process refund
    const handleProcessRefund = async (order) => {
        const confirmed = window.confirm(
            `¿Procesar reembolso de $${order.total.toLocaleString('es-AR')} para el pedido #${order.orderNumber}?\\n\\nCliente: ${order.customer.name}\\nTeléfono: ${order.customer.phone}`
        );

        if (!confirmed) return;

        const notes = prompt('Notas internas (opcional):');
        const confirmAmount = parseFloat(prompt(`Confirma el monto a reembolsar (seguridad): $${order.total}`));

        if (confirmAmount !== order.total) {
            alert('El monto confirmado no coincide. Operación cancelada.');
            return;
        }

        setProcessing(prev => new Set(prev).add(order._id));
        try {
            const res = await axios.post(
                `${API_URI}/api/admin/refunds/${order._id}/process`,
                { notes, confirmAmount },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(res.data.message || 'Reembolso procesado exitosamente');
            await fetchRefunds(); // Refresh list
        } catch (error) {
            console.error('Error processing refund:', error);
            alert(error.response?.data?.error || 'Error al procesar reembolso');
        } finally {
            setProcessing(prev => {
                const newSet = new Set(prev);
                newSet.delete(order._id);
                return newSet;
            });
        }
    };

    const toggleOrderExpand = (orderId) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    const getStatusBadge = (status) => {
        const config = {
            pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800', icon: MdHourglassEmpty },
            processing: { label: 'Procesando', color: 'bg-blue-100 text-blue-800', icon: MdHourglassEmpty },
            completed: { label: 'Completado', color: 'bg-green-100 text-green-800', icon: MdCheckCircle },
            failed: { label: 'Fallido', color: 'bg-red-100 text-red-800', icon: MdError }
        };

        const { label, color, icon: Icon } = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
                <Icon />
                {label}
            </span>
        );
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    const getTimeSinceCancellation = (cancelledAt) => {
        const now = new Date();
        const cancelled = new Date(cancelledAt);
        const diffMinutes = Math.floor((now - cancelled) / 1000 / 60);

        if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `Hace ${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    };

    return (
        <div className="space-y-6">
            {/* Header & Summary */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestión de Reembolsos</h2>
                    <p className="text-gray-600 text-sm mt-1">Pedidos cancelados que requieren procesamiento de reembolso</p>
                </div>
                <button
                    onClick={fetchRefunds}
                    className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 hover:bg-gray-800 transition"
                    disabled={loading}
                >
                    <MdRefresh className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-700 font-medium">Pendientes</p>
                    <p className="text-2xl font-bold text-amber-900">{summary.pending?.count || 0}</p>
                    <p className="text-xs text-amber-600 mt-1">
                        ${(summary.pending?.totalAmount || 0).toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 font-medium">Procesando</p>
                    <p className="text-2xl font-bold text-blue-900">{summary.processing?.count || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">
                        ${(summary.processing?.totalAmount || 0).toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 font-medium">Completados</p>
                    <p className="text-2xl font-bold text-green-900">{summary.completed?.count || 0}</p>
                    <p className="text-xs text-green-600 mt-1">
                        ${(summary.completed?.totalAmount || 0).toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 font-medium">Fallidos</p>
                    <p className="text-2xl font-bold text-red-900">{summary.failed?.count || 0}</p>
                    <p className="text-xs text-red-600 mt-1">
                        ${(summary.failed?.totalAmount || 0).toLocaleString('es-AR')}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {[
                    { id: 'pending', label: 'Pendiente' },
                    { id: 'processing', label: 'Procesando' },
                    { id: 'completed', label: 'Completados' },
                    { id: 'failed', label: 'Fallidos' },
                    { id: 'all', label: 'Todos' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedStatus(tab.id)}
                        className={`px-4 py-2 font-medium border-b-2 transition ${selectedStatus === tab.id
                                ? 'border-black text-black'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Refunds List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando reembolsos...</p>
                </div>
            ) : refunds.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <MdInfo className="text-6xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No hay reembolsos en este estado</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {refunds.map(order => {
                        const isExpanded = expandedOrders.has(order._id);
                        const isProcessing = processing.has(order._id);

                        return (
                            <div key={order._id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                                {/* Header */}
                                <div className="p-5 cursor-pointer" onClick={() => toggleOrderExpand(order._id)}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-lg font-bold text-gray-800">
                                                    #{order.orderNumber}
                                                </span>
                                                {getStatusBadge(order.refund?.status)}
                                                <span className="text-sm text-gray-500">
                                                    {getTimeSinceCancellation(order.cancelledAt)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-700">Cliente:</span>
                                                    <span className="ml-2">{order.customer.name}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Teléfono:</span>
                                                    <span className="ml-2">{order.customer.phone}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Total:</span>
                                                    <span className="ml-2 font-bold text-green-600">
                                                        ${order.total.toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            </div>
                                            {order.refund?.reason && (
                                                <div className="mt-2 text-sm text-gray-600 italic">
                                                    "{order.refund.reason}"
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {order.refund?.status === 'pending' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleProcessRefund(order);
                                                    }}
                                                    disabled={isProcessing}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                                                >
                                                    {isProcessing ? 'Procesando...' : 'Procesar Reembolso'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable Details */}
                                {isExpanded && (
                                    <div className="border-t border-gray-200 p-5 bg-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Items */}
                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-3">Items del Pedido</h4>
                                                <div className="space-y-2">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span>{item.quantity}x {item.name}</span>
                                                            <span className="font-medium">
                                                                ${(item.price * item.quantity).toLocaleString('es-AR')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-3">Detalles</h4>
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <span className="text-gray-600">Ubicación:</span>
                                                        <span className="ml-2 font-medium">{order.location.locationName}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Creado:</span>
                                                        <span className="ml-2">{formatDate(order.createdAt)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Cancelado:</span>
                                                        <span className="ml-2">{formatDate(order.cancelledAt)}</span>
                                                    </div>
                                                    {order.refund?.processedAt && (
                                                        <div>
                                                            <span className="text-gray-600">Procesado:</span>
                                                            <span className="ml-2">{formatDate(order.refund.processedAt)}</span>
                                                        </div>
                                                    )}
                                                    {order.refund?.processedBy && (
                                                        <div>
                                                            <span className="text-gray-600">Procesado por:</span>
                                                            <span className="ml-2">{order.refund.processedBy.userName} ({order.refund.processedBy.userRole})</span>
                                                        </div>
                                                    )}
                                                    {order.refund?.notes && (
                                                        <div>
                                                            <span className="text-gray-600">Notas internas:</span>
                                                            <p className="ml-2 mt-1 italic">{order.refund.notes}</p>
                                                        </div>
                                                    )}
                                                    {order.refund?.errorMessage && (
                                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                                            <span className="text-red-800 font-medium">Error:</span>
                                                            <p className="text-red-700 text-xs mt-1">{order.refund.errorMessage}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RefundManagement;
