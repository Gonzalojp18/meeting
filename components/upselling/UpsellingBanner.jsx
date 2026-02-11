'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MdAdd, MdClose, MdLocalOffer } from 'react-icons/md';
import { filterDismissedUpsellings, recordDismissal } from '@/utils/upsellingStorage';

/**
 * UpsellingBanner Component
 * 
 * Muestra sugerencias de upselling inteligente basadas en el carrito actual.
 * Se integra en: menú takeaway, checkout, y carrito drawer.
 * 
 * Props:
 * - cartItems: Array de items en el carrito [{ itemId, itemName, categoryId, quantity }]
 * - locationId: ID de la ubicación del restaurante
 * - displayLocation: 'menu' | 'checkout' | 'cart'
 * - onAddToCart: Función para agregar item al carrito (suggestedItem)
 * - variant: 'inline' | 'banner' | 'compact' (estilo de display)
 * - maxSuggestions: Número máximo de sugerencias (default: 2)
 */
export default function UpsellingBanner({
    cartItems = [],
    locationId = 'location1',
    displayLocation = 'checkout',
    onAddToCart,
    onReplaceInCart,
    variant = 'banner',
    maxSuggestions = null
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState([]);
    const [addingId, setAddingId] = useState(null);

    // Fetch suggestions when cart changes
    const fetchSuggestions = useCallback(async () => {
        if (cartItems.length === 0) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            console.log('[UpsellingBanner] Fetching suggestions...', { cartItems, displayLocation, locationId });

            const res = await fetch('/api/upselling/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartItems,
                    displayLocation,
                    locationId,
                    ...(maxSuggestions !== null && { limit: maxSuggestions })
                })
            });

            const data = await res.json();
            console.log('[UpsellingBanner] API Response:', data);

            if (data.success && data.data.length > 0) {
                // [Mejora 2] Filtrar los que el usuario ya dismisseó recientemente
                const filtered = filterDismissedUpsellings(data.data);
                // Track impressions
                for (const suggestion of filtered) {
                    trackImpression(suggestion._id);
                }
                setSuggestions(filtered);
            } else {
                console.log('[UpsellingBanner] No suggestions returned');
                setSuggestions([]);
            }
        } catch (err) {
            console.error('Error fetching upselling suggestions:', err);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, [cartItems, displayLocation, locationId, maxSuggestions]);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    // Track impression
    const trackImpression = async (upsellingId) => {
        try {
            await fetch(`/api/upselling/${upsellingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackImpression: true,
                    location: displayLocation
                })
            });
        } catch (err) {
            // Silently fail - metrics are non-critical
        }
    };

    // Track click
    const trackClick = async (upsellingId) => {
        try {
            await fetch(`/api/upselling/${upsellingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackClick: true,
                    location: displayLocation
                })
            });
        } catch (err) {
            // Silently fail
        }
    };

    // Handle add to cart
    const handleAdd = async (suggestion) => {
        if (!onAddToCart) return;

        setAddingId(suggestion._id);
        trackClick(suggestion._id);

        // Para upgrades: reemplazar el item original en vez de sumar
        if (suggestion.type === 'upgrade' && suggestion.triggerItemId && onReplaceInCart) {
            for (const item of suggestion.suggestedItems) {
                await onReplaceInCart(suggestion.triggerItemId, {
                    itemId: item.itemId,
                    name: item.itemName,
                    price: item.price,
                });
            }
        } else {
            // Para cross-sell, upsell, combo: agregar normalmente
            for (const item of suggestion.suggestedItems) {
                await onAddToCart({
                    itemId: item.itemId,
                    name: item.itemName,
                    price: item.price,
                    quantity: 1
                });
            }
        }

        // Remove from suggestions
        setSuggestions(prev => prev.filter(s => s._id !== suggestion._id));
        setAddingId(null);
    };

    // Dismiss suggestion
    const handleDismiss = (suggestionId) => {
        recordDismissal(suggestionId); // [Mejora 2] Persistir dismiss en localStorage
        setDismissed(prev => [...prev, suggestionId]);
        setSuggestions(prev => prev.filter(s => s._id !== suggestionId));
    };

    // Filter dismissed
    const visibleSuggestions = suggestions.filter(s => !dismissed.includes(s._id));

    // Don't render if no suggestions or loading
    if (loading || visibleSuggestions.length === 0) {
        return null;
    }

    // Format price
    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    };

    // Compact variant (for cart drawer)
    if (variant === 'compact') {
        return (
            <div className="space-y-2">
                {visibleSuggestions.map(suggestion => (
                    <div
                        key={suggestion._id}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg"
                    >
                        <div className="flex-shrink-0">
                            <MdLocalOffer className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {suggestion.copyText}
                            </p>
                            <p className="text-xs text-gray-500">
                                {suggestion.suggestedItems.map(i => i.itemName).join(' + ')} • {formatPrice(suggestion.totalPrice)}
                            </p>
                        </div>
                        <button
                            onClick={() => handleAdd(suggestion)}
                            disabled={addingId === suggestion._id}
                            className="flex-shrink-0 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {addingId === suggestion._id ? '...' : 'Agregar'}
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    // Inline variant (for menu sections)
    if (variant === 'inline') {
        console.log('[UpsellingBanner] Rendering inline variant with', visibleSuggestions.length, 'suggestions');
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleSuggestions.map(suggestion => (
                    <div
                        key={suggestion._id}
                        className="relative p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl hover:shadow-md transition-all"
                    >
                        <button
                            onClick={() => handleDismiss(suggestion._id)}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full"
                        >
                            <MdClose className="h-4 w-4" />
                        </button>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <MdLocalOffer className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm pr-6">
                                    {suggestion.copyText}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {suggestion.suggestedItems.map(i => i.itemName).join(' + ')}
                                </p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-lg font-bold text-emerald-700">
                                        {formatPrice(suggestion.totalPrice)}
                                    </span>
                                    <button
                                        onClick={() => handleAdd(suggestion)}
                                        disabled={addingId === suggestion._id}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <MdAdd className="h-4 w-4" />
                                        {addingId === suggestion._id ? 'Agregando...' : 'Agregar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Banner variant (default - for checkout)
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <MdLocalOffer className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">¿Querés agregar algo más?</h3>
            </div>

            {visibleSuggestions.map(suggestion => (
                <div
                    key={suggestion._id}
                    className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 p-4 sm:p-5 rounded-2xl text-white shadow-lg shadow-orange-200"
                >
                    {/* Background decoration */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                    </div>

                    <div className="relative z-10">
                        <button
                            onClick={() => handleDismiss(suggestion._id)}
                            className="absolute top-0 right-0 p-1 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                        >
                            <MdClose className="h-5 w-5" />
                        </button>

                        <p className="text-lg sm:text-xl font-bold mb-2 pr-8">
                            {suggestion.copyText}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {suggestion.suggestedItems.map((item, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium"
                                >
                                    {item.itemName}
                                    <span className="ml-2 text-xs opacity-80">
                                        {formatPrice(item.price)}
                                    </span>
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs opacity-80 block">Total</span>
                                <span className="text-2xl font-black">
                                    {formatPrice(suggestion.totalPrice)}
                                </span>
                            </div>

                            <button
                                onClick={() => handleAdd(suggestion)}
                                disabled={addingId === suggestion._id}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors shadow-md disabled:opacity-50"
                            >
                                <MdAdd className="h-5 w-5" />
                                {addingId === suggestion._id ? 'Agregando...' : 'Agregar al pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
