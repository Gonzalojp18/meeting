import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
                set({ activeOrder: order });
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
                    if (!state.activeOrder) return state;
                    return {
                        activeOrder: {
                            ...state.activeOrder,
                            orderNumber,
                            orderId,
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

            hasActiveOrder: () => {
                const order = get().activeOrder;
                if (!order) return false;
                // Solo consideramos "activo" si no fue retirado
                return order.status !== 'picked_up';
            },

            isOrderReady: () => {
                const order = get().activeOrder;
                return order?.status === 'ready';
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
            storage: createJSONStorage(() => localStorage)
        }
    )
);

export default useActiveOrderStore;
