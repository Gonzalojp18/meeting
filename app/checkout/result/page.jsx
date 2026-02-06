'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { MdCheckCircle, MdError, MdAccessTime, MdHome } from 'react-icons/md';
import { Suspense, useEffect, useState, useCallback } from 'react';
import useActiveOrderStore from '@/store/activeOrderStore';
import API_URI from '@/utils/getApiUri';

const ResultContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { activeOrder, setOrderDetails, updateStatus, clearActiveOrder, setPaymentId } = useActiveOrderStore();

    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');
    const externalReference = searchParams.get('external_reference');

    const [isPolling, setIsPolling] = useState(false);
    const [pollAttempts, setPollAttempts] = useState(0);
    const [orderFound, setOrderFound] = useState(false);

    // Obtener locationId del external_reference si está disponible
    let locationId = activeOrder?.locationId || 'harrods'; // Priorizar el del store
    try {
        if (externalReference && !activeOrder?.locationId) {
            const data = JSON.parse(decodeURIComponent(externalReference));
            locationId = data.location?.locationId || 'harrods';
        }
    } catch (e) {
        console.log('Could not parse external_reference');
    }

    // Polling para obtener el orderNumber cuando el pago es exitoso
    const checkOrderExists = useCallback(async () => {
        if (!paymentId) return false;

        try {
            const res = await fetch(`${API_URI}/api/orders/by-payment/${paymentId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.orderNumber) {
                    // Actualizar el store con los datos de la orden
                    setOrderDetails(data.orderNumber, data.orderId, paymentId);
                    updateStatus(data.status || 'confirmed');
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.error('Error checking order:', err);
            return false;
        }
    }, [paymentId, setOrderDetails, updateStatus]);

    useEffect(() => {
        // Solo hacer polling si el pago fue exitoso
        if (status !== 'success' || !paymentId) {
            // Si el pago falló, limpiar el store
            if (status === 'failure') {
                clearActiveOrder();
            }
            return;
        }

        // Guardar el paymentId en el store
        if (paymentId && activeOrder && !activeOrder.paymentId) {
            setPaymentId(paymentId);
            updateStatus('payment_completed');
        }

        setIsPolling(true);

        const pollForOrder = async () => {
            const found = await checkOrderExists();
            if (found) {
                setOrderFound(true);
                setIsPolling(false);
                // Redirigir al tracking
                const orderNum = useActiveOrderStore.getState().activeOrder?.orderNumber;
                if (orderNum) {
                    router.push(`/tracking/${orderNum}`);
                }
            } else {
                setPollAttempts(prev => prev + 1);
            }
        };

        // Intentar inmediatamente
        pollForOrder();

        // Polling cada 2 segundos, máximo 30 intentos (1 minuto)
        const interval = setInterval(() => {
            if (pollAttempts >= 30) {
                setIsPolling(false);
                clearInterval(interval);
                return;
            }
            pollForOrder();
        }, 2000);

        return () => clearInterval(interval);
    }, [status, paymentId, checkOrderExists, router, activeOrder, setPaymentId, updateStatus, clearActiveOrder, pollAttempts]);

    const statusConfig = {
        success: {
            icon: MdCheckCircle,
            iconColor: 'text-green-500',
            bgColor: 'bg-green-50',
            title: '¡Pago Exitoso!',
            message: isPolling
                ? 'Procesando tu pedido, espera un momento...'
                : 'Tu pedido ha sido procesado correctamente.',
            buttonText: 'Ver mi Pedido',
            buttonColor: 'bg-green-600 hover:bg-green-700'
        },
        failure: {
            icon: MdError,
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50',
            title: 'Pago Rechazado',
            message: 'No pudimos procesar tu pago. Por favor, intenta nuevamente o usa otro método de pago.',
            buttonText: 'Intentar de Nuevo',
            buttonColor: 'bg-red-600 hover:bg-red-700'
        },
        pending: {
            icon: MdAccessTime,
            iconColor: 'text-yellow-500',
            bgColor: 'bg-yellow-50',
            title: 'Pago Pendiente',
            message: 'Tu pago está siendo procesado. Te notificaremos cuando sea confirmado.',
            buttonText: 'Volver al Menú',
            buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        }
    };

    const config = statusConfig[status] || statusConfig.failure;
    const Icon = config.icon;

    const handleMainButtonClick = () => {
        if (status === 'success') {
            const orderNum = activeOrder?.orderNumber;
            if (orderNum) {
                router.push(`/tracking/${orderNum}`);
            } else {
                router.push(`/menu/${locationId}`);
            }
        } else {
            router.push(`/menu/${locationId}`);
        }
    };

    return (
        <div className={`min-h-screen ${config.bgColor} flex flex-col items-center justify-center p-6`}>
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                {isPolling ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-6"></div>
                ) : (
                    <Icon size={80} className={`${config.iconColor} mx-auto mb-6`} />
                )}

                <h1 className="text-2xl font-black text-gray-900 mb-3">
                    {config.title}
                </h1>

                <p className="text-gray-600 mb-6">
                    {config.message}
                </p>

                {paymentId && status === 'success' && !isPolling && (
                    <div className="bg-gray-100 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-500">ID de Pago</p>
                        <p className="font-mono font-bold text-gray-900">{paymentId}</p>
                    </div>
                )}

                {isPolling && (
                    <div className="bg-blue-50 rounded-xl p-4 mb-6">
                        <p className="text-sm text-blue-600">Confirmando tu pedido...</p>
                        <p className="text-xs text-blue-400 mt-1">Intento {pollAttempts + 1}</p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleMainButtonClick}
                        disabled={isPolling}
                        className={`w-full ${config.buttonColor} text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                        <MdHome size={20} />
                        {isPolling ? 'Procesando...' : config.buttonText}
                    </button>

                    {status === 'failure' && (
                        <button
                            onClick={() => router.back()}
                            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-all"
                        >
                            Volver al Checkout
                        </button>
                    )}

                    {status === 'success' && !isPolling && !activeOrder?.orderNumber && (
                        <button
                            onClick={() => router.push(`/menu/${locationId}`)}
                            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-all"
                        >
                            Volver al Menú
                        </button>
                    )}
                </div>
            </div>

            <p className="mt-8 text-sm text-gray-500">
                ¿Tienes problemas? Contáctanos por WhatsApp
            </p>
        </div>
    );
};

const CheckoutResultPage = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        }>
            <ResultContent />
        </Suspense>
    );
};

export default CheckoutResultPage;
