'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useFetch } from '@/hooks/useFetch';
import API_URI from '@/utils/getApiUri';
import axios from 'axios';

const CajaDashboard = () => {
    const { locationId } = useParams();
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = session?.user?.token;

    // Fetch orders for this location
    const { data: orders, loading, error, refetch } = useFetch(
        `${API_URI}/api/orders?locationId=${locationId}`,
        token
    );

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }

        // Protection: Check if staff has access to this location
        if (session && session.user.role === 'staff') {
            const hasAccess = session.user.assignedLocations?.includes(locationId);
            if (!hasAccess) {
                router.push('/'); // Or a "no access" page
            }
        }
    }, [status, session, locationId, router]);

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            await axios.patch(`${API_URI}/api/orders/${orderId}`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            refetch();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Error al actualizar el estado');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando pedidos...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: No tienes permiso para esta sede o hubo un problema.</div>;

    const activeOrders = orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled') || [];

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Caja / Pedidos</h1>
                    <p className="text-gray-600">Sede: <span className="font-semibold">{locationId}</span></p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                    Actualizar
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOrders.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-xl shadow-sm">
                        No hay pedidos activos en este momento.
                    </div>
                ) : (
                    activeOrders.map(order => (
                        <div key={order._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <span className="font-bold text-gray-700">#{order.orderNumber.slice(-6)}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                            order.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="p-4">
                                <div className="mb-4">
                                    <h3 className="font-bold text-gray-800">{order.customer.name} {order.customer.lastname}</h3>
                                    <p className="text-sm text-gray-500">{order.customer.phone}</p>
                                </div>

                                <div className="space-y-2 mb-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span className="text-gray-600">${(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-gray-100 flex justify-between font-bold">
                                        <span>Total</span>
                                        <span className="text-orange-600">${order.total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {order.status === 'pending' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order._id, 'preparing')}
                                            className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-bold"
                                        >
                                            Preparar
                                        </button>
                                    )}
                                    {order.status === 'preparing' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order._id, 'ready')}
                                            className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-bold"
                                        >
                                            Listo
                                        </button>
                                    )}
                                    {order.status === 'ready' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order._id, 'completed')}
                                            className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-bold"
                                        >
                                            Entregado
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CajaDashboard;
