'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MdArrowBack, MdReceipt, MdAccessTime, MdCheckCircle, MdCancel, MdRestaurant, MdLocalShipping } from 'react-icons/md';
import BottomNav from '../../components/navigation/BottomNav';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: MdAccessTime },
    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: MdCheckCircle },
    preparing: { label: 'Preparando', color: 'bg-orange-100 text-orange-800', icon: MdRestaurant },
    ready: { label: 'Listo', color: 'bg-green-100 text-green-800', icon: MdLocalShipping },
    completed: { label: 'Completado', color: 'bg-gray-100 text-gray-800', icon: MdCheckCircle },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: MdCancel },
};

export default function MyOrdersPage() {
    const { data: session, status: authStatus } = useSession();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            if (authStatus === 'loading') return;

            if (!session) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch('/api/orders/my-orders', {
                    headers: {
                        Authorization: `Bearer ${session.user?.token}`,
                    },
                });

                if (!res.ok) {
                    throw new Error('Error al obtener pedidos');
                }

                const data = await res.json();
                setOrders(data.orders || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [session, authStatus]);

    if (authStatus === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <div className="bg-white border-b px-4 py-4 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                            <MdArrowBack className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold">Mis Pedidos</h1>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <div className="bg-gray-100 rounded-full p-6 mb-6">
                        <MdReceipt className="w-16 h-16 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Inicia sesión para ver tus pedidos</h2>
                    <p className="text-gray-500 mb-6">Necesitas una cuenta para guardar y ver tu historial de pedidos.</p>
                    <Link
                        href="/login"
                        className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors"
                    >
                        Iniciar Sesión
                    </Link>
                </div>

                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                        <MdArrowBack className="w-6 h-6" />
                    </Link>
                    <h1 className="text-xl font-bold">Mis Pedidos</h1>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-gray-100 rounded-full p-6 mb-6">
                            <MdReceipt className="w-16 h-16 text-gray-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Aún no tienes pedidos</h2>
                        <p className="text-gray-500 mb-6">¡Explora nuestro menú y haz tu primer pedido!</p>
                        <Link
                            href="/menu/location1"
                            className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors"
                        >
                            Ver Menú
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const config = statusConfig[order.status] || statusConfig.pending;
                            const StatusIcon = config.icon;

                            return (
                                <Link
                                    key={order._id}
                                    href={`/tracking/${order.orderNumber}`}
                                    className="block bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-bold text-gray-900">#{order.orderNumber}</p>
                                            <p className="text-xs text-gray-500">
                                                {format(new Date(order.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
                                            </p>
                                        </div>
                                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>
                                            <StatusIcon className="w-4 h-4" />
                                            {config.label}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-3">
                                        <p className="text-sm text-gray-600 line-clamp-1">
                                            {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                        </p>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-gray-500">
                                                {order.location?.locationName || order.location?.locationId}
                                            </p>
                                            <p className="font-bold text-gray-900">
                                                ${order.total?.toLocaleString('es-AR')}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
