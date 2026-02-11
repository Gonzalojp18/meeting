'use client';

import { useState, useEffect, useRef } from 'react';
import { shouldHideUpselling, recordDismissal } from '@/utils/upsellingStorage';

/**
 * useProductUpselling
 * 
 * Hook para pre-cargar upsellings disponibles para productos específicos.
 * Optimizado para hacer una sola llamada API con todos los IDs de productos en el carrito.
 * 
 * @param {Array} cartItemIds - Array de IDs de productos en el carrito
 * @param {string} locationId - ID de la ubicación actual
 * @returns {Object} { upsellings: { itemId: upsellingData }, loading: boolean }
 */
export function useProductUpselling(cartItemIds = [], locationId) {
    const [upsellings, setUpsellings] = useState({});
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState([]);
    const fetchedIdsRef = useRef(new Set());

    useEffect(() => {
        // Filtrar IDs que ya fueron fetched o están vacíos
        const newIds = cartItemIds.filter(id =>
            id && !fetchedIdsRef.current.has(id)
        );

        if (newIds.length === 0) return;

        const fetchUpsellings = async () => {
            setLoading(true);

            try {
                const res = await fetch('/api/upselling/by-trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemIds: newIds })
                });

                if (res.ok) {
                    const data = await res.json();

                    if (data.success && data.data) {
                        // Marcar IDs como fetched
                        newIds.forEach(id => fetchedIdsRef.current.add(id));

                        // Merge con upsellings existentes
                        setUpsellings(prev => ({
                            ...prev,
                            ...data.data
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching product upsellings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUpsellings();
    }, [cartItemIds.join(',')]); // Dependencia basada en string para evitar re-renders

    // Función para marcar como dismissed
    const dismissUpselling = (itemId) => {
        recordDismissal(itemId); // [Mejora 2] Persistir en localStorage
        setDismissed(prev => [...prev, itemId]);
    };

    // Filtrar dismissed (state local + localStorage persistido)
    const filteredUpsellings = Object.fromEntries(
        Object.entries(upsellings).filter(([key]) =>
            !dismissed.includes(key) && !shouldHideUpselling(key)
        )
    );

    return {
        upsellings: filteredUpsellings,
        loading,
        dismissUpselling
    };
}

export default useProductUpselling;
