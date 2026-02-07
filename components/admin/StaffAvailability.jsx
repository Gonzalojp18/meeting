'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFetch } from '@/hooks/useFetch';
import axios from 'axios';
import API_URI from '@/utils/getApiUri';
import { MdRestaurantMenu, MdCheckCircle, MdCancel, MdRefresh, MdSearch } from 'react-icons/md';

const StaffAvailability = () => {
    const { data: session } = useSession();
    const token = session?.user?.token;
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingItems, setUpdatingItems] = useState({});

    const { data, loading, refetch } = useFetch(
        token ? `${API_URI}/api/menu` : null,
        token
    );

    const categories = data?.categories || [];

    const handleToggleAvailability = async (categoryId, itemId, currentStatus) => {
        const key = `${categoryId}-${itemId}`;
        setUpdatingItems(prev => ({ ...prev, [key]: true }));

        try {
            await axios.patch(
                `${API_URI}/api/menu/category/${categoryId}/item/${itemId}/availability`,
                { isAvailable: !currentStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            refetch();
        } catch (error) {
            console.error('Error al cambiar disponibilidad:', error);
            alert('Error al cambiar disponibilidad. Intenta de nuevo.');
        } finally {
            setUpdatingItems(prev => ({ ...prev, [key]: false }));
        }
    };

    // Filtrar items por búsqueda
    const filteredCategories = searchTerm === ''
        ? categories
        : categories.map(category => ({
            ...category,
            items: (category.items || []).filter(item =>
                (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
        })).filter(category => (category.items || []).length > 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-orange-900 mb-1">
                            Control de Disponibilidad
                        </h2>
                        <p className="text-sm text-orange-700">
                            Activa o desactiva productos según el inventario disponible
                        </p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg transition-colors"
                        title="Actualizar lista"
                    >
                        <MdRefresh className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Búsqueda */}
            <div className="relative">
                <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
            </div>

            {/* Lista de categorías y productos */}
            <div className="space-y-4">
                {filteredCategories.map(category => (
                    <div key={category._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <MdRestaurantMenu className="h-5 w-5 text-orange-500" />
                                {category.name}
                                <span className="ml-auto text-xs font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                    {category.items?.length || 0} productos
                                </span>
                            </h3>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {category.items?.map(item => {
                                const key = `${category._id}-${item._id}`;
                                const isUpdating = updatingItems[key];

                                return (
                                    <div
                                        key={item._id}
                                        className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                                            !item.isAvailable ? 'bg-red-50' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.image && (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            )}
                                            <div>
                                                <p className={`font-medium ${!item.isAvailable ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {item.name}
                                                </p>
                                                {item.description && (
                                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleToggleAvailability(category._id, item._id, item.isAvailable)}
                                            disabled={isUpdating}
                                            className={`
                                                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                                                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                                                ${item.isAvailable
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                }
                                            `}
                                        >
                                            {isUpdating ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                            ) : item.isAvailable ? (
                                                <>
                                                    <MdCheckCircle className="h-4 w-4" />
                                                    Disponible
                                                </>
                                            ) : (
                                                <>
                                                    <MdCancel className="h-4 w-4" />
                                                    No disponible
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {filteredCategories.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <MdRestaurantMenu className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No se encontraron productos</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffAvailability;
