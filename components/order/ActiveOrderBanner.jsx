'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdShoppingBag, MdCheckCircle, MdAccessTime, MdRestaurant } from 'react-icons/md';
import useActiveOrderStore from '@/store/activeOrderStore';
import API_URI from '@/utils/getApiUri';

const STATUS_CONFIG = {
    pending_payment: {
        label: 'Procesando pago',
        icon: MdAccessTime,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600'
    },
    payment_completed: {
        label: 'Pago completado',
        icon: MdCheckCircle,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
    },
    confirmed: {
        label: 'Confirmado',
        icon: MdCheckCircle,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
    },
    preparing: {
        label: 'En preparación',
        icon: MdRestaurant,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-600'
    },
    ready: {
        label: '¡LISTO PARA RETIRAR!',
        icon: MdCheckCircle,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-400',
        textColor: 'text-green-800',
        iconColor: 'text-green-600',
        animate: true
    }
};

export default function ActiveOrderBanner() {
    const router = useRouter();
    const { activeOrder, hasActiveOrder, updateStatus } = useActiveOrderStore();
    const [serverStatus, setServerStatus] = useState(null);

    // Polling para sincronizar el estado del servidor
    useEffect(() => {
        if (!activeOrder?.orderNumber) return;

        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_URI}/api/orders/by-number/${activeOrder.orderNumber}`);
                if (res.ok) {
                    const data = await res.json();
                    setServerStatus(data.status);
                    // Actualizar el store local si el estado cambió
                    if (data.status !== activeOrder.status) {
                        updateStatus(data.status);
                    }
                }
            } catch (err) {
                console.error('Error fetching order status:', err);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 15000); // Cada 15 segundos

        return () => clearInterval(interval);
    }, [activeOrder?.orderNumber, activeOrder?.status, updateStatus]);

    // No mostrar si no hay pedido activo
    if (!hasActiveOrder() || !activeOrder) return null;

    // No mostrar si el pedido ya fue recogido
    if (activeOrder.status === 'picked_up' || activeOrder.status === 'completed') return null;

    const displayStatus = serverStatus || activeOrder.status;
    const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.confirmed;
    const Icon = config.icon;

    const handleClick = () => {
        if (activeOrder.orderNumber) {
            router.push(`/tracking/${activeOrder.orderNumber}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`
                mx-4 mt-4 p-4 rounded-xl border-2 cursor-pointer
                ${config.bgColor} ${config.borderColor}
                transition-all hover:shadow-md
                ${config.animate ? 'animate-pulse' : ''}
            `}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${config.bgColor}`}>
                    <Icon className={`text-2xl ${config.iconColor}`} />
                </div>
                <div className="flex-1">
                    <p className={`font-bold ${config.textColor}`}>
                        {activeOrder.orderNumber
                            ? `Pedido #${activeOrder.orderNumber.replace('ORD-', '')}`
                            : 'Pedido en proceso'}
                    </p>
                    <p className={`text-sm ${config.textColor} opacity-75`}>
                        {config.label}
                    </p>
                </div>
                <div className={`text-sm font-medium ${config.textColor}`}>
                    Ver detalles →
                </div>
            </div>

            {displayStatus === 'ready' && (
                <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-center text-green-700 font-bold text-sm">
                        ¡Tu pedido te está esperando! Toca para ver los detalles.
                    </p>
                </div>
            )}
        </div>
    );
}
