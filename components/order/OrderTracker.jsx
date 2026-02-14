'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MdCheckCircle, MdAccessTime, MdRestaurant, MdLocalShipping, MdDone } from 'react-icons/md';
import useActiveOrderStore from '@/store/activeOrderStore';
import API_URI from '@/utils/getApiUri';

const ORDER_STATES = {
    confirmed: { label: 'Confirmado', icon: MdCheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    preparing: { label: 'En Preparación', icon: MdRestaurant, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    ready: { label: 'Listo para Retirar', icon: MdLocalShipping, color: 'text-green-600', bgColor: 'bg-green-100' },
    completed: { label: 'Retirado', icon: MdDone, color: 'text-gray-600', bgColor: 'bg-gray-100' }
};

const STATE_ORDER = ['confirmed', 'preparing', 'ready', 'completed'];

export default function OrderTracker({ orderNumber, initialOrder = null }) {
    const router = useRouter();
    const [order, setOrder] = useState(initialOrder);
    const [loading, setLoading] = useState(!initialOrder);
    const [error, setError] = useState(null);
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [confirmingPickup, setConfirmingPickup] = useState(false);
    const [hasPlayedSound, setHasPlayedSound] = useState(false);
    const previousStatusRef = useRef(initialOrder?.status);

    // Cancel order states
    const [timeLeft, setTimeLeft] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    const { clearActiveOrder, updateStatus } = useActiveOrderStore();

    // Fetch order data
    const fetchOrder = useCallback(async () => {
        try {
            const res = await fetch(`${API_URI}/api/orders/by-number/${orderNumber}`);
            if (!res.ok) {
                if (res.status === 404) {
                    setError('Pedido no encontrado');
                } else {
                    throw new Error('Error al cargar el pedido');
                }
                return;
            }
            const data = await res.json();
            setOrder(data);
            setError(null);

            // Update local store status if different
            if (data.status !== previousStatusRef.current) {
                updateStatus(data.status);

                // Play sound when status changes to ready
                if (data.status === 'ready' && previousStatusRef.current !== 'ready' && !hasPlayedSound) {
                    playReadySound();
                    setHasPlayedSound(true);
                }

                previousStatusRef.current = data.status;
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            setError('Error al cargar el pedido');
        } finally {
            setLoading(false);
        }
    }, [orderNumber, updateStatus, hasPlayedSound]);

    // Calculate time left for cancellation (5 minutes)
    useEffect(() => {
        if (!order?.createdAt || order.status === 'cancelled') return;

        const calculateTimeLeft = () => {
            const created = new Date(order.createdAt);
            const now = new Date();
            const elapsed = (now - created) / 1000; // segundos
            const remaining = Math.max(0, 300 - elapsed); // 5 min = 300 seg
            return remaining;
        };

        setTimeLeft(calculateTimeLeft());
        const interval = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order]);

    // Play notification sound when order is ready
    const playReadySound = () => {
        try {
            // Try vibration first
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }

            // Play sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
            }, 500);

            // Show browser notification if permitted
            if (Notification.permission === 'granted') {
                new Notification('Tu pedido está listo', {
                    body: `Pedido #${orderNumber} - Ya puedes retirarlo`,
                    icon: '/icons/icon-192x192.png'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
        } catch (err) {
            console.log('Could not play notification sound:', err);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchOrder();

        // Poll every 10 seconds
        const interval = setInterval(fetchOrder, 10000);

        return () => clearInterval(interval);
    }, [fetchOrder]);

    // Handle pickup confirmation
    const handleConfirmPickup = async () => {
        if (!order?._id) return;

        setConfirmingPickup(true);
        try {
            const res = await fetch(`${API_URI}/api/orders/${order._id}/customer-pickup`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error('Error al confirmar retiro');
            }

            // Clear local store and redirect
            clearActiveOrder();
            router.push(`/menu/${order.location?.locationId || 'harrods'}`);
        } catch (err) {
            console.error('Error confirming pickup:', err);
            alert('Error al confirmar el retiro. Por favor, intente nuevamente.');
        } finally {
            setConfirmingPickup(false);
            setShowPickupModal(false);
        }
    };

    // Handle order cancellation
    const handleCancelOrder = async () => {
        if (!order?._id) return;

        setCancelling(true);
        try {
            const res = await fetch(`${API_URI}/api/orders/${order._id}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: order.customer.phone,
                    email: order.customer.email,
                    reason: cancelReason
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al cancelar el pedido');
            }

            // Actualizar orden local
            await fetchOrder();

            // Limpiar store y mostrar mensaje de éxito
            clearActiveOrder();
            setShowCancelModal(false);
            alert(data.message || 'Pedido cancelado exitosamente. Recibirás el reembolso en 10-30 días hábiles.');

            // Redirigir al menú
            router.push(`/menu/${order.location?.locationId || 'harrods'}`);

        } catch (err) {
            console.error('Error cancelling order:', err);
            alert(err.message || 'Error al cancelar el pedido. Por favor, intente nuevamente o contacte soporte.');
        } finally {
            setCancelling(false);
        }
    };

    // Get current step index
    const getCurrentStepIndex = () => {
        if (!order?.status) return -1;
        return STATE_ORDER.indexOf(order.status);
    };

    // Check if order can be cancelled
    const canCancel = (
        timeLeft > 0 &&
        (order?.status === 'pending' || order?.status === 'confirmed') &&
        (order?.paymentStatus === 'approved' || order?.paymentStatus === 'pending') &&
        (order?.refund?.status === 'none' || !order?.refund?.status)
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando pedido...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
                    <div className="text-red-500 text-5xl mb-4">!</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{error}</h2>
                    <p className="text-gray-600 mb-4">No pudimos encontrar el pedido #{orderNumber}</p>
                    <button
                        onClick={() => router.push('/menu/harrods')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        Volver al Menú
                    </button>
                </div>
            </div>
        );
    }

    const currentStep = getCurrentStepIndex();
    const isReady = order?.status === 'ready';
    const isCompleted = order?.status === 'completed';

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-lg mx-auto px-4 py-6">
                    <h1 className="text-2xl font-bold text-gray-800 text-center">
                        Seguimiento de Pedido
                    </h1>
                    <p className="text-center text-gray-600 mt-1">
                        {order?.customer?.name} {order?.customer?.lastname}
                    </p>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Order Number Card */}
                <div className={`bg-white rounded-xl shadow-lg p-6 text-center ${isReady ? 'ring-4 ring-green-400 animate-pulse' : ''}`}>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">
                        Muestra este número en caja
                    </p>
                    <p className="text-5xl font-bold text-gray-800 mt-2">
                        #{order?.orderNumber?.replace('ORD-', '')}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        {order?.location?.locationName}
                    </p>
                </div>

                {/* Cancel Button - Only if eligible */}
                {canCancel && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-semibold text-amber-900 text-lg">
                                    ¿Necesitas cancelar?
                                </p>
                                <p className="text-sm text-amber-700 mt-1">
                                    Tiempo restante: <span className="font-mono font-bold">
                                        {Math.floor(timeLeft / 60)}:{String(Math.floor(timeLeft % 60)).padStart(2, '0')}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition shadow-md"
                            >
                                Cancelar Pedido
                            </button>
                        </div>
                        <p className="text-xs text-amber-600 bg-amber-100 p-2 rounded">
                            💡 El reembolso será procesado en 24-48 horas y reflejado en tu cuenta en 10-30 días hábiles.
                        </p>
                    </div>
                )}

                {/* Status Timeline */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Estado del Pedido</h2>

                    <div className="relative">
                        {STATE_ORDER.map((state, index) => {
                            const stateInfo = ORDER_STATES[state];
                            const Icon = stateInfo.icon;
                            const isActive = index <= currentStep;
                            const isCurrent = index === currentStep;

                            return (
                                <div key={state} className="flex items-start mb-6 last:mb-0">
                                    {/* Icon */}
                                    <div className={`
                                        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                                        ${isActive ? stateInfo.bgColor : 'bg-gray-100'}
                                        ${isCurrent ? 'ring-4 ring-offset-2 ' + stateInfo.bgColor : ''}
                                        transition-all duration-300
                                    `}>
                                        <Icon className={`text-xl ${isActive ? stateInfo.color : 'text-gray-400'}`} />
                                    </div>

                                    {/* Label */}
                                    <div className="ml-4 flex-1">
                                        <p className={`font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                                            {stateInfo.label}
                                        </p>
                                        {isCurrent && !isCompleted && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                {state === 'ready'
                                                    ? 'Tu pedido te está esperando'
                                                    : 'En progreso...'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Check mark for completed steps */}
                                    {isActive && index < currentStep && (
                                        <MdCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                                    )}
                                </div>
                            );
                        })}

                        {/* Connecting line */}
                        <div className="absolute left-5 top-10 bottom-10 w-0.5 bg-gray-200 -translate-x-1/2"></div>
                        <div
                            className="absolute left-5 top-10 w-0.5 bg-green-400 -translate-x-1/2 transition-all duration-500"
                            style={{ height: `${Math.max(0, (currentStep / (STATE_ORDER.length - 1)) * 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Tu Pedido</h2>

                    <div className="space-y-3">
                        {order?.items?.map((item, index) => (
                            <div key={index} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">
                                        {item.quantity}x {item.name}
                                    </p>
                                    {item.customizations?.length > 0 && (
                                        <div className="text-sm text-gray-500 mt-1">
                                            {item.customizations.map((c, i) => {
                                                const sels = (c.selections && c.selections.length > 0) ? c.selections : (c.selected ? [c.selected] : []);
                                                return sels.length > 0 ? (
                                                    <p key={i}>{c.groupName}: {sels.join(', ')}</p>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </div>
                                <p className="text-gray-600 font-medium">
                                    ${(item.price * item.quantity).toLocaleString('es-AR')}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>Total</span>
                            <span className="text-green-600">${order?.total?.toLocaleString('es-AR')}</span>
                        </div>
                    </div>

                    {order?.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500">Notas:</p>
                            <p className="text-gray-700">{order.notes}</p>
                        </div>
                    )}
                </div>

                {/* Customer Info */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Datos de Contacto</h2>
                    <div className="space-y-2 text-gray-600">
                        <p><span className="font-medium">Nombre:</span> {order?.customer?.name} {order?.customer?.lastname}</p>
                        <p><span className="font-medium">Teléfono:</span> {order?.customer?.phone}</p>
                        {order?.customer?.email && (
                            <p><span className="font-medium">Email:</span> {order?.customer?.email}</p>
                        )}
                        <p><span className="font-medium">Método:</span> {order?.deliveryMethod}</p>
                    </div>
                </div>
            </div>

            {/* Pickup Button - Fixed at bottom */}
            {isReady && !order?.customerPickupConfirmed && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
                    <div className="max-w-lg mx-auto">
                        <button
                            onClick={() => setShowPickupModal(true)}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-lg animate-bounce"
                        >
                            YA RETIRÉ MI PEDIDO
                        </button>
                    </div>
                </div>
            )}

            {/* Cancellation Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">
                            Cancelar Pedido
                        </h3>
                        <p className="text-gray-600 mb-4">
                            ¿Estás seguro de que deseas cancelar tu pedido <strong>#{order?.orderNumber?.replace('ORD-', '')}</strong>?
                        </p>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-red-800 font-medium">
                                ⚠️ Esta acción iniciará un proceso de reembolso
                            </p>
                            <p className="text-xs text-red-700 mt-1">
                                El reembolso será procesado en 24-48 horas y el dinero se reflejará en tu cuenta en 10-30 días hábiles.
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Razón de cancelación (opcional)
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                rows="3"
                                placeholder="Ejemplo: Cambié de opinión, Error en el pedido, etc."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setCancelReason('');
                                }}
                                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                                disabled={cancelling}
                            >
                                No, mantener pedido
                            </button>
                            <button
                                onClick={handleCancelOrder}
                                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
                                disabled={cancelling}
                            >
                                {cancelling ? 'Cancelando...' : 'Sí, cancelar pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pickup Confirmation Modal */}
            {showPickupModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            Confirmar Retiro
                        </h3>
                        <p className="text-gray-600 mb-6">
                            ¿Ya retiraste tu pedido <strong>#{order?.orderNumber?.replace('ORD-', '')}</strong> en caja?
                        </p>
                        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-6">
                            Esta acción no se puede deshacer. Solo confirma si ya tienes tu pedido en mano.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPickupModal(false)}
                                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                                disabled={confirmingPickup}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmPickup}
                                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                                disabled={confirmingPickup}
                            >
                                {confirmingPickup ? 'Confirmando...' : 'Sí, ya lo retiré'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Completed Message */}
            {isCompleted && (
                <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4">
                    <div className="max-w-lg mx-auto text-center">
                        <p className="font-medium">Pedido completado. ¡Gracias por tu compra!</p>
                        <button
                            onClick={() => {
                                clearActiveOrder();
                                router.push(`/menu/${order.location?.locationId || 'harrods'}`);
                            }}
                            className="mt-2 underline text-sm"
                        >
                            Volver al menú
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
