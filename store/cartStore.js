import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useCartStore = create(
    persist(
        (set, get) => ({
            items: [], // { _id, name, price, quantity, locationId }

            addItem: (item, locationId) => {
                set((state) => {
                    const existingItemIndex = state.items.findIndex(
                        (i) => i._id === item._id && i.locationId === locationId
                    );

                    if (existingItemIndex !== -1) {
                        const newItems = [...state.items];
                        newItems[existingItemIndex].quantity += 1;
                        return { items: newItems };
                    }

                    return {
                        items: [...state.items, { ...item, quantity: 1, locationId }]
                    };
                });
            },

            removeItem: (itemId, locationId) => {
                set((state) => {
                    const existingItemIndex = state.items.findIndex(
                        (i) => i._id === itemId && i.locationId === locationId
                    );

                    if (existingItemIndex === -1) return state;

                    const newItems = [...state.items];
                    if (newItems[existingItemIndex].quantity > 1) {
                        newItems[existingItemIndex].quantity -= 1;
                        return { items: newItems };
                    } else {
                        return { items: newItems.filter((i, idx) => idx !== existingItemIndex) };
                    }
                });
            },

            clearCart: (locationId) => {
                if (locationId) {
                    set((state) => ({
                        items: state.items.filter((i) => i.locationId !== locationId)
                    }));
                } else {
                    set({ items: [] });
                }
            },

            getCartTotal: (locationId) => {
                const items = get().items.filter(i => i.locationId === locationId);
                return items.reduce((total, item) => total + (item.price * item.quantity), 0);
            },

            getCartCount: (locationId) => {
                const items = get().items.filter(i => i.locationId === locationId);
                return items.reduce((count, item) => count + item.quantity, 0);
            }
        }),
        {
            name: 'cart-storage',
            storage: createJSONStorage(() => localStorage)
        }
    )
);

export default useCartStore;
