import { sendToPrinter } from './client';
import { resolvePrinter } from '@/utils/printers';
import Printer from '@/models/Printer';

const RETRYABLE_CODES = new Set([
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'ENETUNREACH',
]);

const NEVER_RETRY_CODES = new Set([
    'ECONNRESET', // típico después de mandar payload
    'EPIPE',      // típico después de mandar payload
]);

const NEVER_RETRY_MESSAGES = [
    'Impresora sin papel',
    'Tapa de la impresora abierta',
    // si tu timeout sucede DESPUÉS de mandar payload, reintentar duplica.
    'Timeout: La impresora no respondió',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const backoff = (attempt) => (400 * attempt) + Math.floor(Math.random() * 100);

function shouldNeverRetry(err) {
    const code = err?.code;
    const msg = err?.message || '';
    if (code && NEVER_RETRY_CODES.has(code)) return true;
    if (NEVER_RETRY_MESSAGES.some(m => msg.includes(m))) return true;
    return false;
}

function shouldRetry(err) {
    const code = err?.code;
    return code ? RETRYABLE_CODES.has(code) : false;
}

/**
 * Job Manager (secuencial por UID)
 */
class JobManager {
    constructor() {
        this.queues = new Map();
    }

    async enqueue(printer, buffer, options = {}) {
        const uid = printer.uid;
        if (!uid) throw new Error('printer.uid requerido');

        if (!this.queues.has(uid)) this.queues.set(uid, Promise.resolve());

        const tail = this.queues.get(uid);

        const next = tail.then(async () => {
            console.log(`[QUEUE] Iniciando sub-job para ${printer.name} (${uid})`);

            const maxAttempts = options.maxAttempts ?? 2; // 👈 baja default, 3 es agresivo
            let attempt = 0;

            while (true) {
                attempt += 1;
                try {
                    return await sendToPrinter(
                        printer.ip,
                        printer.port,
                        buffer,
                        options.timeout ?? 5000,
                        options.skipStatusCheck ?? false,
                        options.sendOpts
                    );
                } catch (err) {
                    const code = err?.code || '';
                    const msg = err?.message || String(err);

                    // Nunca reintentar: duplica tickets
                    if (shouldNeverRetry(err)) {
                        console.warn(`[QUEUE] No-retry ${uid}: ${code} ${msg}`);
                        throw err;
                    }

                    // Si no es claramente conectividad, no reintentar
                    if (!shouldRetry(err) || attempt >= maxAttempts) {
                        console.warn(`[QUEUE] Fallo final ${uid} (attempt ${attempt}/${maxAttempts}): ${code} ${msg}`);
                        throw err;
                    }

                    console.warn(`[QUEUE] Retry ${attempt} para ${uid}: ${code} ${msg}`);

                    // SI ES ERROR DE CONECTIVIDAD, INTENTAR RE-RESOLVER IP AUTOMÁTICAMENTE
                    if (attempt === 1 && shouldRetry(err)) {
                        console.log(`[QUEUE] Intentando auto-resolver ubicación de ${uid}...`);
                        const newLocation = await resolvePrinter(uid);
                        if (newLocation) {
                            console.log(`[QUEUE] RE-UBICADO ${uid} -> ${newLocation.ip}:${newLocation.port}`);
                            printer.ip = newLocation.ip;
                            printer.port = newLocation.port;
                            // Actualizar DB para futuras impresiones
                            try {
                                await Printer.findOneAndUpdate({ uid }, {
                                    ip: newLocation.ip,
                                    port: newLocation.port,
                                    statusMessage: 'IP Auto-Resuelta'
                                });
                            } catch (dbErr) {
                                console.error('[QUEUE] Error actualizando DB tras resolución:', dbErr);
                            }
                        }
                    }

                    await sleep(backoff(attempt));
                }
            }
        });

        // Evita bloquear la cola si un job falla
        this.queues.set(uid, next.catch(() => undefined));

        return next;
    }
}

const globalJobManager = new JobManager();
export default globalJobManager;