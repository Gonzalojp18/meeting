'use client';

import { useRef, useEffect, useCallback } from 'react';

const NOTIFICATION_SOUND_PATH = '/LLAMADA.mp3';

/**
 * Hook para detectar nuevos pedidos y reproducir notificación sonora.
 * Detecta pedidos nuevos comparando los IDs actuales con los anteriores.
 *
 * @param {Array} orders - Lista de pedidos actuales
 * @param {boolean} enabled - Si las notificaciones están habilitadas
 */
export function useOrderNotification(orders, enabled = true) {
    const previousOrderIdsRef = useRef(new Set());
    const audioRef = useRef(null);
    const isFirstLoadRef = useRef(true);

    // Inicializar el audio
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio(NOTIFICATION_SOUND_PATH);
            audioRef.current.preload = 'auto';
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Función para reproducir el sonido
    const playNotificationSound = useCallback(() => {
        if (audioRef.current && enabled) {
            // Reiniciar el audio al principio por si ya estaba reproduciéndose
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => {
                // Los navegadores pueden bloquear autoplay sin interacción del usuario
                console.warn('No se pudo reproducir el sonido de notificación:', err);
            });
        }
    }, [enabled]);

    // Detectar nuevos pedidos
    useEffect(() => {
        if (!orders || orders.length === 0) {
            return;
        }

        // Obtener IDs actuales de pedidos pendientes/confirmados (recién llegados)
        const currentPendingIds = new Set(
            orders
                .filter(order => order.status === 'pending' || order.status === 'confirmed')
                .map(order => order._id)
        );

        // Si es la primera carga, solo guardamos los IDs sin reproducir sonido
        if (isFirstLoadRef.current) {
            previousOrderIdsRef.current = currentPendingIds;
            isFirstLoadRef.current = false;
            return;
        }

        // Buscar nuevos pedidos (IDs que no estaban antes)
        const newOrderIds = [...currentPendingIds].filter(
            id => !previousOrderIdsRef.current.has(id)
        );

        // Si hay nuevos pedidos, reproducir sonido
        if (newOrderIds.length > 0 && enabled) {
            console.log(`🔔 ${newOrderIds.length} nuevo(s) pedido(s) detectado(s)`);
            playNotificationSound();
        }

        // Actualizar referencia de IDs anteriores
        previousOrderIdsRef.current = currentPendingIds;

    }, [orders, enabled, playNotificationSound]);

    // Función para reproducir sonido manualmente (para testing)
    const testSound = useCallback(() => {
        playNotificationSound();
    }, [playNotificationSound]);

    return { testSound, playNotificationSound };
}

export default useOrderNotification;
