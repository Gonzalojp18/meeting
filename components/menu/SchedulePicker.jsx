'use client';

import { useState, useEffect, useCallback } from 'react';
import { MdChevronLeft, MdChevronRight, MdAccessTime, MdCalendarToday, MdWarning } from 'react-icons/md';
import API_URI from '@/utils/getApiUri';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function SchedulePicker({ locationId, onSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [dayOpen, setDayOpen] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async (dateStr) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URI}/api/locations/${locationId}/scheduled-slots?date=${dateStr}`
      );
      if (!res.ok) {
        setSlots([]);
        setDayOpen(false);
        return;
      }
      const data = await res.json();
      setSlots(data.slots || []);
      setDayOpen(data.dayOpen);
    } catch {
      setSlots([]);
      setDayOpen(false);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedTime(null);
    fetchSlots(dateStr);
  };

  const handleTimeSelect = (time) => {
    if (!selectedDate) return;
    setSelectedTime(time);
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(selectedDate + 'T00:00:00');
    date.setHours(hours, minutes, 0, 0);
    onSelect(date.toISOString());
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const isDateDisabled = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateStr + 'T00:00:00');
    return date < new Date(todayStr + 'T00:00:00') || dateStr > maxDateStr;
  };

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>
            <MdChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className="font-semibold text-sm">
            {MONTH_NAMES[month]} {year}
          </span>
          <button type="button" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>
            <MdChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map(day => (
            <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const disabled = isDateDisabled(day);
            const selected = selectedDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === todayStr;

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => handleDateSelect(
                  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                )}
                className={`h-9 rounded-lg text-sm font-medium transition-all
                  ${selected ? 'bg-gray-900 text-white' : disabled ? 'text-gray-300 cursor-not-allowed' : isToday ? 'ring-2 ring-orange-400 text-gray-900 hover:bg-gray-200' : 'text-gray-700 hover:bg-gray-200'}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MdAccessTime size={16} className="text-gray-500" />
            <span className="font-semibold text-sm">Horarios disponibles</span>
          </div>

          {loading ? (
            <div className="py-6 text-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : !dayOpen ? (
            <div className="flex items-center gap-2 py-4 text-center text-sm text-gray-500">
              <MdWarning size={16} />
              <span>El local está cerrado en este día</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">
              No hay horarios disponibles
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map(slot => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => handleTimeSelect(slot.time)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all
                    ${selectedTime === slot.time
                      ? 'bg-gray-900 text-white'
                      : slot.available
                        ? 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-100'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selection Summary */}
      {selectedDate && selectedTime && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 text-white">
          <MdCalendarToday size={16} />
          <span className="text-sm font-medium">
            {formatDateReadable(selectedDate)} a las {selectedTime} hs
          </span>
        </div>
      )}
    </div>
  );
}

function formatDateReadable(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  const dayName = DAY_NAMES[date.getDay()];
  return `${dayName} ${day} ${month}`;
}
