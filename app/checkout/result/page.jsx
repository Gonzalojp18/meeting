'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { MdCheckCircle, MdError, MdAccessTime, MdHome } from 'react-icons/md';
import { Suspense } from 'react';

const ResultContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');
    const externalReference = searchParams.get('external_reference');

    // Obtener locationId del external_reference si está disponible
    let locationId = 'harrods'; // default
    try {
        if (externalReference) {
            const data = JSON.parse(decodeURIComponent(externalReference));
            locationId = data.location?.locationId || 'harrods';
        }
    } catch (e) {
        console.log('Could not parse external_reference');
    }

    const statusConfig = {
        success: {
            icon: MdCheckCircle,
            iconColor: 'text-green-500',
            bgColor: 'bg-green-50',
            title: '¡Pago Exitoso!',
            message: 'Tu pedido ha sido procesado correctamente. En breve comenzaremos a prepararlo.',
            buttonText: 'Volver al Menú',
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

    return (
        <div className={`min-h-screen ${config.bgColor} flex flex-col items-center justify-center p-6`}>
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                <Icon size={80} className={`${config.iconColor} mx-auto mb-6`} />

                <h1 className="text-2xl font-black text-gray-900 mb-3">
                    {config.title}
                </h1>

                <p className="text-gray-600 mb-6">
                    {config.message}
                </p>

                {paymentId && status === 'success' && (
                    <div className="bg-gray-100 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-500">ID de Pago</p>
                        <p className="font-mono font-bold text-gray-900">{paymentId}</p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => router.push(`/menu/${locationId}`)}
                        className={`w-full ${config.buttonColor} text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2`}
                    >
                        <MdHome size={20} />
                        {config.buttonText}
                    </button>

                    {status === 'failure' && (
                        <button
                            onClick={() => router.back()}
                            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-all"
                        >
                            Volver al Checkout
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
