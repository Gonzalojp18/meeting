import * as net from 'node:net';

/**
 * Comandos básicos ESC/POS Standard
 */
export const ESC_POS = {
    INIT: Buffer.from([0x1b, 0x40]),
    CUT: Buffer.from([0x1d, 0x56, 0x01]),
    BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]),
    BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]),
    ALIGN_LEFT: Buffer.from([0x1b, 0x61, 0x00]),
    ALIGN_CENTER: Buffer.from([0x1b, 0x61, 0x01]),
    ALIGN_RIGHT: Buffer.from([0x1b, 0x61, 0x02]),
    TEXT_SIZE_NORMAL: Buffer.from([0x1d, 0x21, 0x00]),
    TEXT_SIZE_LARGE: Buffer.from([0x1d, 0x21, 0x11]),
};

/**
 * Envía ESC/POS por TCP a una impresora (9100).
 * Handshake soft-fail para que no bloquee impresoras que no responden DLE EOT.
 */
export async function sendToPrinter(
    ip,
    port,
    dataBuffer,
    timeout = 5000,
    skipStatusCheck = false,
    opts = {
        failOnCoverOpen: false,
        handshakeWaitMs: 300,
    }
) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();

        let done = false;
        let payloadSent = false;
        let statusChecked = skipStatusCheck;

        let statusBuf = Buffer.alloc(0);
        let handshakeTimer = null;

        const finishOk = () => {
            if (done) return;
            done = true;
            try { client.destroy(); } catch { }
            resolve({ success: true });
        };

        const finishErr = (msg, errOrCode) => {
            if (done) return;
            done = true;
            try { client.destroy(); } catch { }

            if (errOrCode instanceof Error) return reject(errOrCode);

            const e = new Error(msg);
            if (typeof errOrCode === 'string') e.code = errOrCode;
            reject(e);
        };

        const clearHandshakeTimer = () => {
            if (handshakeTimer) {
                clearTimeout(handshakeTimer);
                handshakeTimer = null;
            }
        };

        const writePayloadOnce = () => {
            if (payloadSent || done) return;
            payloadSent = true;
            clearHandshakeTimer();

            client.write(dataBuffer, (err) => {
                if (err) return finishErr(`Error write: ${err.message}`, err);

                client.end();
                setTimeout(finishOk, 150);
            });
        };

        client.setTimeout(timeout);

        client.connect(port, ip, () => {
            if (skipStatusCheck) return writePayloadOnce();

            client.write(Buffer.from([0x10, 0x04, 0x01])); // DLE EOT 1
            setTimeout(() => {
                client.write(Buffer.from([0x10, 0x04, 0x04])); // DLE EOT 4
            }, 40);

            handshakeTimer = setTimeout(() => {
                if (!statusChecked && !payloadSent && !done) {
                    statusChecked = true;
                    writePayloadOnce();
                }
            }, Math.max(50, opts.handshakeWaitMs ?? 300));
        });

        client.on('data', (chunk) => {
            if (statusChecked || done) return;

            statusBuf = Buffer.concat([statusBuf, chunk]);
            if (statusBuf.length < 2) return;

            clearHandshakeTimer();

            const printerStatus = statusBuf[0];
            const paperStatus = statusBuf[1];

            if ((paperStatus & 0x60) === 0x60) {
                return finishErr('Impresora sin papel', 'PRINTER_NO_PAPER');
            }

            // Cover Open check removed per request
            // if (opts?.failOnCoverOpen && (printerStatus & 0x04) === 0x04) {
            //     return finishErr('Tapa de la impresora abierta', 'PRINTER_COVER_OPEN');
            // }

            statusChecked = true;
            writePayloadOnce();
        });

        client.on('timeout', () => {
            if (payloadSent) return finishOk();
            finishErr('Timeout: La impresora no respondió', 'ETIMEDOUT');
        });

        client.on('error', (err) => {
            if (payloadSent && (err.code === 'ECONNRESET' || err.code === 'EPIPE')) {
                return finishOk();
            }
            finishErr(`Error: ${err.message}`, err);
        });

        client.on('close', (hadError) => {
            if (payloadSent) return finishOk();
            if (!done) {
                finishErr(
                    hadError ? 'Conexión cerrada con error' : 'Conexión cerrada antes de imprimir',
                    hadError ? 'ECONNABORTED' : 'ECONN_CLOSED'
                );
            }
        });
    });
}