import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Tiempo de expiración: 24 horas en milisegundos
const ORDER_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// Helper para verificar si una orden está expirada
const isOrderExpired = (createdAt) => {
    if (!createdAt) return true;
    const orderTime = new Date(createdAt).getTime();
    const now = Date.now();
    return (now - orderTime) > ORDER_EXPIRATION_MS;
};

const useActiveOrderStore = create(
    persist(
        (set, get) => ({
            activeOrder: null,
            // Estructura de activeOrder:
            // {
            //   orderNumber: string | null,
            //   orderId: string | null,
            //   paymentId: string | null,
            //   preferenceId: string | null,
            //   locationId: string,
            //   status: 'pending_payment' | 'payment_completed' | 'confirmed' | 'preparing' | 'ready' | 'picked_up',
            //   customerData: { name, lastname, phone, email },
            //   items: [],
            //   total: number,
            //   createdAt: string (ISO date)
            // }

            setActiveOrder: (order) => {
                // Agregar timestamp si no existe
                const orderWithTimestamp = {
                    ...order,
                    createdAt: order.createdAt || new Date().toISOString()
                };
                set({ activeOrder: orderWithTimestamp });
            },

            updateStatus: (newStatus) => {
                set((state) => {
                    if (!state.activeOrder) return state;
                    return {
                        activeOrder: {
                            ...state.activeOrder,
                            status: newStatus
                        }
                    };
                });
            },

            setOrderDetails: (orderNumber, orderId, paymentId = null) => {
                set((state) => {
                    // Si no hay una orden activa, la creamos con los datos mínimos.
                    // Esto puede ocurrir si el store fue vaciado durante la navegación a MP.
                    const existing = state.activeOrder || {};
                    return {
                        activeOrder: {
                            ...existing,
                            orderNumber,
                            orderId,
                            createdAt: existing.createdAt || new Date().toISOString(),
                            status: existing.status || 'confirmed',
                            ...(paymentId && { paymentId })
                        }
                    };
                });
            },

            setPaymentId: (paymentId) => {
                set((state) => {
                    if (!state.activeOrder) return state;
                    return {
                        activeOrder: {
                            ...state.activeOrder,
                            paymentId
                        }
                    };
                });
            },

            clearActiveOrder: () => {
                set({ activeOrder: null });
            },

            // Limpiar órdenes expiradas automáticamente
            cleanupExpiredOrder: () => {
                const order = get().activeOrder;
                if (order && isOrderExpired(order.createdAt)) {
                    console.log('[activeOrderStore] Limpiando orden expirada:', order.orderNumber);
                    set({ activeOrder: null });
                }
            },

            hasActiveOrder: () => {
                const order = get().activeOrder;
                if (!order) return false;

                // Verificar si la orden está expirada
                if (isOrderExpired(order.createdAt)) {
                    console.log('[activeOrderStore] Orden expirada detectada, limpiando...');
                    get().clearActiveOrder();
                    return false;
                }

                // Solo consideramos "activo" si no fue retirado ni completado
                return order.status !== 'picked_up' && order.status !== 'completed';
            },

            isOrderReady: () => {
                const order = get().activeOrder;
                if (!order || isOrderExpired(order.createdAt)) return false;
                return order.status === 'ready';
            },

            getOrderNumber: () => {
                return get().activeOrder?.orderNumber || null;
            },

            getLocationId: () => {
                return get().activeOrder?.locationId || null;
            }
        }),
        {
            name: 'active-order-storage',
            storage: createJSONStorage(() => localStorage),
            // Limpiar órdenes expiradas al hidratar desde localStorage
            onRehydrateStorage: () => (state) => {
                if (state?.activeOrder && isOrderExpired(state.activeOrder.createdAt)) {
                    console.log('[activeOrderStore] Limpiando orden expirada al hidratar');
                    state.activeOrder = null;
                }
            }
        }
    )
);

export default useActiveOrderStore;
