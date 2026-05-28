'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URI from '@/utils/getApiUri';
import { MdEdit, MdSave, MdCheckCircle, MdError, MdClose, MdSchedule } from 'react-icons/md';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-slide-in-right
      ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}
    `}>
      {type === 'success'
        ? <MdCheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        : <MdError className="h-5 w-5 text-red-500 flex-shrink-0" />
      }
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
        <MdClose className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function ScheduledOrdersConfig({ locations, token, onRefetch }) {
  const [saving, setSaving] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [configs, setConfigs] = useState({});
  const [toast, setToast] = useState(null);

  const syncConfigsFromLocations = useCallback(() => {
    const initialConfigs = {};
    locations?.forEach(loc => {
      initialConfigs[loc._id] = {
        enabled: loc.scheduledOrdersConfig?.enabled ?? false,
        maxAdvanceHours: loc.scheduledOrdersConfig?.maxAdvanceHours ?? 24,
        minAdvanceMinutes: loc.scheduledOrdersConfig?.minAdvanceMinutes ?? 30,
        slotDurationMinutes: loc.scheduledOrdersConfig?.slotDurationMinutes ?? 15,
        maxOrdersPerSlot: loc.scheduledOrdersConfig?.maxOrdersPerSlot ?? 10,
        gracePeriodMinutes: loc.scheduledOrdersConfig?.gracePeriodMinutes ?? 15,
      };
    });
    setConfigs(initialConfigs);
  }, [locations]);

  useEffect(() => {
    syncConfigsFromLocations();
  }, [syncConfigsFromLocations]);

  const handleSave = async (locationId) => {
    setSaving(true);
    try {
      const loc = locations.find(l => l._id === locationId);
      await axios.put(
        `${API_URI}/api/admin/scheduled-orders-config`,
        { locationId: loc.nameId, config: configs[locationId] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingLocation(null);
      setToast({ message: `Configuración de ${loc.name} guardada correctamente`, type: 'success' });
      if (onRefetch) {
        await onRefetch();
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setToast({ message: 'Error al guardar la configuración', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    syncConfigsFromLocations();
    setEditingLocation(null);
  };

  const updateConfig = (locationId, field, value) => {
    setConfigs(prev => ({
      ...prev,
      [locationId]: { ...prev[locationId], [field]: value }
    }));
  };

  if (!locations?.length) {
    return <div className="text-center py-8 text-gray-500">No hay sedes configuradas</div>;
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-1">¿Cómo funciona?</h3>
        <p className="text-xs text-blue-700">
          Los pedidos programados permiten a los clientes elegir fecha y hora de retiro.
          Cada sede puede tener su propia configuración de horarios, capacidad y anticipación mínima.
        </p>
      </div>

      <div className="space-y-4">
        {locations.map(location => {
          const config = configs[location._id] || {};
          const isEditing = editingLocation === location._id;
          const isEnabled = config.enabled;

          return (
            <div key={location._id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <h4 className="font-bold text-sm">{location.name}</h4>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isEnabled ? 'Activo' : 'Desactivado'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={() => isEditing ? handleSave(location._id) : setEditingLocation(location._id)}
                    disabled={saving}
                    className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                  >
                    {isEditing ? (saving ? '...' : <MdSave size={18} />) : <MdEdit size={18} />}
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled || false}
                      onChange={(e) => updateConfig(location._id, 'enabled', e.target.checked)}
                      disabled={!isEditing}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Habilitar pedidos programados</span>
                  </label>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Anticipación mínima (min)</label>
                    <input
                      type="number"
                      value={config.minAdvanceMinutes ?? 30}
                      onChange={(e) => updateConfig(location._id, 'minAdvanceMinutes', parseInt(e.target.value) || 30)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      min="5"
                      max="120"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Anticipación máxima (hs)</label>
                    <input
                      type="number"
                      value={config.maxAdvanceHours ?? 24}
                      onChange={(e) => updateConfig(location._id, 'maxAdvanceHours', parseInt(e.target.value) || 24)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      min="1"
                      max="72"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Duración de slot (min)</label>
                    <input
                      type="number"
                      value={config.slotDurationMinutes ?? 15}
                      onChange={(e) => updateConfig(location._id, 'slotDurationMinutes', parseInt(e.target.value) || 15)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      min="5"
                      max="60"
                      step="5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Máx. pedidos por slot</label>
                    <input
                      type="number"
                      value={config.maxOrdersPerSlot ?? 10}
                      onChange={(e) => updateConfig(location._id, 'maxOrdersPerSlot', parseInt(e.target.value) || 10)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      min="1"
                      max="50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Período de gracia (min)</label>
                    <input
                      type="number"
                      value={config.gracePeriodMinutes ?? 15}
                      onChange={(e) => updateConfig(location._id, 'gracePeriodMinutes', parseInt(e.target.value) || 15)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      min="5"
                      max="60"
                    />
                  </div>
                </div>

                {!isEnabled && (
                  <p className="text-xs text-gray-400 mt-3">
                    Los pedidos programados están desactivados para esta sede. Actívalos para que los clientes puedan programar retiros.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
