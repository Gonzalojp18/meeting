'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'customer-data-persistence';

/**
 * Hook para manejar la persistencia de datos del cliente en localStorage.
 * Permite guardar y recuperar datos del formulario para próximas compras.
 */
export function useCustomerPersistence() {
    const [savedData, setSavedData] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Cargar datos guardados al montar el componente
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Verificar que los datos tengan la estructura esperada
                if (parsed && parsed.name && parsed.phone) {
                    setSavedData(parsed);
                }
            }
        } catch (error) {
            console.error('Error loading customer data:', error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Guardar datos del cliente
    const saveCustomerData = useCallback((data) => {
        try {
            const dataToSave = {
                name: data.name || '',
                lastname: data.lastname || '',
                phone: data.phone || '',
                email: data.email || '',
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            setSavedData(dataToSave);
        } catch (error) {
            console.error('Error saving customer data:', error);
        }
    }, []);

    // Eliminar datos guardados
    const clearCustomerData = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            setSavedData(null);
        } catch (error) {
            console.error('Error clearing customer data:', error);
        }
    }, []);

    // Verificar si hay datos guardados
    const hasSavedData = Boolean(savedData);

    return {
        savedData,
        hasSavedData,
        isLoaded,
        saveCustomerData,
        clearCustomerData
    };
}

export default useCustomerPersistence;
