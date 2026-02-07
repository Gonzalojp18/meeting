'use client';
import React from 'react';
import {
    MdAttachMoney,
    MdShoppingCart,
    MdTrendingUp,
    MdLocalShipping,
    MdStore
} from 'react-icons/md';

const StatsGrid = ({ summary = {}, deliveryStats = [] }) => {
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
        { key: 'A domicilio', icon: MdLocalShipping, label: 'Delivery' },
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[...stats, ...deliveryMetrics].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={idx}
                        className={`bg-white rounded-xl border ${stat.borderColor} shadow-sm p-4 hover:shadow-md transition-shadow group`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 ${stat.color} rounded-lg group-hover:scale-110 transition-transform`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default StatsGrid;
