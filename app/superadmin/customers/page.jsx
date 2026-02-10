'use client';

import { useEffect, useState } from 'react';
import { MdPeople, MdTrendingUp, MdAutorenew, MdAttachMoney } from 'react-icons/md';

export default function CustomersPage() {
    const [stats, setStats] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, customersRes] = await Promise.all([
                fetch('/api/superadmin/customers/stats'),
                fetch('/api/superadmin/customers?limit=50')
            ]);

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data.stats);
            }

            if (customersRes.ok) {
                const data = await customersRes.json();
                setCustomers(data.customers);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Clientes Únicos</h2>
                <p className="text-gray-600 mt-1">Tracking de usuarios por teléfono y email</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Clientes"
                        value={stats.totalCustomers?.toLocaleString()}
                        icon={MdPeople}
                        color="purple"
                    />
                    <StatsCard
                        title="Nuevos (7d)"
                        value={stats.newCustomers7d?.toLocaleString()}
                        icon={MdTrendingUp}
                        color="green"
                        subtitle={`${stats.newCustomers30d} en 30d`}
                    />
                    <StatsCard
                        title="Recurrentes"
                        value={stats.returningCustomers?.toLocaleString()}
                        icon={MdAutorenew}
                        color="blue"
                        subtitle={`${stats.oneTimeCustomers} únicos`}
                    />
                    <StatsCard
                        title="Gasto Promedio"
                        value={`$${stats.avgSpentPerCustomer?.toLocaleString()}`}
                        icon={MdAttachMoney}
                        color="orange"
                        subtitle={`${stats.avgOrdersPerCustomer?.toFixed(1)} órdenes/cliente`}
                    />
                </div>
            )}

            {/* Customer Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Lista de Clientes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Cliente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Contacto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Órdenes
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Total Gastado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Última Orden
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {customers.map((customer) => (
                                <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                <span className="text-purple-600 font-bold text-sm">
                                                    {customer.name?.charAt(0)?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {customer.name || 'Sin nombre'} {customer.lastname || ''}
                                                </p>
                                                {customer.totalOrders > 1 && (
                                                    <span className="text-xs text-green-600 font-medium">
                                                        Cliente recurrente
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="text-gray-900 font-medium">{customer.phone}</p>
                                            {customer.email && (
                                                <p className="text-gray-500">{customer.email}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {customer.totalOrders} órdenes
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-lg font-bold text-gray-900">
                                            ${customer.totalSpent?.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-600">
                                            {new Date(customer.lastOrderDate).toLocaleDateString('es-AR')}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {customers.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <MdPeople className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay clientes registrados aún</p>
                </div>
            )}
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color, subtitle }) {
    const colors = {
        purple: 'bg-purple-100 text-purple-600',
        green: 'bg-green-100 text-green-600',
        blue: 'bg-blue-100 text-blue-600',
        orange: 'bg-orange-100 text-orange-600'
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
