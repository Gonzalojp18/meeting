'use client';

import { useEffect, useState } from 'react';
import { MdToggleOn, MdToggleOff, MdLocationOn, MdDeliveryDining, MdRestaurant, MdSave, MdBusinessCenter, MdQrCode, MdAssignmentInd, MdSchedule } from 'react-icons/md';

export default function LocationsManager() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/superadmin/locations');
            if (res.ok) {
                const data = await res.json();
                setLocations(data.locations || []);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateLocation = async (locationId, updates) => {
        setSaving(locationId);
        try {
            const res = await fetch(`/api/superadmin/locations/${locationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                const data = await res.json();
                // Actualizar estado local
                setLocations(prev =>
                    prev.map(loc =>
                        loc.nameId === locationId ? data.location : loc
                    )
                );
                alert('✅ Locación actualizada correctamente');
            } else {
                alert('❌ Error al actualizar locación');
            }
        } catch (error) {
            console.error('Error updating location:', error);
            alert('❌ Error al actualizar locación');
        } finally {
            setSaving(null);
        }
    };

    const toggleIsActive = (location) => {
        const newStatus = !location.isActive;
        const confirmMsg = newStatus
            ? `¿Activar la sede "${location.name}"?`
            : `⚠️ ¿DESACTIVAR la sede "${location.name}"?\n\nLos usuarios NO podrán acceder a esta sede.`;

        if (confirm(confirmMsg)) {
            updateLocation(location.nameId, { isActive: newStatus });
        }
    };

    const toggleFeature = (location, feature) => {
        const currentValue = location.features?.[feature];
        const newValue = !currentValue;
        const featureNames = {
            takeawayEnabled: 'Takeaway',
            localEnabled: 'Consumo Local',
            executiveEnabled: 'Menú Ejecutivo B2B',
            qrMarketingEnabled: 'Marketing QR (Premium)',
            affiliateClubEnabled: 'Club de Afiliados (Premium)',
            scheduledOrdersEnabled: 'Pedidos Programados (Premium)'
        };

        if (confirm(`¿${newValue ? 'Habilitar' : 'Deshabilitar'} ${featureNames[feature]} en "${location.name}"?`)) {
            updateLocation(location.nameId, {
                features: {
                    ...location.features,
                    [feature]: newValue
                }
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Gestión de Locaciones</h2>
                <p className="text-gray-600 mt-1">Control total sobre sedes y servicios</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {locations.map((location) => (
                    <LocationCard
                        key={location.nameId}
                        location={location}
                        onToggleActive={() => toggleIsActive(location)}
                        onToggleFeature={(feature) => toggleFeature(location, feature)}
                        isSaving={saving === location.nameId}
                    />
                ))}
            </div>

            {locations.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <MdLocationOn className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay locaciones configuradas</p>
                </div>
            )}
        </div>
    );
}

function LocationCard({ location, onToggleActive, onToggleFeature, isSaving }) {
    const isActive = location.isActive ?? true;
    const takeawayEnabled = location.features?.takeawayEnabled ?? true;
    const localEnabled = location.features?.localEnabled ?? true;
    const executiveEnabled = location.features?.executiveEnabled ?? true;
    const qrMarketingEnabled = location.features?.qrMarketingEnabled ?? false;
    const affiliateClubEnabled = location.features?.affiliateClubEnabled ?? false;
    const scheduledOrdersEnabled = location.features?.scheduledOrdersEnabled ?? false;

    return (
        <div className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all ${isActive ? 'border-green-200' : 'border-red-200 opacity-60'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isActive ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                        <MdLocationOn className={`w-6 h-6 ${isActive ? 'text-green-600' : 'text-gray-400'
                            }`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{location.name}</h3>
                        <p className="text-sm text-gray-500">ID: {location.nameId}</p>
                    </div>
                </div>
                <StatusBadge isActive={isActive} />
            </div>

            {/* Main Toggle */}
            <div className="mb-6 pb-6 border-b border-gray-200">
                <button
                    onClick={onToggleActive}
                    disabled={isSaving}
                    className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${isActive
                            ? 'bg-green-50 hover:bg-green-100'
                            : 'bg-red-50 hover:bg-red-100'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <span className={`font-semibold ${isActive ? 'text-green-900' : 'text-red-900'
                        }`}>
                        Sede {isActive ? 'Activa' : 'Desactivada'}
                    </span>
                    {isActive ? (
                        <MdToggleOn className="w-8 h-8 text-green-600" />
                    ) : (
                        <MdToggleOff className="w-8 h-8 text-red-400" />
                    )}
                </button>
            </div>

            {/* Features */}
            <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 mb-3">Servicios Disponibles:</p>

                {/* Takeaway */}
                <FeatureToggle
                    label="Takeaway / Para Llevar"
                    icon={MdDeliveryDining}
                    enabled={takeawayEnabled}
                    disabled={!isActive || isSaving}
                    onClick={() => onToggleFeature('takeawayEnabled')}
                />

                {/* Local Dining */}
                <FeatureToggle
                    label="Consumo en Local"
                    icon={MdRestaurant}
                    enabled={localEnabled}
                    disabled={!isActive || isSaving}
                    onClick={() => onToggleFeature('localEnabled')}
                />

                {/* Executive B2B */}
                <FeatureToggle
                    label="Menú Ejecutivo B2B"
                    icon={MdBusinessCenter}
                    enabled={executiveEnabled}
                    disabled={!isActive || isSaving}
                    onClick={() => onToggleFeature('executiveEnabled')}
                />

                {/* Premium Features Divider */}
                <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1">
                        <span className="w-2 h-2 bg-purple-500 rounded-full" />
                        Funcionalidades Premium
                    </p>
                </div>

                {/* Marketing QR */}
                <FeatureToggle
                    label="Marketing QR"
                    icon={MdQrCode}
                    enabled={qrMarketingEnabled}
                    disabled={!isActive || isSaving}
                    onClick={() => onToggleFeature('qrMarketingEnabled')}
                    isPremium
                />

                {/* Club de Afiliados */}
                <FeatureToggle
                    label="Club de Afiliados"
                    icon={MdAssignmentInd}
                    enabled={affiliateClubEnabled}
                    disabled={!isActive || isSaving}
                    onClick={() => onToggleFeature('affiliateClubEnabled')}
                    isPremium
                />

                {/* Pedidos Programados */}
                <FeatureToggle
                    label="Pedidos Programados"
                    icon={MdSchedule}
                    enabled={scheduledOrdersEnabled}
                    disabled={!isActive || isSaving}
                    onClick={() => onToggleFeature('scheduledOrdersEnabled')}
                    isPremium
                />
            </div>

            {/* Metadata */}
            {location.metadata?.notes && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">{location.metadata.notes}</p>
                </div>
            )}

            {isSaving && (
                <div className="mt-4 flex items-center justify-center text-purple-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-600 mr-2"></div>
                    <span className="text-sm font-medium">Guardando...</span>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ isActive }) {
    if (isActive) {
        return (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                ACTIVA
            </span>
        );
    }
    return (
        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
            INACTIVA
        </span>
    );
}

function FeatureToggle({ label, icon: Icon, enabled, disabled, onClick, isPremium = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${disabled
                    ? 'bg-gray-50 cursor-not-allowed opacity-50'
                    : isPremium
                        ? enabled
                            ? 'bg-purple-50 hover:bg-purple-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                        : enabled
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                }`}
        >
            <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${enabled ? (isPremium ? 'text-purple-600' : 'text-blue-600') : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${enabled ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                    {label}
                </span>
                {isPremium && (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                        PREMIUM
                    </span>
                )}
            </div>
            {enabled ? (
                <MdToggleOn className={`w-7 h-7 ${isPremium ? 'text-purple-600' : 'text-blue-600'}`} />
            ) : (
                <MdToggleOff className="w-7 h-7 text-gray-400" />
            )}
        </button>
    );
}
