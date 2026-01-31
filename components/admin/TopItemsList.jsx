'use client';
import React from 'react';
import { MdRestaurantMenu, MdLocalFireDepartment } from 'react-icons/md';

const TopItemsList = ({ topDishes = [] }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 rounded-lg">
                        <MdRestaurantMenu className="h-4 w-4 text-orange-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Platos más vendidos</h3>
                </div>
                {topDishes.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full uppercase">
                        <MdLocalFireDepartment className="animate-pulse" /> Popular
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
                {topDishes.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-gray-400 text-sm">No hay datos de ventas disponibles</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white border-b border-gray-50">
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3 text-center">Cant.</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {topDishes.map((dish, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-bold text-xs ring-1 ring-orange-100 group-hover:scale-110 transition-transform">
                                                {idx + 1}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 leading-tight">{dish._id}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="text-sm font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                                            {dish.quantity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <span className="text-sm font-bold text-emerald-600">
                                            ${dish.revenue.toLocaleString('es-AR')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-medium text-center uppercase tracking-widest">
                    Basado en órdenes confirmadas y completadas
                </p>
            </div>
        </div>
    );
};

export default TopItemsList;
