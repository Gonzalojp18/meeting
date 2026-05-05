'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useCartStore from '@/store/cartStore';
import useActiveOrderStore from '@/store/activeOrderStore';
import useCustomerPersistence from '@/hooks/useCustomerPersistence';
import UpsellingBanner from '@/components/upselling/UpsellingBanner';
import API_URI from '@/utils/getApiUri';
import axios from 'axios';
import { MdArrowBack, MdPayment, MdAdd, MdRemove, MdDelete, MdShoppingBag, MdClose, MdStorefront } from 'react-icons/md';

// ===================== MODAL COMPONENT =====================
const LegalModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Cerrar"
                    >
                        <MdClose size={20} />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto max-h-[60vh] text-sm text-gray-600 leading-relaxed">
                    {children}
                </div>
                <div className="p-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===================== FLOATING INPUT =====================
const FloatingInput = ({ label, id, type = 'text', required = false, value, onChange, placeholder, ...props }) => {
    return (
        <div className="relative">
            <input
                type={type}
                id={id}
                name={id}
                required={required}
                value={value}
                onChange={onChange}
                placeholder=" "
                className="peer w-full px-4 pt-5 pb-2 bg-gray-50 border border-gray-200 rounded-xl 
                         text-gray-900 placeholder-transparent
                         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                         transition-[border-color,box-shadow] duration-150"
                {...props}
            />
            <label
                htmlFor={id}
                className="absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400
                         peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
                         peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case
                         peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase
                         peer-focus:text-orange-600
                         transition-[top,color,font-size,transform] duration-150 pointer-events-none"
            >
                {label}{required && ' *'}
            </label>
        </div>
    );
};

// ===================== MAIN COMPONENT =====================
const CheckoutPage = () => {
    const { locationId } = useParams();
    const router = useRouter();
    const { items, getCartTotal, clearCart, addItem, removeItem, deleteItem, replaceItem } = useCartStore();
    const { activeOrder, hasActiveOrder, setActiveOrder } = useActiveOrderStore();

    const searchParams = useSearchParams();
    const menuType = searchParams?.get('type') || 'standard';

    const locationItems = items.filter(i => i.locationId === locationId);
    const rawTotal = getCartTotal(locationId);

    const [activeQrPromo, setActiveQrPromo] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [finalTotal, setFinalTotal] = useState(rawTotal);

    useEffect(() => {
        const stored = sessionStorage.getItem('active-qr-promo');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.locationId === locationId && parsed.discountPercentage > 0) {
                    setActiveQrPromo(parsed);
                    const discount = Math.round(rawTotal * parsed.discountPercentage / 100);
                    setDiscountAmount(discount);
                    setFinalTotal(rawTotal - discount);
                }
            } catch (e) {
                console.error('Error parsing QR promo:', e);
            }
        } else {
            setFinalTotal(rawTotal);
        }
    }, [locationId, rawTotal]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        lastname: '',
        phone: '',
        email: '',
        deliveryMethod: 'Retiro en Sucursal', // Fixed value - only pickup available
        notes: ''
    });
    const [rememberData, setRememberData] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
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
            setRememberData(true);
        }
    }, [isLoaded, savedData]);

    // Bloquear si hay un pedido activo pendiente de retiro
    if (hasActiveOrder() && activeOrder?.orderNumber) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <MdShoppingBag className="text-amber-600 text-3xl" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Pedido en curso</h2>
                    <p className="text-gray-500 mb-6">
                        Retira tu pedido <span className="font-semibold text-gray-900">#{activeOrder.orderNumber?.replace('ORD-', '')}</span> antes de realizar una nueva compra.
                    </p>
                    <button
                        onClick={() => router.push(`/tracking/${activeOrder.orderNumber}`)}
                        className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-all"
                    >
                        Ver mi pedido
                    </button>
                    <button
                        onClick={() => router.push(`/menu/${locationId}?mode=takeaway`)}
                        className="w-full mt-3 text-gray-400 py-2 hover:text-gray-600 transition-colors"
                    >
                        Volver al menú
                    </button>
                </div>
            </div>
        );
    }

    if (locationItems.length === 0 && !submitting) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MdShoppingBag className="text-gray-400 text-4xl" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h2>
                    <p className="text-gray-500 mb-6">Agrega productos para continuar</p>
                    <button
                        onClick={() => router.push(`/menu/${locationId}?mode=takeaway`)}
                        className="bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-all"
                    >
                        Ver menú
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const orderItems = locationItems.map(item => ({
                itemId: item._id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                customizations: item.selectedCustomizations || [],
                ...(item.origin && { origin: item.origin }),
                ...(item.upsellId && { upsellId: item.upsellId }),
            }));

            const customerData = {
                name: formData.name,
                lastname: formData.lastname,
                phone: formData.phone,
                email: formData.email,
                deliveryMethod: 'Retiro en Sucursal', // Always pickup
                notes: formData.notes
            };

            const response = await axios.post(`${API_URI}/api/payments/create-preference`, {
                items: orderItems,
                customerData,
                total: finalTotal,
                locationId,
                menuType,
                ...(activeQrPromo && {
                    qrPromoDiscount: activeQrPromo.discountPercentage,
                    qrPromoSource: activeQrPromo.source,
                    qrPromoDiscountAmount: discountAmount,
                }),
            });

            if (response.data.init_point) {
                setActiveOrder({
                    // Usar los valores retornados por el servidor (create-preference ya creó la orden en DB)
                    orderNumber: response.data.orderNumber || null,
                    orderId: response.data.orderId || null,
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
                    total: finalTotal,
                    deliveryMethod: customerData.deliveryMethod,
                    notes: customerData.notes,
                    createdAt: new Date().toISOString()
                });

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
            // Extraer el detalle del error del servidor para mostrarlo en pantalla
            const serverData = err.response?.data;
            const errorMsg = serverData?.detail || serverData?.error || err.message || 'Error desconocido';
            console.error('CREATE PREFERENCE ERROR →', { status: err.response?.status, serverData });
            setError(`Error: ${errorMsg}`);
            setSubmitting(false);
        }
    };

    const updateFormField = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    return (
        <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg px-4 py-4 border-b border-gray-100">
                <div className="max-w-lg mx-auto flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
                        aria-label="Volver"
                    >
                        <MdArrowBack size={22} className="text-gray-700" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto p-4 pb-8">
                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Welcome Back Message */}
                {isLoaded && hasSavedData && (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-4 mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">👋</span>
                        </div>
                        <p className="text-emerald-700 text-sm">
                            ¡Hola de nuevo{savedData?.name ? `, ${savedData.name}` : ''}! Tus datos están guardados.
                        </p>
                    </div>
                )}

                {/* Order Summary - Compact */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Tu pedido</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {locationItems.map((item) => (
                            <div key={item.cartLineId || item._id} className="p-4">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                                        {item.selectedCustomizations?.length > 0 && (
                                            <p className="text-xs text-orange-600 mt-0.5">
                                                {item.selectedCustomizations.map(c => {
                                                    const sels = (c.selections && c.selections.length > 0) ? c.selections : (c.selected ? [c.selected] : []);
                                                    return sels.join(', ');
                                                }).join(' | ')}
                                            </p>
                                        )}
                                    </div>
                                    <p className="font-bold text-gray-900 whitespace-nowrap">
                                        ${(item.price * item.quantity).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item._id, locationId, item.cartLineId || null)}
                                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                                            aria-label="Reducir cantidad"
                                        >
                                            <MdRemove size={16} />
                                        </button>
                                        <span className="font-bold text-gray-900 w-6 text-center">{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => addItem(item, locationId, item.selectedCustomizations || [])}
                                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                                            aria-label="Aumentar cantidad"
                                        >
                                            <MdAdd size={16} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => deleteItem(item._id, locationId, item.cartLineId || null)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        aria-label="Eliminar producto"
                                    >
                                        <MdDelete size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {activeQrPromo && (
                        <div className="p-4 bg-green-50 border-t border-green-100 flex justify-between items-center">
                            <span className="font-semibold text-green-700">Descuento QR ({activeQrPromo.discountPercentage}%)</span>
                            <span className="font-bold text-green-700">-${discountAmount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="p-4 bg-gray-50 flex justify-between items-center">
                        <span className="font-semibold text-gray-600">Total a pagar</span>
                        <span className="text-xl font-bold text-gray-900">${finalTotal.toLocaleString()}</span>
                    </div>
                </div>

                {/* Upselling Suggestions */}
                {locationItems.length > 0 && (
                    <div className="mb-4">
                        <UpsellingBanner
                            cartItems={locationItems.map(item => ({
                                itemId: item._id,
                                itemName: item.name,
                                categoryId: item.categoryId,
                                quantity: item.quantity
                            }))}
                            locationId={locationId}
                            displayLocation="checkout"
                            onAddToCart={(suggestedItem) => {
                                addItem({
                                    _id: suggestedItem.itemId,
                                    name: suggestedItem.name,
                                    price: suggestedItem.price,
                                    origin: suggestedItem.origin,
                                    upsellId: suggestedItem.upsellId,
                                }, locationId, []);
                            }}
                            onReplaceInCart={(triggerItemId, suggestedItem) => {
                                replaceItem(triggerItemId, {
                                    _id: suggestedItem.itemId,
                                    name: suggestedItem.name,
                                    price: suggestedItem.price,
                                    origin: suggestedItem.origin,
                                    upsellId: suggestedItem.upsellId,
                                }, locationId);
                            }}
                            variant="banner"
                        />
                    </div>
                )}

                {/* Pickup Only Badge */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MdStorefront className="text-orange-600" size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-orange-900">Retiro en local</p>
                        <p className="text-xs text-orange-600">Te avisamos cuando tu pedido esté listo</p>
                    </div>
                </div>

                {/* Customer Form */}
                <form onSubmit={handleSubmitOrder}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-4">Tus datos</h2>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <FloatingInput
                                    label="Nombre"
                                    id="name"
                                    required
                                    value={formData.name}
                                    onChange={updateFormField('name')}
                                />
                                <FloatingInput
                                    label="Apellido"
                                    id="lastname"
                                    value={formData.lastname}
                                    onChange={updateFormField('lastname')}
                                />
                            </div>

                            <FloatingInput
                                label="Teléfono / WhatsApp"
                                id="phone"
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={updateFormField('phone')}
                            />

                            <FloatingInput
                                label="Email"
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={updateFormField('email')}
                            />

                            <div className="relative">
                                <textarea
                                    id="notes"
                                    rows={2}
                                    value={formData.notes}
                                    onChange={updateFormField('notes')}
                                    placeholder="Notas adicionales (ej: sin cebolla)"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl 
                                             text-gray-900 placeholder-gray-400 text-sm resize-none
                                             focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                                             transition-all duration-200"
                                />
                            </div>

                            {/* Remember checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer group py-1">
                                <input
                                    type="checkbox"
                                    checked={rememberData}
                                    onChange={e => setRememberData(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                                    Recordar mis datos
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#009ee3] text-white py-4 rounded-2xl font-bold text-base 
                                 shadow-lg shadow-blue-200/50 
                                 hover:bg-[#007eb5] active:scale-[0.98] transition-all 
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-3"
                    >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <MdPayment size={22} />
                                Pagar ${finalTotal.toLocaleString()}
                            </>
                        )}
                    </button>

                    {/* Legal Links */}
                    <div className="flex justify-center gap-4 mt-4 text-xs">
                        <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                        >
                            Términos y Condiciones
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                            type="button"
                            onClick={() => setShowPrivacyModal(true)}
                            className="text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                        >
                            Políticas de Privacidad
                        </button>
                    </div>
                </form>
            </main>

            {/* Terms Modal */}
            <LegalModal
                isOpen={showTermsModal}
                onClose={() => setShowTermsModal(false)}
                title="Términos y Condiciones"
            >
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">1. Aceptación de Términos</h4>
                    <p>Al realizar un pedido a través de nuestra plataforma, aceptas estos términos y condiciones en su totalidad. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestro servicio.</p>

                    <h4 className="font-semibold text-gray-900">2. Pedidos y Pagos</h4>
                    <p>Todos los pedidos están sujetos a disponibilidad. Los precios mostrados incluyen IVA. El pago se realiza a través de MercadoPago, una plataforma segura de procesamiento de pagos.</p>

                    <h4 className="font-semibold text-gray-900">3. Retiro del Pedido</h4>
                    <p>Los pedidos deben ser retirados en el local dentro del horario de atención. Recibirás una notificación cuando tu pedido esté listo para ser retirado.</p>

                    <h4 className="font-semibold text-gray-900">4. Cancelaciones y Reembolsos</h4>
                    <p>Las cancelaciones deben solicitarse antes de que el pedido entre en preparación. Los reembolsos se procesarán a través del mismo medio de pago utilizado.</p>

                    <h4 className="font-semibold text-gray-900">5. Modificaciones</h4>
                    <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación.</p>

                    <p className="text-gray-400 text-xs mt-6">Última actualización: Febrero 2026</p>
                </div>
            </LegalModal>

            {/* Privacy Modal */}
            <LegalModal
                isOpen={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
                title="Políticas de Privacidad"
            >
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Información que Recopilamos</h4>
                    <p>Recopilamos la información que nos proporcionas al realizar un pedido: nombre, teléfono, email y dirección de entrega cuando corresponda.</p>

                    <h4 className="font-semibold text-gray-900">Uso de la Información</h4>
                    <p>Utilizamos tu información únicamente para procesar tus pedidos, comunicarnos contigo sobre el estado de tu orden y mejorar nuestros servicios.</p>

                    <h4 className="font-semibold text-gray-900">Almacenamiento de Datos</h4>
                    <p>Si eliges la opción &quot;Recordar mis datos&quot;, tu información se almacena localmente en tu dispositivo para facilitar futuras compras. No compartimos tus datos con terceros.</p>

                    <h4 className="font-semibold text-gray-900">Procesamiento de Pagos</h4>
                    <p>Los pagos se procesan a través de MercadoPago. No almacenamos información de tarjetas de crédito ni datos bancarios en nuestros servidores.</p>

                    <h4 className="font-semibold text-gray-900">Tus Derechos</h4>
                    <p>Tienes derecho a acceder, rectificar o eliminar tus datos personales. Para ejercer estos derechos, contáctanos directamente.</p>

                    <h4 className="font-semibold text-gray-900">Contacto</h4>
                    <p>Si tienes preguntas sobre nuestra política de privacidad, puedes contactarnos a través de nuestras redes sociales o directamente en el local.</p>

                    <p className="text-gray-400 text-xs mt-6">Última actualización: Febrero 2026</p>
                </div>
            </LegalModal>
        </div>
    );
};

export default CheckoutPage;
