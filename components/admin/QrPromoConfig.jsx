'use client';

import { useState, useEffect } from 'react';
import { MdSave, MdPercent, MdToggleOn, MdToggleOff, MdInfo, MdQrCode, MdLocalOffer, MdWarning, MdArrowForward, MdContentCopy, MdDownload, MdVisibility, MdShoppingCart, MdTrendingUp, MdRefresh, MdBusiness } from 'react-icons/md';
import { QRCodeCanvas } from 'qrcode.react';
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

const defaultAffiliateConfig = {
  isEnabled: false,
  discountPercentage: 10,
};

const QR_SOURCES = [
  { id: 'qr-promo', label: 'QR Publicitario', desc: 'Flyers, posters, tarjetas' },
  { id: 'qr-table', label: 'QR de Mesa', desc: 'Cada mesa del local' },
  { id: 'qr-window', label: 'QR Vidriera', desc: 'Ventana / entrada del local' },
  { id: 'qr-instagram', label: 'QR Instagram', desc: 'Link en bio o stories' },
  { id: 'qr-whatsapp', label: 'QR WhatsApp', desc: 'Mensaje con link' },
  { id: 'qr-affiliate', label: 'QR Club Afiliados', desc: 'Captación de prospectos B2B' },
];

export default function QrPromoConfig({ locationId, locations }) {
  const [config, setConfig] = useState(defaultConfig);
  const [affiliateConfig, setAffiliateConfig] = useState(defaultAffiliateConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');
  const [activeTab, setActiveTab] = useState('config');
  const [qrSource, setQrSource] = useState('qr-promo');
  const [qrMenuType, setQrMenuType] = useState('standard');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
      fetchStats(loc);
    }
  }, [selectedLocation, locationId]);

  const fetchConfig = async (locId) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URI}/api/admin/qr-promo/${locId}`);
      if (!res.ok) throw new Error('No se pudo cargar la configuracion');
      const data = await res.json();
      if (data.qrPromo) setConfig(data.qrPromo);
      if (data.affiliateClub) setAffiliateConfig(data.affiliateClub);
    } catch (e) {
      console.error('Error fetching config:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (locId) => {
    try {
      setStatsLoading(true);
      const res = await fetch(`${API_URI}/api/admin/qr-promo/${locId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setStatsLoading(false);
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
        body: JSON.stringify({
          qrPromo: config,
          affiliateClub: affiliateConfig,
        }),
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

  const updateAffiliateConfig = (key, value) => {
    setAffiliateConfig(prev => ({ ...prev, [key]: value }));
  };

  const locId = selectedLocation || locationId;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const menuRoute = qrMenuType === 'executive' ? 'executive' : 'menu';
  const isAffiliate = qrSource === 'qr-affiliate';
  const qrUrl = isAffiliate
    ? `${baseUrl}/affiliate-club/register?locationId=${locId}&discount=${config.affiliateClub?.discountPercentage || 10}`
    : `${baseUrl}/${menuRoute}/${locId}?source=${qrSource}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrUrl);
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${qrSource}-${locId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const conversionRate = stats && stats.totalViews > 0
    ? Math.round((stats.totalOrders / stats.totalViews) * 100)
    : 0;

  const tabs = [
    { id: 'config', label: 'Configuracion', icon: MdQrCode },
    { id: 'qrcodes', label: 'Generar QR', icon: MdContentCopy },
    { id: 'stats', label: 'Estadisticas', icon: MdTrendingUp },
  ];

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

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Config */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MdLocalOffer className="text-orange-500" size={24} />
              Configuracion de Campana
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
                    { value: 'affiliate_club', label: 'Club Afiliados', icon: MdBusiness },
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

              {/* Affiliate Club Config */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                    <MdBusiness className="text-purple-600" />
                    Club de Afiliados
                  </h3>
                  <button
                    onClick={() => updateAffiliateConfig('isEnabled', !affiliateConfig.isEnabled)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      affiliateConfig.isEnabled ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {affiliateConfig.isEnabled ? <MdToggleOn size={20} /> : <MdToggleOff size={20} />}
                    {affiliateConfig.isEnabled ? 'Activado' : 'Desactivado'}
                  </button>
                </div>

                {affiliateConfig.isEnabled && (
                  <div>
                    <label className="text-sm font-medium mb-2 block text-purple-900">Descuento para Afiliados</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="5"
                        value={affiliateConfig.discountPercentage}
                        onChange={(e) => updateAffiliateConfig('discountPercentage', parseInt(e.target.value))}
                        className="flex-1 accent-purple-500"
                      />
                      <div className="flex items-center gap-1 bg-purple-100 px-3 py-2 rounded-lg">
                        <MdPercent className="text-purple-600" />
                        <span className="font-bold text-purple-700">{affiliateConfig.discountPercentage}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-purple-700 mt-2">
                      Este descuento se aplicará cuando el prospecto use su código en el checkout ejecutivo.
                    </p>
                  </div>
                )}
              </div>

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
      )}

      {/* Tab: QR Codes */}
      {activeTab === 'qrcodes' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MdQrCode className="text-orange-500" size={24} />
              Generar Codigo QR
            </h2>
            <p className="text-sm text-gray-500 mt-1">Genera QRs con tracking para cada tipo de publicacion</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QR_SOURCES.map(source => (
              <button
                key={source.id}
                onClick={() => setQrSource(source.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  qrSource === source.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-sm">{source.label}</p>
                <p className="text-xs text-gray-500">{source.desc}</p>
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Menu</label>
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
              {[
                { value: 'standard', label: 'Estandar', desc: 'Menu publico' },
                { value: 'executive', label: 'Ejecutivo B2B', desc: 'Pedidos corporativos' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setQrMenuType(option.value)}
                  className={`flex flex-col px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    qrMenuType === option.value
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="text-[10px] font-normal opacity-70">{option.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center">
            <div id="qr-canvas-wrapper" className="bg-white p-4 rounded-xl">
              <QRCodeCanvas
                id="qr-canvas"
                value={qrUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center break-all font-mono bg-gray-50 px-3 py-2 rounded-lg w-full max-w-md">{qrUrl}</p>
            <div className="flex gap-3 mt-4 w-full max-w-md">
              <button
                onClick={handleCopyUrl}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                <MdContentCopy size={16} />
                Copiar URL
              </button>
              <button
                onClick={handleDownloadQR}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
              >
                <MdDownload size={16} />
                Descargar PNG
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-2">
              <MdInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Como usar</p>
                <p className="text-xs text-blue-800 mt-1">
                  Descarga el QR e imprimelo en tu material. Cada fuente (publicitario, mesa, Instagram) tiene su propio tracking para que sepas de donde vienen tus clientes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MdTrendingUp className="text-orange-500" size={24} />
                Estadisticas de Campana
              </h2>
              <p className="text-sm text-gray-500 mt-1">Visitas y conversiones del QR marketing</p>
            </div>
            <button
              onClick={() => fetchStats(locId)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MdRefresh size={20} />
            </button>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mr-3"></div>
              <span>Cargando estadisticas...</span>
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MdVisibility className="text-blue-500" size={20} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Visitas Totales</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{stats.totalViews || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MdShoppingCart className="text-green-500" size={20} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos (Conversiones)</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{stats.totalOrders || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MdTrendingUp className="text-orange-500" size={20} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasa Conversion</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{conversionRate}%</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MdPercent className="text-purple-500" size={20} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descuento Promedio</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{stats.avgDiscount || 0}%</p>
                </div>
              </div>

              {/* By Source */}
              {stats.bySource && Object.keys(stats.bySource).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-bold text-sm text-gray-700">Desglose por Fuente de Trafico</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {Object.entries(stats.bySource).map(([source, data]) => (
                      <div key={source} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{source}</p>
                          <p className="text-xs text-gray-500">{data.views} visita{data.views !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-green-600">{data.orders} pedido{data.orders !== 1 ? 's' : ''}</p>
                          {data.views > 0 && (
                            <p className="text-xs text-gray-400">{Math.round((data.orders / data.views) * 100)}% conversion</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.totalViews === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <MdQrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aun no hay visitas registradas</p>
                  <p className="text-sm text-gray-400 mt-1">Genera un QR desde la pestaña "Generar QR" y empieza a compartirlo</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No se pudieron cargar las estadisticas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
