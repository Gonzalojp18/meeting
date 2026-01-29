import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initialMenu } from '../data/initialMenu';

const useMenuStore = create(
  persist(
    (set) => ({
      menu: initialMenu,
      selectedLocation: 'location1',

      setLocation: (locationId) => set({ selectedLocation: locationId }),

      addProduct: (categoryId, product) => {
        set((state) => {
          const newMenu = JSON.parse(JSON.stringify(state.menu));
          const category = newMenu.categories.find(c => c.id === parseInt(categoryId));

          if (category) {
            const newProduct = {
              id: Date.now(),
              name: product.name,
              description: product.description,
              prices: {}
            };

            Object.entries(product.locations).forEach(([locationId, data]) => {
              if (data.enabled && data.price) {
                newProduct.prices[locationId] = parseFloat(data.price);
              }
            });

            category.items.push(newProduct);
          }

          return { menu: newMenu };
        });
      },

      updateProduct: (categoryId, productId, updates) => {
        set((state) => {
          const newMenu = JSON.parse(JSON.stringify(state.menu));
          const category = newMenu.categories.find(c => c.id === parseInt(categoryId));

          if (category) {
            const itemIndex = category.items.findIndex(item => item.id === productId);
            if (itemIndex !== -1) {
              const updatedPrices = {};

              Object.entries(updates.locations).forEach(([locationId, data]) => {
                if (data.enabled && data.price) {
                  updatedPrices[locationId] = parseFloat(data.price);
                }
              });

              category.items[itemIndex] = {
                ...category.items[itemIndex],
                name: updates.name,
                description: updates.description,
                prices: updatedPrices
              };
            }
          }

          return { menu: newMenu };
        });
      },

      deleteProduct: (categoryId, productId) => {
        set((state) => {
          const newMenu = JSON.parse(JSON.stringify(state.menu));
          const category = newMenu.categories.find(c => c.id === parseInt(categoryId));

          if (category) {
            category.items = category.items.filter(item => item.id !== productId);
          }

          return { menu: newMenu };
        });
      }
    }),
    {
      name: 'menu-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useMenuStore;