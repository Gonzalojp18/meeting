'use client';

import { useEffect, useState } from 'react';
import { MdTrendingUp, MdShoppingBag, MdPeople, MdAttachMoney } from 'react-icons/md';

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/superadmin/analytics/overview');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
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
                <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-600 mt-1">Métricas consolidadas del sistema</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Revenue Total"
                    value={`$${stats?.totalRevenue?.toLocaleString() || '0'}`}
                    icon={MdAttachMoney}
                    color="green"
                    trend={stats?.revenueTrend}
                />
                <StatsCard
                    title="Órdenes Totales"
                    value={stats?.totalOrders?.toLocaleString() || '0'}
                    icon={MdShoppingBag}
                    color="blue"
                />
                <StatsCard
                    title="Clientes Únicos"
                    value={stats?.activeCustomers?.toLocaleString() || '0'}
                    icon={MdPeople}
                    color="purple"
                />
                <StatsCard
                    title="Ticket Promedio"
                    value={`$${stats?.averageOrderValue?.toLocaleString() || '0'}`}
                    icon={MdTrendingUp}
                    color="orange"
                />
            </div>

            {/* Revenue by Location */}
            {stats?.revenueByLocation && stats.revenueByLocation.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Revenue por Locación</h3>
                    <div className="space-y-4">
                        {stats.revenueByLocation.map((location) => (
                            <div key={location.locationId} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <span className="text-purple-600 font-bold text-sm">
                                            {location.name?.substring(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{location.name}</p>
                                        <p className="text-sm text-gray-500">{location.orderCount} órdenes</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">
                                        ${location.revenue?.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <QuickActionCard
                    title="Gestionar Locaciones"
                    description="Activar/desactivar sedes y servicios"
                    href="/superadmin/locations"
                    color="purple"
                />
                <QuickActionCard
                    title="Ver Clientes"
                    description="Lista de usuarios únicos"
                    href="/superadmin/customers"
                    color="blue"
                />
                <QuickActionCard
                    title="Analytics Avanzado"
                    description="Métricas detalladas y gráficos"
                    href="/superadmin/analytics"
                    color="green"
                />
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color, trend }) {
    const colors = {
        green: 'bg-green-100 text-green-600',
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600'
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

function QuickActionCard({ title, description, href, color }) {
    const colors = {
        purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-600',
        blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-600',
        green: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-600'
    };

    return (
        <a
            href={href}
            className={`block p-6 rounded-xl border-2 transition-all ${colors[color]}`}
        >
            <h4 className="text-lg font-bold mb-2">{title}</h4>
            <p className="text-sm opacity-75">{description}</p>
        </a>
    );
}
