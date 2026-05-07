'use client';

import { useEffect, useState } from 'react';
import { MdQrCode, MdToggleOn, MdToggleOff, MdPalette, MdSave, MdWarning, MdPercent, MdInfo, MdLocalOffer, MdCheckCircle, MdBusiness } from 'react-icons/md';
import API_URI from '@/utils/getApiUri';

export default function SuperAdminMarketingQr() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [styles, setStyles] = useState({
        primaryColor: '#F74211',
        backgroundColor: '#FFF5F0',
        badgeColor: '#F74211',
        borderRadius: '24px',
        buttonColor: '#F74211',
    });
    const [stylesLoading, setStylesLoading] = useState(true);
    const [stylesSaving, setStylesSaving] = useState(false);
    const [stylesSaved, setStylesSaved] = useState(false);
    const [globalEnabled, setGlobalEnabled] = useState(false);
    const [globalStats, setGlobalStats] = useState(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        await Promise.all([fetchLocations(), fetchStyles(), fetchGlobalStats()]);
    };

    const fetchLocations = async () => {
        try {
            const res = await fetch(`${API_URI}/api/superadmin/locations`);
            if (res.ok) {
                const data = await res.json();
                const locs = data.locations || [];
                setLocations(locs);
                const anyEnabled = locs.some(loc => loc.qrPromo?.isEnabled);
                setGlobalEnabled(anyEnabled);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalStats = async () => {
        try {
            const res = await fetch(`${API_URI}/api/superadmin/qr-promo/stats`);
            if (res.ok) {
                const data = await res.json();
                setGlobalStats(data);
            }
        } catch (error) {
            console.error('Error fetching global stats:', error);
        }
    };

    const fetchStyles = async () => {
        try {
            setStylesLoading(true);
            const res = await fetch(`${API_URI}/api/admin/qr-promo-styles`);
            if (res.ok) {
                const data = await res.json();
                if (data.qrPromoStyles) {
                    setStyles(data.qrPromoStyles);
                }
            }
        } catch (error) {
            console.error('Error fetching styles:', error);
        } finally {
            setStylesLoading(false);
        }
    };

    const handleSaveStyles = async () => {
        setStylesSaving(true);
        setStylesSaved(false);
        try {
            const res = await fetch(`${API_URI}/api/admin/qr-promo-styles`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(styles),
            });
            if (!res.ok) throw new Error('Error al guardar');
            setStylesSaved(true);
            setTimeout(() => setStylesSaved(false), 3000);
        } catch (error) {
            console.error('Error saving styles:', error);
        } finally {
            setStylesSaving(false);
        }
    };

    const updateStyle = (key, value) => {
        setStyles(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <MdQrCode className="text-purple-600" />
                    Marketing QR
                </h2>
                <p className="text-gray-600 mt-1">Configuracion global de estilos y estado de campañas por sede</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Global Styles */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 p-6">
                        <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                            <MdPalette />
                            Estilos Globales
                        </h3>
                        <p className="text-sm text-purple-700 mt-1">Colores y diseño base de los banners QR</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-2">Color Primario</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={styles.primaryColor}
                                        onChange={e => updateStyle('primaryColor', e.target.value)}
                                        className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{styles.primaryColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-2">Color Boton</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={styles.buttonColor}
                                        onChange={e => updateStyle('buttonColor', e.target.value)}
                                        className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{styles.buttonColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-2">Color Fondo</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={styles.backgroundColor}
                                        onChange={e => updateStyle('backgroundColor', e.target.value)}
                                        className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{styles.backgroundColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-2">Color Badge</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={styles.badgeColor}
                                        onChange={e => updateStyle('badgeColor', e.target.value)}
                                        className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{styles.badgeColor}</span>
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="mt-4 p-4 rounded-xl border border-gray-200" style={{ backgroundColor: styles.backgroundColor }}>
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <div className="text-center mb-3">
                                    <span
                                        className="inline-flex items-center gap-1 px-3 py-1 text-white rounded-full text-sm font-bold"
                                        style={{ backgroundColor: styles.badgeColor }}
                                    >
                                        <MdPercent size={14} />
                                        15% OFF
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-center mb-1">Primera vez por QR!</h4>
                                <p className="text-gray-600 text-sm text-center mb-3">Obten 15% OFF en tu primer pedido takeaway</p>
                                <button
                                    className="w-full py-2 text-white rounded-lg font-medium text-sm"
                                    style={{ backgroundColor: styles.buttonColor }}
                                >
                                    Ver menu
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveStyles}
                            disabled={stylesSaving}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                            <MdSave size={18} />
                            {stylesSaving ? 'Guardando...' : stylesSaved ? 'Guardado!' : 'Guardar Estilos Globales'}
                        </button>
                    </div>
                </div>

                {/* Location Status Overview */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-6">
                        <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                            <MdQrCode />
                            Estado por Sede
                        </h3>
                        <p className="text-sm text-orange-700 mt-1">Configuracion y estadisticas de QR promo</p>
                    </div>
                    <div className="p-6 space-y-3">
                        {locations.map(location => {
                            const promo = location.qrPromo || {};
                            const isEnabled = promo.isEnabled || false;
                            const stats = location.stats || {};
                            const typeIcons = { discount: MdLocalOffer, info: MdInfo, loyalty: MdCheckCircle, affiliate_club: MdBusiness };
                            const TypeIcon = typeIcons[promo.type] || MdLocalOffer;
                            const freqLabels = { once: 'Una vez', daily: 'Diario', every_visit: 'Siempre' };

                            return (
                                <div
                                    key={location.nameId}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        isEnabled
                                            ? 'border-green-200 bg-green-50'
                                            : 'border-gray-100 bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                isEnabled ? 'bg-green-100' : 'bg-gray-200'
                                            }`}>
                                                {isEnabled ? (
                                                    <MdToggleOn className="w-6 h-6 text-green-600" />
                                                ) : (
                                                    <MdToggleOff className="w-6 h-6 text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{location.name}</p>
                                                <p className="text-xs text-gray-500">{location.nameId}</p>
                                            </div>
                                        </div>
                                        {isEnabled ? (
                                            <div className="flex items-center gap-2">
                                                <TypeIcon className="w-4 h-4 text-orange-600" />
                                                <span className="text-xs text-orange-700 font-medium">
                                                    {promo.type === 'discount' ? `${promo.discountPercentage}% OFF` : promo.type}
                                                </span>
                                                <span className="text-xs text-gray-500">· {freqLabels[promo.frequency] || ''}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Sin configurar</span>
                                        )}
                                    </div>
                                    {stats.views > 0 && (
                                        <div className="flex items-center gap-4 pt-2 border-t border-gray-200/50 mt-2">
                                            <span className="text-xs text-gray-600">
                                                <strong>{stats.views}</strong> visitas
                                            </span>
                                            <span className="text-xs text-green-600">
                                                <strong>{stats.orders}</strong> pedidos
                                            </span>
                                            {stats.discountGiven > 0 && (
                                                <span className="text-xs text-purple-600">
                                                    ${stats.discountGiven.toLocaleString()} en descuentos
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {locations.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                <MdQrCode className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-sm">No hay sedes configuradas</p>
                            </div>
                        )}

                        {locations.length > 0 && (
                            <div className="pt-3 border-t border-gray-200 space-y-2">
                                {globalStats?.global && (
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xs text-gray-500">Visitas totales</p>
                                            <p className="text-lg font-bold text-blue-600">{globalStats.global.totalViews}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Pedidos con QR</p>
                                            <p className="text-lg font-bold text-green-600">{globalStats.global.totalOrders}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Descuento dado</p>
                                            <p className="text-lg font-bold text-purple-600">${globalStats.global.totalDiscountGiven.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Sedes con QR activo:</span>
                                    <span className="font-bold text-green-700">
                                        {locations.filter(l => l.qrPromo?.isEnabled).length} / {locations.length}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex gap-3">
                    <MdInfo className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-blue-900 mb-1">Como funciona</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Los <strong>codigos QR</strong> deben apuntar a <code className="bg-blue-100 px-1 rounded">/menu/[sede]?source=qr-menu</code></li>
                            <li>• El <strong>admin</strong> configura las promociones desde Admin &gt; Marketing QR por cada sede</li>
                            <li>• El <strong>superadmin</strong> gestiona los estilos globales desde esta pagina</li>
                            <li>• La <strong>frecuencia</strong> controla cuantas veces se muestra la promo (una vez, diario, siempre)</li>
                            <li>• El <strong>descuento</strong> se aplica automaticamente en el checkout si el cliente viene de un QR</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
