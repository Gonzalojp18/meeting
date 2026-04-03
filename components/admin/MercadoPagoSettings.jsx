'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MdSecurity, MdVisibility, MdVisibilityOff, MdCheckCircle, MdError, MdOpenInNew, MdDelete, MdInfoOutline, MdLock, MdWarning, MdSync, MdAutoFixHigh } from 'react-icons/md';

const MercadoPagoSettings = () => {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [publicKey, setPublicKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ configured: false, mode: null, publicKey: '', accessToken: '', webhookSecret: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const getAuthHeaders = () => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (token) {
      fetchStatus();
    }
  }, [token]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/settings/mercadopago', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setStatus(data);
      if (!data.configured) {
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error fetching MP status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Debes ingresar tu contraseña actual para guardar los cambios.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ publicKey, accessToken, webhookSecret, currentPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setPublicKey('');
        setAccessToken('');
        setWebhookSecret('');
        setCurrentPassword('');
        setIsEditing(false);
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePassword) {
      setMessage({ type: 'error', text: 'Debes ingresar tu contraseña para confirmar la eliminación.' });
      return;
    }

    try {
      const res = await fetch('/api/settings/mercadopago', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ currentPassword: deletePassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Credenciales eliminadas' });
        setStatus({ configured: false, mode: null, publicKey: '', accessToken: '', webhookSecret: '' });
        setIsEditing(true);
        setShowDeleteConfirm(false);
        setDeletePassword('');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar' });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/payments/sync', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        if (data.recovered > 0) {
          setMessage({ type: 'success', text: `Sincronización completada. Se recuperaron ${data.recovered} pedidos.` });
        } else {
          setMessage({ type: 'info', text: 'Sincronización completada. No se encontraron pedidos pendientes por recuperar.' });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Error en la sincronización' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de red al sincronizar' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MdSecurity className="h-6 w-6 text-indigo-600" />
          Mercado Pago
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configura tus credenciales para recibir pagos
        </p>
      </div>

      {/* Estado actual */}
      {status.configured && !isEditing && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdCheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-gray-900">Configurado</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.mode === 'test' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                {status.mode === 'test' ? 'Modo Test' : 'Producción'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Cambiar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar credenciales"
              >
                <MdDelete className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Public Key</p>
              <p className="font-mono text-gray-700">{status.publicKey}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Access Token</p>
              <p className="font-mono text-gray-700">{status.accessToken}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:col-span-2">
              <p className="text-gray-500 text-xs mb-1">Webhook Secret (Firma)</p>
              <p className="font-mono text-gray-700">{status.webhookSecret || 'No configurado'}</p>
            </div>
          </div>

          {/* Sección de Auto-Recuperación (NUEVO) */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl">
                <MdAutoFixHigh size={20} className="text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">Auto-Recuperación de Pagos</h4>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  Si un cliente pagó pero su pedido no aparece como confirmado, esta herramienta sincroniza el estado con Mercado Pago proactivamente.
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm
                    ${syncing 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95'
                    }`}
                >
                  <MdSync size={18} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Sincronizando...' : 'Reconciliar Pagos'}
                </button>
              </div>
            </div>

            {syncResult && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 text-[11px] text-gray-600 font-mono">
                    <p>Total analizado: {syncResult.total}</p>
                    <p className="text-green-600 font-bold">Recuperados: {syncResult.recovered}</p>
                    {syncResult.errors > 0 && <p className="text-red-600">Errores: {syncResult.errors}</p>}
                </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 m-4 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <MdWarning className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Eliminar credenciales</h3>
                <p className="text-sm text-gray-500">Los pagos dejarán de funcionar</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MdLock className="inline h-4 w-4 mr-1" />
                Confirma con tu contraseña
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ingresa tu contraseña actual"
                autoFocus
              />
            </div>

            {message && message.type === 'error' && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-700 mb-4">
                <MdError className="h-4 w-4 flex-shrink-0" />
                {message.text}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setMessage(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de edición */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          {/* Info de cómo obtener credenciales */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <MdInfoOutline className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-2">
                <p className="font-medium">¿Cómo obtener tus credenciales?</p>
                <ol className="list-decimal ml-4 space-y-1 text-blue-700">
                  <li>
                    Ingresa a{' '}
                    <a
                      href="https://www.mercadopago.com.ar/developers/panel/app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium inline-flex items-center gap-1"
                    >
                      Mercado Pago Developers <MdOpenInNew className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Crea una aplicación o selecciona la existente</li>
                  <li>Ve a <strong>Credenciales de producción</strong> (o de test para pruebas)</li>
                  <li>Copia la <strong>Public Key</strong> y el <strong>Access Token</strong></li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">
                  Las credenciales se almacenan encriptadas en la base de datos.
                </p>
              </div>
            </div>
          </div>

          {/* Aviso de seguridad */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <MdLock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Operación sensible</p>
                <p className="text-amber-700 text-xs mt-1">
                  Cambiar las credenciales de pago redirige todos los pagos futuros. Por seguridad, deberás confirmar con tu contraseña.
                </p>
              </div>
            </div>
          </div>

          {/* Public Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Public Key *
            </label>
            <div className="relative">
              <input
                type={showPublicKey ? 'text' : 'password'}
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="APP_USR-xxxx... o TEST-xxxx..."
              />
              <button
                type="button"
                onClick={() => setShowPublicKey(!showPublicKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPublicKey ? <MdVisibilityOff className="h-4 w-4" /> : <MdVisibility className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token *
            </label>
            <div className="relative">
              <input
                type={showAccessToken ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="APP_USR-xxxx... o TEST-xxxx..."
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showAccessToken ? <MdVisibilityOff className="h-4 w-4" /> : <MdVisibility className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook Secret (Firma de Notificaciones) *
            </label>
            <div className="relative">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ingresa el Webhook Secret de Mercado Pago"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showWebhookSecret ? <MdVisibilityOff className="h-4 w-4" /> : <MdVisibility className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Contraseña actual */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MdLock className="inline h-4 w-4 mr-1" />
              Tu contraseña actual *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Confirma con tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <MdVisibilityOff className="h-4 w-4" /> : <MdVisibility className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Requerida para confirmar cambios en credenciales de pago
            </p>
          </div>

          {/* Mensaje */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
              {message.type === 'success' ? (
                <MdCheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <MdError className="h-4 w-4 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 justify-end pt-2">
            {status.configured && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setPublicKey('');
                  setAccessToken('');
                  setCurrentPassword('');
                  setMessage(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Validando y guardando...' : 'Guardar credenciales'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default MercadoPagoSettings;
