'use client';
import React, { useState } from 'react';
import {
    MdAttachMoney,
    MdShoppingCart,
    MdTrendingUp,
    MdStore,
    MdVisibility,
    MdVisibilityOff
} from 'react-icons/md';

const StatsGrid = ({ summary = {}, deliveryStats = [] }) => {
    const [showRevenue, setShowRevenue] = useState(false);
    // Proteger contra summary undefined
    const safeSum = summary || {};

    const stats = [
        {
            label: 'Ventas Totales',
            value: `$${(safeSum.totalRevenue || 0).toLocaleString('es-AR')}`,
            icon: MdAttachMoney,
            color: 'bg-green-100 text-green-600',
            borderColor: 'border-green-200'
        },
        {
            label: 'Total Pedidos',
            value: safeSum.orderCount || 0,
            icon: MdShoppingCart,
            color: 'bg-blue-100 text-blue-600',
            borderColor: 'border-blue-200'
        },
        {
            label: 'Ticket Promedio',
            value: `$${(safeSum.avgTicket || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
            icon: MdTrendingUp,
            color: 'bg-purple-100 text-purple-600',
            borderColor: 'border-purple-200'
        }
    ];

    // Obtener cantidad por método de entrega
    const deliveryTypes = [
        { key: 'Retiro en Sucursal', icon: MdStore, label: 'Takeaway' }
    ];

    const deliveryMetrics = deliveryTypes.map(type => {
        const found = deliveryStats.find(d => d._id === type.key);
        return {
            label: type.label,
            value: found ? found.count : 0,
            icon: type.icon,
            color: 'bg-orange-100 text-orange-600',
            borderColor: 'border-orange-200'
        };
    });

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...stats, ...deliveryMetrics].map((stat, idx) => {
                const Icon = stat.icon;
                const isRevenue = stat.label === 'Ventas Totales';
                return (
                    <div
                        key={idx}
                        className={`bg-white rounded-xl border ${stat.borderColor} shadow-sm p-4 hover:shadow-md transition-shadow group`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 ${stat.color} rounded-lg group-hover:scale-110 transition-transform`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">{stat.label}</p>
                            {isRevenue && (
                                <button
                                    onClick={() => setShowRevenue(v => !v)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    title={showRevenue ? 'Ocultar' : 'Mostrar'}
                                >
                                    {showRevenue ? <MdVisibility className="h-4 w-4" /> : <MdVisibilityOff className="h-4 w-4" />}
                                </button>
                            )}
                        </div>
                        <p className="text-2xl font-black text-gray-900">
                            {isRevenue ? (showRevenue ? stat.value : '••••••') : stat.value}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

export default StatsGrid;
