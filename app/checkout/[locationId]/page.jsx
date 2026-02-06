'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useCartStore from '@/store/cartStore';
import useActiveOrderStore from '@/store/activeOrderStore';
import useCustomerPersistence from '@/hooks/useCustomerPersistence';
import API_URI from '@/utils/getApiUri';
import axios from 'axios';
import { MdArrowBack, MdPayment, MdAdd, MdRemove, MdDelete, MdShoppingBag, MdPerson } from 'react-icons/md';

const CheckoutPage = () => {
    const { locationId } = useParams();
    const router = useRouter();
    const { items, getCartTotal, clearCart, addItem, removeItem, deleteItem } = useCartStore();
    const { activeOrder, hasActiveOrder, setActiveOrder } = useActiveOrderStore();

    const locationItems = items.filter(i => i.locationId === locationId);
    const total = getCartTotal(locationId);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        lastname: '',
        phone: '',
        email: '',
        deliveryMethod: 'Retiro en Sucursal',
        notes: ''
    });
    const [rememberData, setRememberData] = useState(false);
    const { savedData, hasSavedData, isLoaded, saveCustomerData } = useCustomerPersistence();

    // Prellenar formulario con datos guardados
    useEffect(() => {
        if (isLoaded && savedData) {
            setFormData(prev => ({
                ...prev,
                name: savedData.name || prev.name,
                lastname: savedData.lastname || prev.lastname,
                phone: savedData.phone || prev.phone,
                email: savedData.email || prev.email
            }));
            setRememberData(true); // Mantener checkbox marcado si ya había datos
        }
    }, [isLoaded, savedData]);

    // Bloquear si hay un pedido activo pendiente de retiro
    if (hasActiveOrder() && activeOrder?.orderNumber) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MdShoppingBag className="text-amber-600 text-3xl" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Ya tienes un pedido en curso</h2>
                    <p className="text-gray-600 mb-6">
                        Debes retirar tu pedido <strong>#{activeOrder.orderNumber?.replace('ORD-', '')}</strong> antes de realizar una nueva compra.
                    </p>
                    <button
                        onClick={() => router.push(`/tracking/${activeOrder.orderNumber}`)}
                        className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition"
                    >
                        Ver mi pedido
                    </button>
                    <button
                        onClick={() => router.push(`/menu/${locationId}`)}
                        className="w-full mt-3 text-gray-500 py-2"
                    >
                        Volver al menú
                    </button>
                </div>
            </div>
        );
    }

    if (locationItems.length === 0 && !submitting) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h2 className="text-xl font-bold mb-4">Tu carrito está vacío</h2>
                <button
                    onClick={() => router.push(`/menu/${locationId}`)}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg"
                >
                    Volver al menú
                </button>
            </div>
        );
    }

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Preparar los items para el pedido
            const orderItems = locationItems.map(item => ({
                itemId: item._id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                customizations: item.selectedCustomizations || []
            }));

            // Datos del cliente (se guardarán en metadata)
            const customerData = {
                name: formData.name,
                lastname: formData.lastname,
                phone: formData.phone,
                email: formData.email,
                deliveryMethod: formData.deliveryMethod,
                notes: formData.notes
            };

            // Crear preferencia de MercadoPago
            const response = await axios.post(`${API_URI}/api/payments/create-preference`, {
                items: orderItems,
                customerData,
                total,
                locationId
            });

            // Redirigir a MercadoPago
            if (response.data.init_point) {
                // Guardar el pedido en el store ANTES de redirigir
                setActiveOrder({
                    orderNumber: null, // Aún no lo tenemos
                    orderId: null,
                    paymentId: null,
                    preferenceId: response.data.preference_id || null,
                    locationId,
                    status: 'pending_payment',
                    customerData: {
                        name: customerData.name,
                        lastname: customerData.lastname,
                        phone: customerData.phone,
                        email: customerData.email
                    },
                    items: orderItems,
                    total,
                    deliveryMethod: customerData.deliveryMethod,
                    notes: customerData.notes,
                    createdAt: new Date().toISOString()
                });

                // Guardar datos del cliente si el usuario optó por recordarlos
                if (rememberData) {
                    saveCustomerData({
                        name: formData.name,
                        lastname: formData.lastname,
                        phone: formData.phone,
                        email: formData.email
                    });
                }

                clearCart(locationId);
                window.location.href = response.data.init_point;
            } else {
                throw new Error('No se recibió URL de pago');
            }
        } catch (err) {
            console.error('Error creating payment:', err);
            setError('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.');
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white px-4 py-4 border-b sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => router.back()} className="text-gray-600">
                    <MdArrowBack size={24} />
                </button>
                <h1 className="text-lg font-bold">Finalizar Pedido</h1>
            </header>

            <main className="max-w-xl mx-auto p-4 md:mt-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
                        {error}
                    </div>
                )}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="font-bold text-gray-900 mb-4 border-b pb-2">Resumen de tu pedido</h2>
                    <div className="space-y-4">
                        {locationItems.map((item) => (
                            <div key={item.cartLineId || item._id} className="flex flex-col gap-2 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800">{item.name}</h3>
                                        {item.selectedCustomizations?.length > 0 && (
                                            <div className="mt-0.5">
                                                {item.selectedCustomizations.map((c, idx) => (
                                                    <p key={idx} className="text-xs text-indigo-600 font-medium">
                                                        {c.groupName}: {c.selected}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-500">${item.price.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-gray-900">${(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item._id, locationId, item.cartLineId || null)}
                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-orange-600 active:scale-95 transition-all"
                                        >
                                            <MdRemove size={18} />
                                        </button>
                                        <span className="font-black text-lg min-w-[20px] text-center">{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => addItem(item, locationId, item.selectedCustomizations || [])}
                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-orange-600 active:scale-95 transition-all"
                                        >
                                            <MdAdd size={18} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => deleteItem(item._id, locationId, item.cartLineId || null)}
                                        className="text-red-400 p-2 hover:text-red-600 transition-colors"
                                        title="Eliminar item"
                                    >
                                        <MdDelete size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="pt-4 mt-4 border-t flex justify-between items-center text-xl font-black">
                            <span>Total</span>
                            <span className="text-orange-600">${total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmitOrder} className="space-y-6">
                    {/* Mensaje de bienvenida cuando hay datos guardados */}
                    {isLoaded && hasSavedData && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <MdPerson className="text-green-600 text-xl" />
                            </div>
                            <div>
                                <p className="text-green-800 font-medium">
                                    ¡Bienvenido de nuevo{savedData?.name ? `, ${savedData.name}` : ''}!
                                </p>
                                <p className="text-green-600 text-sm">
                                    Tus datos se recordaron de tu compra anterior.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h2 className="font-bold text-gray-900 mb-4 border-b pb-2">Tus Datos</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                                <input
                                    type="text" required
                                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apellido (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500"
                                    value={formData.lastname}
                                    onChange={e => setFormData({ ...formData, lastname: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono / WhatsApp</label>
                                <input
                                    type="tel" required
                                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (opcional)</label>
                                <input
                                    type="email"
                                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {/* Checkbox para recordar datos */}
                            <div className="col-span-2 mt-2">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={rememberData}
                                        onChange={e => setRememberData(e.target.checked)}
                                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                                        Recordar mis datos para próximas compras en este dispositivo
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h2 className="font-bold text-gray-900 mb-4 border-b pb-2">Método de Entrega</h2>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, deliveryMethod: 'Retiro en Sucursal' })}
                                className={`flex-1 py-4 border-2 rounded-xl text-sm font-bold transition-all ${formData.deliveryMethod === 'Retiro en Sucursal'
                                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                                    : 'border-gray-100 text-gray-500'
                                    }`}
                            >
                                Retiro en Local
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, deliveryMethod: 'A domicilio' })}
                                className={`flex-1 py-4 border-2 rounded-xl text-sm font-bold transition-all ${formData.deliveryMethod === 'A domicilio'
                                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                                    : 'border-gray-100 text-gray-500'
                                    }`}
                            >
                                Delivery
                            </button>
                        </div>
                        {formData.deliveryMethod === 'A domicilio' && (
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección de Entrega</label>
                                <textarea
                                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500"
                                    placeholder="Calle, número, departamento..."
                                />
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas del Pedido</label>
                            <textarea
                                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500"
                                placeholder="¿Algo que debamos saber? (Ej: sin cebolla)"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#009ee3] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:bg-[#007eb5] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                                Redirigiendo a MercadoPago...
                            </>
                        ) : (
                            <>
                                <MdPayment size={24} />
                                Pagar con MercadoPago
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default CheckoutPage;
