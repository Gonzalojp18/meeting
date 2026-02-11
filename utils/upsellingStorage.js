/**
 * Gestión de localStorage para anti-repetición de upsellings.
 *
 * Reglas:
 * - Ocultar si < 1h desde último dismiss
 * - Ocultar si 3+ dismisses en las últimas 24h
 * - Entradas expiradas (>24h) se limpian automáticamente
 * - SSR-safe: retorna defaults seguros si window no existe
 */

const STORAGE_KEY = 'upselling_dismissals';
const ONE_HOUR = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const MAX_DISMISSALS_PER_DAY = 3;

function isSSR() {
    return typeof window === 'undefined';
}

/**
 * Lee y limpia entradas expiradas (>24h)
 */
export function getDismissedUpsellings() {
    if (isSSR()) return {};

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};

        const data = JSON.parse(raw);
        const now = Date.now();
        let changed = false;

        // Limpiar entradas expiradas
        for (const id of Object.keys(data)) {
            data[id] = data[id].filter(ts => now - ts < TWENTY_FOUR_HOURS);
            if (data[id].length === 0) {
                delete data[id];
                changed = true;
            }
        }

        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }

        return data;
    } catch {
        return {};
    }
}

/**
 * Registra un dismiss de un upselling
 */
export function recordDismissal(upsellingId) {
    if (isSSR()) return;

    try {
        const data = getDismissedUpsellings();
        if (!data[upsellingId]) {
            data[upsellingId] = [];
        }
        data[upsellingId].push(Date.now());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage no disponible, silently fail
    }
}

/**
 * Determina si un upselling debe ocultarse.
 * Reglas: ocultar si < 1h desde dismiss, o si 3+ dismisses hoy.
 */
export function shouldHideUpselling(upsellingId) {
    if (isSSR()) return false;

    try {
        const data = getDismissedUpsellings();
        const timestamps = data[upsellingId];
        if (!timestamps || timestamps.length === 0) return false;

        const now = Date.now();

        // Regla 1: ocultar si último dismiss fue hace menos de 1 hora
        const lastDismiss = Math.max(...timestamps);
        if (now - lastDismiss < ONE_HOUR) return true;

        // Regla 2: ocultar si 3+ dismisses en las últimas 24h
        if (timestamps.length >= MAX_DISMISSALS_PER_DAY) return true;

        return false;
    } catch {
        return false;
    }
}

/**
 * Filtra un array de upsellings, removiendo los que deben ocultarse.
 */
export function filterDismissedUpsellings(upsellings) {
    if (isSSR() || !upsellings) return upsellings;

    return upsellings.filter(u => {
        const id = u._id?.toString() || u._id;
        return !shouldHideUpselling(id);
    });
}
