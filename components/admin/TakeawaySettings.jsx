'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MdSchedule, MdCheckCircle, MdError } from 'react-icons/md';
import { DEFAULT_TAKEAWAY_HOURS } from '@/utils/constants';

const TakeawaySettings = () => {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [hours, setHours] = useState(DEFAULT_TAKEAWAY_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      const res = await fetch('/api/settings/takeaway-hours', {
        cache: 'no-store' // Evitar cache para siempre obtener datos frescos
      });
      const data = await res.json();
      setHours({
        open: data.open || DEFAULT_TAKEAWAY_HOURS.open,
        close: data.close || DEFAULT_TAKEAWAY_HOURS.close
      });
    } catch (error) {
      console.error('Error fetching takeaway hours:', error);
      setHours(DEFAULT_TAKEAWAY_HOURS);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/takeaway-hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(hours),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Horarios guardados correctamente' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch (error) {
      console.error('Error saving takeaway hours:', error);
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="border-t pt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-100 rounded-lg">
          <MdSchedule className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Horarios de Takeaway</h3>
          <p className="text-sm text-gray-500">
            Configura el horario en que los clientes pueden hacer pedidos takeaway
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hora de apertura
            </label>
            <input
              type="time"
              value={hours.open}
              onChange={(e) => setHours({ ...hours, open: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hora de cierre
            </label>
            <input
              type="time"
              value={hours.close}
              onChange={(e) => setHours({ ...hours, close: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              required
            />
          </div>
        </div>

        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-sm text-orange-700">
            <span className="font-semibold">Horario actual:</span> {hours.open}hs a {hours.close}hs.
            Fuera de este horario, los clientes no podrán hacer pedidos takeaway.
          </p>
        </div>

        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <MdCheckCircle size={18} /> : <MdError size={18} />}
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Guardando...
            </>
          ) : (
            'Guardar Horarios'
          )}
        </button>
      </form>
    </div>
  );
};

export default TakeawaySettings;
