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
                        const newItems = state.items.map((item, idx) =>
                            idx === existingItemIndex
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        );
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

                    const currentItem = state.items[existingItemIndex];
                    if (currentItem.quantity > 1) {
                        const newItems = state.items.map((item, idx) =>
                            idx === existingItemIndex
                                ? { ...item, quantity: item.quantity - 1 }
                                : item
                        );
                        return { items: newItems };
                    } else {
                        return { items: state.items.filter((_, idx) => idx !== existingItemIndex) };
                    }
                });
            },

            deleteItem: (itemId, locationId) => {
                set((state) => ({
                    items: state.items.filter(
                        (i) => !(i._id === itemId && i.locationId === locationId)
                    )
                }));
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
