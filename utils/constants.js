// Constantes globales de la aplicación

// Horarios de takeaway por defecto
// IMPORTANTE: Este es el único lugar donde se define el default
// Si la BD no tiene horarios configurados, se usarán estos valores
export const DEFAULT_TAKEAWAY_HOURS = {
    open: '08:30',
    close: '20:30'
};

// Timezone de Argentina para validaciones de horario
export const TIMEZONE_ARGENTINA = 'America/Argentina/Buenos_Aires';

// Función helper para obtener la hora actual en formato HH:MM (Argentina)
export const getCurrentTimeArgentina = () => {
    return new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: TIMEZONE_ARGENTINA
    });
};

// Función helper para verificar si está dentro del horario
export const isWithinTakeawayHours = (hours) => {
    const now = getCurrentTimeArgentina();
    const { open, close } = hours || DEFAULT_TAKEAWAY_HOURS;

    // Manejo especial para horarios que cruzan medianoche (ej: 20:00 - 02:00)
    if (close < open) {
        // Si cierra después de medianoche
        return now >= open || now <= close;
    }

    return now >= open && now <= close;
};
