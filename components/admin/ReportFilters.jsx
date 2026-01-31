'use client';
import React from 'react';
import { MdCalendarToday, MdLocationOn, MdSearch } from 'react-icons/md';

const ReportFilters = ({
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedLocation,
    setSelectedLocation,
    locations = [],
    onSearch,
    loading
}) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <MdCalendarToday className="h-4 w-4 text-orange-500" />
                Filtros del reporte
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sede</label>
                    <div className="relative">
                        <MdLocationOn className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                            <option value="">Todas las sedes</option>
                            {locations.map((loc) => (
                                <option key={loc.nameId} value={loc.nameId}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={onSearch}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-bold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Cargando...</span>
                            </>
                        ) : (
                            <>
                                <MdSearch className="h-4 w-4" />
                                <span>Actualizar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportFilters;
