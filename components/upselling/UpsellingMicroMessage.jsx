'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdAdd, MdClose, MdLocalOffer } from 'react-icons/md';

/**
 * UpsellingMicroMessage
 * 
 * Micro-mensaje de upselling que aparece dentro de la card del producto.
 * Diseño sutil y no invasivo que planta la idea sin interrumpir el flujo.
 */
export default function UpsellingMicroMessage({
    upselling,
    onAdd,
    onDismiss,
    locationId
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    if (!upselling || isDismissed) return null;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    };

    const handleAdd = async () => {
        if (!onAdd || isAdding) return;

        setIsAdding(true);

        try {
            // Agregar todos los items sugeridos
            for (const item of upselling.suggestedItems) {
                await onAdd({
                    _id: item.itemId,
                    name: item.itemName,
                    price: item.price,
                }, locationId);
            }

            // Track click (opcional)
            try {
                await fetch(`/api/upselling/${upselling._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trackClick: true,
                        location: 'menu'
                    })
                });
            } catch (e) {
                // Silently fail
            }

            // Ocultar después de agregar
            setIsDismissed(true);
        } catch (err) {
            console.error('Error adding upselling item:', err);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        onDismiss?.(upselling._id);
    };

    // Nombre del producto sugerido
    const suggestedName = upselling.suggestedItems.map(i => i.itemName).join(' + ');

    return (
        <AnimatePresence>
            {!isDismissed && (
                <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden"
                >
                    <div className="flex items-start gap-2 p-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-lg">
                        {/* Ícono */}
                        <div className="flex-shrink-0 mt-0.5">
                            <span className="text-sm">✨</span>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-emerald-800 font-medium leading-tight">
                                {upselling.copyText}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-emerald-600">
                                    {suggestedName}
                                </span>
                                <span className="text-xs font-bold text-emerald-700">
                                    +{formatPrice(upselling.totalPrice)}
                                </span>
                            </div>
                        </div>

                        {/* Botón agregar */}
                        <button
                            onClick={handleAdd}
                            disabled={isAdding}
                            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                        >
                            <MdAdd className="h-3.5 w-3.5" />
                            {isAdding ? '...' : 'Agregar'}
                        </button>

                        {/* Botón cerrar */}
                        <button
                            onClick={handleDismiss}
                            className="flex-shrink-0 p-0.5 text-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                            <MdClose className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
