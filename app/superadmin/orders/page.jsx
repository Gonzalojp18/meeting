'use client';

import { useEffect, useState } from 'react';
import { MdReceipt, MdFilterList, MdAttachMoney, MdShoppingCart } from 'react-icons/md';

const STATUS_LABELS = {
    approved: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
    rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        locationId: '',
    });

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [filters]);

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/superadmin/locations');
            if (res.ok) {
                const data = await res.json();
                setLocations(data.locations || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.date) params.set('date', filters.date);
            if (filters.locationId) params.set('locationId', filters.locationId);
            const res = await fetch(`/api/superadmin/orders?${params}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const approvedOrders = orders.filter(o => o.paymentStatus === 'approved');
    const totalRevenue = approvedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Órdenes</h2>
                <p className="text-gray-600 mt-1">Historial completo de pedidos</p>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <MdFilterList className="w-5 h-5 text-gray-500" />
                    <input
                        type="date"
                        value={filters.date}
                        onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select
                        value={filters.locationId}
                        onChange={e => setFilters(f => ({ ...f, locationId: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Todas las locaciones</option>
                        {locations.map(loc => (
                            <option key={loc.locationId} value={loc.locationId}>
                                {loc.locationName}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setFilters({ date: '', locationId: '' })}
                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                    >
                        Ver todos
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Órdenes totales"
                    value={orders.length}
                    icon={MdShoppingCart}
                    color="purple"
                />
                <StatCard
                    title="Órdenes aprobadas"
                    value={approvedOrders.length}
                    icon={MdReceipt}
                    color="green"
                />
                <StatCard
                    title="Revenue"
                    value={`$${totalRevenue.toLocaleString('es-AR')}`}
                    icon={MdAttachMoney}
                    color="orange"
                />
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">
                        {orders.length} pedido{orders.length !== 1 ? 's' : ''}
                    </h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <MdReceipt className="w-14 h-14 mx-auto mb-3" />
                        <p>No hay órdenes para los filtros seleccionados</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Orden</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Locación</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map(order => {
                                    const status = STATUS_LABELS[order.paymentStatus] || { label: order.paymentStatus, color: 'bg-gray-100 text-gray-700' };
                                    return (
                                        <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm font-bold text-purple-700">
                                                    {order.orderNumber}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(order.createdAt).toLocaleString('es-AR', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900">
                                                    {order.customer?.name} {order.customer?.lastname}
                                                </p>
                                                {order.customer?.phone && (
                                                    <p className="text-xs text-gray-500">{order.customer.phone}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                {order.location?.locationName || order.location?.locationId || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {order.deliveryMethod || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <ul className="text-xs text-gray-700 space-y-0.5">
                                                    {(order.items || []).map((item, i) => (
                                                        <li key={i}>{item.quantity}x {item.name}</li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900">
                                                    ${(order.total || 0).toLocaleString('es-AR')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color }) {
    const colors = {
        purple: 'bg-purple-100 text-purple-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
    };
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
