/**
 * Helpers para el motor de upselling inteligente.
 *
 * - shuffleWithinPriority: Rotación aleatoria dentro del mismo nivel de prioridad
 * - computeScore: Calcula score combinando prioridad + tasa de conversión
 * - weightedShuffleByPriority: Shuffle ponderado por score (prioridad + conversión)
 */

/**
 * Fisher-Yates shuffle in-place
 */
function fisherYates(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Agrupa items por prioridad, shuffle dentro de cada grupo, re-concatena en orden DESC.
 * Resultado: el orden de prioridad se respeta, pero dentro del mismo nivel es aleatorio.
 */
export function shuffleWithinPriority(items) {
    if (!items || items.length <= 1) return items;

    // Agrupar por prioridad
    const groups = {};
    for (const item of items) {
        const p = item.priority ?? 0;
        if (!groups[p]) groups[p] = [];
        groups[p].push(item);
    }

    // Ordenar prioridades DESC y shuffle dentro de cada grupo
    const sortedPriorities = Object.keys(groups)
        .map(Number)
        .sort((a, b) => b - a);

    const result = [];
    for (const p of sortedPriorities) {
        result.push(...fisherYates(groups[p]));
    }

    return result;
}

/**
 * Calcula score de un upselling combinando prioridad y tasa de conversión.
 * Usa cálculo manual de conversionRate porque .lean() no incluye virtuals.
 *
 * @param {Object} item - Upselling document (lean)
 * @returns {number} Score combinado
 */
export function computeScore(item) {
    const priority = item.priority ?? 0;

    // Calcular conversion rate manualmente (el virtual no está disponible en .lean())
    const impressions = item.metrics?.impressions || 0;
    const clicks = item.metrics?.clicks || 0;
    const conversionRate = impressions > 0 ? clicks / impressions : 0;

    // priority domina, conversión es un tiebreaker dentro del mismo nivel
    return priority + (conversionRate * 0.1);
}

/**
 * Shuffle ponderado: dentro de cada nivel de prioridad, items con mejor conversión
 * tienen más probabilidad de aparecer primero, pero no es determinístico.
 *
 * Items con 0 impressions reciben peso mínimo 0.1 (cold-start friendly).
 */
export function weightedShuffleByPriority(items) {
    if (!items || items.length <= 1) return items;

    // Agrupar por prioridad
    const groups = {};
    for (const item of items) {
        const p = item.priority ?? 0;
        if (!groups[p]) groups[p] = [];
        groups[p].push(item);
    }

    // Ordenar prioridades DESC
    const sortedPriorities = Object.keys(groups)
        .map(Number)
        .sort((a, b) => b - a);

    const result = [];
    for (const p of sortedPriorities) {
        result.push(...weightedShuffle(groups[p]));
    }

    return result;
}

/**
 * Weighted random shuffle de un array.
 * Cada item se selecciona sin reemplazo con probabilidad proporcional a su score.
 */
function weightedShuffle(items) {
    if (items.length <= 1) return items;

    const remaining = items.map(item => {
        const impressions = item.metrics?.impressions || 0;
        const clicks = item.metrics?.clicks || 0;
        const conversionRate = impressions > 0 ? clicks / impressions : 0;
        // Peso mínimo 0.1 para cold-start
        const weight = Math.max(0.1, conversionRate);
        return { item, weight };
    });

    const result = [];
    while (remaining.length > 0) {
        const totalWeight = remaining.reduce((sum, r) => sum + r.weight, 0);
        let rand = Math.random() * totalWeight;

        let selectedIndex = 0;
        for (let i = 0; i < remaining.length; i++) {
            rand -= remaining[i].weight;
            if (rand <= 0) {
                selectedIndex = i;
                break;
            }
        }

        result.push(remaining[selectedIndex].item);
        remaining.splice(selectedIndex, 1);
    }

    return result;
}
