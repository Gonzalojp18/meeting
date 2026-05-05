'use client';

import { useState, useEffect } from 'react';
import { MdSave, MdPercent, MdToggleOn, MdToggleOff, MdInfo, MdQrCode, MdLocalOffer, MdWarning, MdArrowForward } from 'react-icons/md';
import API_URI from '@/utils/getApiUri';

const defaultConfig = {
  isEnabled: false,
  type: 'discount',
  discountPercentage: 15,
  frequency: 'once',
  title: 'Primera vez por QR!',
  subtitle: 'Obten {discount}% OFF en tu primer pedido takeaway',
  buttonText: 'Ver menu',
  termsText: 'Valido solo para pedidos takeaway. No acumulable con otras promociones.',
};

export default function QrPromoConfig({ locationId, locations }) {
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');

  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocation) {
      const firstLoc = locations[0].nameId;
      setSelectedLocation(firstLoc);
    }
  }, [locations, selectedLocation]);

  useEffect(() => {
    const loc = selectedLocation || locationId;
    if (loc) {
      fetchConfig(loc);
    }
  }, [selectedLocation, locationId]);

  const fetchConfig = async (locId) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URI}/api/admin/qr-promo/${locId}`);
      if (!res.ok) {
        throw new Error('No se pudo cargar la configuracion');
      }
      const data = await res.json();
      if (data.qrPromo) {
        setConfig(data.qrPromo);
      }
    } catch (e) {
      console.error('Error fetching config:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const locId = selectedLocation || locationId;
    if (!locId) return;

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const res = await fetch(`${API_URI}/api/admin/qr-promo/${locId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading && !config) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mb-3"></div>
        <p className="text-sm">Cargando configuracion...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {locations && locations.length > 1 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Seleccionar Sede</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {locations.map(loc => (
              <option key={loc.nameId} value={loc.nameId}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MdQrCode className="text-orange-500" size={24} />
          Marketing QR
        </h2>
        <button
          onClick={() => updateConfig('isEnabled', !config.isEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            config.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {config.isEnabled ? <MdToggleOn size={20} /> : <MdToggleOff size={20} />}
          {config.isEnabled ? 'Activado' : 'Desactivado'}
        </button>
      </div>

      {config.isEnabled && (
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Campana</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'discount', label: 'Promocional', icon: MdLocalOffer },
                { value: 'info', label: 'Informativo', icon: MdInfo },
                { value: 'loyalty', label: 'Captacion Club', icon: MdQrCode },
              ].map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateConfig('type', option.value)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${
                      config.type === option.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {config.type === 'discount' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Descuento</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={config.discountPercentage}
                  onChange={(e) => updateConfig('discountPercentage', parseInt(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <div className="flex items-center gap-1 bg-orange-50 px-3 py-2 rounded-lg">
                  <MdPercent className="text-orange-500" />
                  <span className="font-bold text-orange-700">{config.discountPercentage}%</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Frecuencia</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'once', label: 'Una vez' },
                { value: 'daily', label: 'Diario' },
                { value: 'every_visit', label: 'Siempre' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateConfig('frequency', option.value)}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    config.frequency === option.value
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Titulo</label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Subtitulo (usa {'{discount}'} para el %)
              </label>
              <input
                type="text"
                value={config.subtitle}
                onChange={(e) => updateConfig('subtitle', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Texto del boton</label>
              <input
                type="text"
                value={config.buttonText}
                onChange={(e) => updateConfig('buttonText', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Terminos</label>
              <textarea
                value={config.termsText}
                onChange={(e) => updateConfig('termsText', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                rows={2}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">Vista previa</h3>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              {config.type === 'discount' && (
                <div className="text-center mb-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-bold">
                    <MdPercent size={14} />
                    {config.discountPercentage}% OFF
                  </span>
                </div>
              )}
              <h4 className="text-lg font-bold text-center mb-1">{config.title}</h4>
              <p className="text-gray-600 text-sm text-center mb-3">
                {config.subtitle.replace('{discount}', `${config.discountPercentage}%`)}
              </p>
              <button className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-1">
                {config.buttonText}
                <MdArrowForward size={16} />
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">{config.termsText}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
          <MdWarning />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        <MdSave size={18} />
        {saving ? 'Guardando...' : saved ? 'Guardado!' : 'Guardar cambios'}
      </button>
    </div>
  );
}
