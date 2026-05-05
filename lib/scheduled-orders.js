import Order from '@/models/Order';
import Menu from '@/models/Menu';
import Settings from '@/models/Settings';
import { DEFAULT_TAKEAWAY_HOURS } from '@/utils/constants';

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isItemAvailableAtTime(itemAvailabilityMode, itemSchedule, dayOfWeek, minutes) {
  if (!itemAvailabilityMode || itemAvailabilityMode === 'always') return true;
  if (!itemSchedule?.length) return false;
  return itemSchedule.some(slot => {
    if (!slot.days.includes(dayOfWeek)) return false;
    const startMin = timeToMinutes(slot.timeStart);
    const endMin = timeToMinutes(slot.timeEnd);
    return minutes >= startMin && minutes <= endMin;
  });
}

export async function validateScheduledPickupTime(locationId, scheduledPickupAt, menuItems) {
  const menu = await Menu.findOne().lean();
  if (!menu) {
    return { valid: false, error: 'Menú no encontrado' };
  }

  const location = menu.locations?.find(l => l.nameId === locationId);
  if (!location) {
    return { valid: false, error: 'Sede no encontrada' };
  }

  const config = location.scheduledOrdersConfig;
  if (!config?.enabled) {
    return { valid: false, error: 'Los pedidos programados no están habilitados en esta sede' };
  }

  const now = new Date();
  const scheduled = new Date(scheduledPickupAt);

  if (scheduled <= now) {
    return { valid: false, error: 'La fecha programada debe ser en el futuro' };
  }

  const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);

  if (diffMinutes < config.minAdvanceMinutes) {
    return {
      valid: false,
      error: `Debés programar con al menos ${config.minAdvanceMinutes} minutos de anticipación`,
    };
  }

  const maxAdvanceMs = config.maxAdvanceHours * 60 * 60 * 1000;
  if (scheduled.getTime() - now.getTime() > maxAdvanceMs) {
    return {
      valid: false,
      error: `Solo podés programar hasta ${config.maxAdvanceHours} horas adelante`,
    };
  }

  const takeawayHours = await Settings.getValue('takeawayHours') || DEFAULT_TAKEAWAY_HOURS;
  const openMin = timeToMinutes(takeawayHours.open);
  const closeMin = timeToMinutes(takeawayHours.close);
  const scheduledMin = scheduled.getHours() * 60 + scheduled.getMinutes();

  if (scheduledMin < openMin || scheduledMin > closeMin) {
    return { valid: false, error: 'El horario seleccionado está fuera del horario de atención' };
  }

  if (menuItems && menuItems.length > 0) {
    const dayOfWeek = scheduled.getDay();
    for (const item of menuItems) {
      if (!isItemAvailableAtTime(item.availabilityMode, item.availabilitySchedule, dayOfWeek, scheduledMin)) {
        return { valid: false, error: 'Uno o más items no están disponibles en el horario seleccionado' };
      }
    }
  }

  const slotStart = new Date(scheduled);
  slotStart.setMinutes(Math.floor(slotStart.getMinutes() / config.slotDurationMinutes) * config.slotDurationMinutes, 0, 0);
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + config.slotDurationMinutes);

  const ordersInSlot = await Order.countDocuments({
    'location.locationId': locationId,
    scheduledPickupAt: { $gte: slotStart, $lt: slotEnd },
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
    scheduledStatus: { $in: ['pending_schedule', 'active', null] },
  });

  if (config.maxOrdersPerSlot > 0 && ordersInSlot >= config.maxOrdersPerSlot) {
    return { valid: false, error: 'No hay disponibilidad en ese horario. Elegí otro.' };
  }

  return { valid: true };
}

export async function getAvailableSlotsForDate(locationId, dateStr) {
  const menu = await Menu.findOne().lean();
  if (!menu) {
    return { date: dateStr, dayOpen: false, slots: [] };
  }

  const location = menu.locations?.find(l => l.nameId === locationId);
  if (!location) {
    return { date: dateStr, dayOpen: false, slots: [] };
  }

  const config = location.scheduledOrdersConfig;
  if (!config?.enabled) {
    return { date: dateStr, dayOpen: false, slots: [] };
  }

  const targetDate = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const minAdvance = new Date(now.getTime() + config.minAdvanceMinutes * 60 * 1000);
  const maxAdvance = new Date(now.getTime() + config.maxAdvanceHours * 60 * 60 * 1000);

  const takeawayHours = await Settings.getValue('takeawayHours') || DEFAULT_TAKEAWAY_HOURS;
  const openMin = timeToMinutes(takeawayHours.open);
  const closeMin = timeToMinutes(takeawayHours.close);

  const slots = [];

  for (let min = openMin; min < closeMin; min += config.slotDurationMinutes) {
    const slotDate = new Date(targetDate);
    slotDate.setHours(Math.floor(min / 60), min % 60, 0, 0);

    if (slotDate < minAdvance) continue;
    if (slotDate > maxAdvance) continue;

    const slotEnd = new Date(slotDate);
    slotEnd.setMinutes(slotEnd.getMinutes() + config.slotDurationMinutes);

    const ordersCount = await Order.countDocuments({
      'location.locationId': locationId,
      scheduledPickupAt: { $gte: slotDate, $lt: slotEnd },
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
      scheduledStatus: { $in: ['pending_schedule', 'active', null] },
    });

    const available = config.maxOrdersPerSlot === 0 || ordersCount < config.maxOrdersPerSlot;

    const hours = Math.floor(min / 60);
    const mins = min % 60;
    slots.push({
      time: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
      available,
      ordersCount,
    });
  }

  slots.sort((a, b) => a.time.localeCompare(b.time));

  return { date: dateStr, dayOpen: slots.length > 0, slots };
}

export async function activateScheduledOrders() {
  const now = new Date();

  const menu = await Menu.findOne().lean();
  if (!menu) return { activated: 0, expired: 0 };

  let activated = 0;
  let expired = 0;

  for (const location of menu.locations) {
    const config = location.scheduledOrdersConfig;
    if (!config?.enabled) continue;

    const gracePeriod = config.gracePeriodMinutes ?? 15;

    const toActivate = await Order.updateMany(
      {
        'location.locationId': location.nameId,
        orderTiming: 'scheduled',
        scheduledStatus: 'pending_schedule',
        scheduledPickupAt: { $lte: now },
        status: { $in: ['pending', 'confirmed'] },
      },
      { $set: { scheduledStatus: 'active' } }
    );
    activated += toActivate.modifiedCount;

    const toExpire = await Order.updateMany(
      {
        'location.locationId': location.nameId,
        orderTiming: 'scheduled',
        scheduledStatus: 'pending_schedule',
        scheduledPickupAt: { $lt: new Date(now.getTime() - gracePeriod * 60 * 1000) },
        status: { $in: ['pending', 'confirmed'] },
      },
      { $set: { scheduledStatus: 'expired' } }
    );
    expired += toExpire.modifiedCount;
  }

  return { activated, expired };
}
