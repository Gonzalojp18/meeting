'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useCartStore from '@/store/cartStore';
import API_URI from '@/utils/getApiUri';
import axios from 'axios';
import { MdArrowBack, MdPayment, MdAdd, MdRemove, MdDelete } from 'react-icons/md';

const CheckoutPage = () => {
    const { locationId } = useParams();
    const router = useRouter();
    const { items, getCartTotal, clearCart, addItem, removeItem, deleteItem } = useCartStore();

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

    if (locationItems.length === 0) {
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
                price: item.price
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

            // Limpiar carrito antes de redirigir
            clearCart(locationId);

            // Redirigir a MercadoPago
            if (response.data.init_point) {
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
                            <div key={item._id} className="flex flex-col gap-2 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800">{item.name}</h3>
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
                                            onClick={() => removeItem(item._id, locationId)}
                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-orange-600 active:scale-95 transition-all"
                                        >
                                            <MdRemove size={18} />
                                        </button>
                                        <span className="font-black text-lg min-w-[20px] text-center">{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => addItem(item, locationId)}
                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-orange-600 active:scale-95 transition-all"
                                        >
                                            <MdAdd size={18} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => deleteItem(item._id, locationId)}
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
