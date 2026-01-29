'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MdSecurity, MdVisibility, MdVisibilityOff, MdCheckCircle, MdError, MdOpenInNew, MdDelete, MdInfoOutline } from 'react-icons/md';

const MercadoPagoSettings = () => {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [publicKey, setPublicKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [status, setStatus] = useState({ configured: false, mode: null, publicKey: '', accessToken: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

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
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ publicKey, accessToken }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setPublicKey('');
        setAccessToken('');
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
    if (!confirm('¿Eliminar las credenciales de Mercado Pago? Los pagos dejarán de funcionar.')) return;

    try {
      const res = await fetch('/api/settings/mercadopago', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Credenciales eliminadas' });
        setStatus({ configured: false, mode: null, publicKey: '', accessToken: '' });
        setIsEditing(true);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar' });
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
                onClick={handleDelete}
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
