const TcpServer = require('../io/tcp');
const JobQueue = require('./queue');
const jobIdGen = require('../jobId');
const parser = require('../escpos/parser');
const layout = require('../output/layout');
const txt = require('../output/txt');
const html = require('../output/html');
const svg = require('../output/svg');
const storage = require('../io/storage');
const logger = require('../io/logger');
const config = require('../config');
const bus = require('../io/events');

class Printer {

    constructor(cfg) {
        // cfg: { name, tcpPort, paper, columns }
        this.config = cfg;
        this.queue = new JobQueue();
        this.tcpServer = new TcpServer(this.config.name, this.config.tcpPort, this.config.bindIp, this._onData.bind(this));

        // Per-socket buffering state
        // Map<Socket, { buffer: Buffer, idleTimer: Timer }> 
        this.sockets = new Map();

        // Stats
        this.stats = {
            startTime: Date.now(),
            bytesReceived: 0,
            jobCount: 0
        };

        // Error Simulation Flags
        this.errorState = {
            paperOut: false,
            coverOpen: false
        };
    }

    async start() {
        await this.tcpServer.start();
    }

    async stop() {
        await this.tcpServer.stop();
    }

    setErrorState(key, val) {
        if (this.errorState.hasOwnProperty(key)) {
            this.errorState[key] = !!val;
        }
    }

    getDiagnostics() {
        // Basic network info
        let ip = '0.0.0.0';
        try {
            const address = this.tcpServer.server?.address();
            if (address) ip = address.address;
        } catch (e) { }

        return {
            status: this.tcpServer.server ? 'listening' : 'stopped',
            uptimeSeconds: Math.floor((Date.now() - this.stats.startTime) / 1000),
            activeConnections: this.tcpServer.connections.size,
            bytesReceived: this.stats.bytesReceived,
            jobCount: this.stats.jobCount,
            network: {
                port: this.config.tcpPort,
                ip: ip,
                family: 'IPv4/6'
            },
            errors: this.errorState
        };
    }

    _onData(socket, chunk, isFinal) {
        let state = this.sockets.get(socket);
        if (!state) {
            state = { buffer: Buffer.alloc(0), timer: null };
            this.sockets.set(socket, state);
        }

        // append data
        if (chunk && chunk.length > 0) {
            this.stats.bytesReceived += chunk.length;

            // Check for Real-time Status Command (DLE EOT n) -> 10 04 n
            for (let i = 0; i < chunk.length - 2; i++) {
                if (chunk[i] === 0x10 && chunk[i + 1] === 0x04) {
                    const n = chunk[i + 2];
                    let status = 0x00;

                    // n=1: Printer Status
                    if (n === 1) {
                        status = 0x16; // Ready
                        if (this.errorState.coverOpen) status |= 0x04; // bit 2: Cover open is not standard in n=1 but often mapped to offline
                    }
                    // n=2: Offline Status
                    else if (n === 2) {
                        if (this.errorState.coverOpen) status |= 0x04;
                        if (this.errorState.paperOut) status |= 0x20;
                        // If error, also set bit 3? (0x08)
                    }
                    // n=3: Error Status
                    else if (n === 3) {
                        // bit 6 = auto cutter error?
                    }
                    // n=4: Roll Paper Status
                    else if (n === 4) {
                        if (this.errorState.paperOut) status |= 0x60; // Paper empty
                    }

                    try { socket.write(Buffer.from([status])); } catch (e) { }
                }
            }

            // If simulated error exists, "block" printing? 
            // For sim, we allow receipt generation but maybe log a warning.

            state.buffer = Buffer.concat([state.buffer, chunk]);
        }

        const checkStatusCmd = (buf) => {
            // Check for GS r n (Transmit status) -> 1D 72 n
            const idx = buf.indexOf(Buffer.from([0x1d, 0x72]));
            if (idx !== -1 && idx + 2 < buf.length) {
                const n = buf[idx + 2];
                let status = 0x00;
                // n=1,49 : Paper sensor
                if (n === 1 || n === 49) {
                    if (this.errorState.paperOut) status = 0x0C; // Paper end
                }
                // n=2,50 : Drawer sensor
                try { socket.write(Buffer.from([status])); } catch (e) { }
            }
        };
        checkStatusCmd(state.buffer);

        const finalize = (reason) => {
            if (state.timer) clearTimeout(state.timer);

            const raw = state.buffer;
            if (raw.length === 0) return; // empty

            state.buffer = Buffer.alloc(0); // clear

            // Don't print if it's ONLY status commands (heuristics)
            if (raw.length <= 5 && (raw.includes(Buffer.from([0x10, 0x04])) || raw.includes(Buffer.from([0x1d, 0x72])))) {
                // It was just a status poll
                return;
            }

            const id = jobIdGen.newJobId(this.config.name);

            // Enqueue job processing
            this.queue.enqueue(async () => {
                try {
                    // Simulación de error de hardware: Bloquear impresión si no hay papel o tapa abierta
                    if (this.errorState.paperOut || this.errorState.coverOpen) {
                        const errorMsg = this.errorState.paperOut ? "PAPER_OUT" : "COVER_OPEN";
                        await logger.log(this.config.name, `JOB_BLOCKED ${id} error=${errorMsg}`);
                        bus.emit('printer_error', {
                            printer: this.config.name,
                            error: errorMsg,
                            timestamp: Date.now()
                        });
                        return; // Detener flujo
                    }

                    // Log start
                    await logger.log(this.config.name, `JOB_START ${id} reason=${reason} bytes=${raw.length}`);

                    // Parse
                    const tokens = parser.parse(raw);

                    // Layout
                    const effCols = this.config.columns || (this.config.paper === 58 ? 32 : (this.config.paperWidth === 80 ? 48 : 32));
                    const lines = layout.tokensToLines(tokens, effCols);

                    // Meta for renderers
                    const meta = {
                        name: this.config.name,
                        jobId: id,
                        time: new Date().toLocaleString(),
                        columns: effCols
                    };

                    // Render
                    const txtContent = txt.render(lines, meta);
                    const htmlContent = html.render(lines, meta);
                    const svgContent = svg.render(lines, meta);

                    // Save
                    await storage.saveJobFile(this.config.name, `${id}.raw`, raw);
                    await storage.saveJobFile(this.config.name, `${id}.txt`, txtContent);
                    await storage.saveJobFile(this.config.name, `${id}.html`, htmlContent);
                    await storage.saveJobFile(this.config.name, `${id}.svg`, svgContent);

                    this.stats.jobCount++;
                    await logger.log(this.config.name, `JOB_DONE ${id} lines=${lines.length}`);

                    bus.emit('job', {
                        type: 'job_done',
                        printer: this.config.name,
                        jobId: id,
                        timestamp: Date.now()
                    });

                    // Metrics update
                    bus.emit('metrics', {
                        type: 'update',
                        printer: this.config.name
                    });

                } catch (err) {
                    await logger.log(this.config.name, `JOB_FAIL ${id} ${err.message}`);
                }
            });
        };

        // Check for explicit "cut" command in the buffer => GS V (0x1D 0x56)
        // Simple check: does buffer contain 1D 56?
        const cutIdx = state.buffer.indexOf(Buffer.from([0x1d, 0x56]));
        if (cutIdx !== -1) {
            // If we found a cut, we finalize immediately.
            finalize("cut_command");
            return;
        }

        if (isFinal) {
            finalize("connection_end");
            this.sockets.delete(socket);
        } else {
            // Rearm idle timer
            if (state.timer) clearTimeout(state.timer);
            state.timer = setTimeout(() => {
                finalize("idle_timeout");
            }, config.IDLE_FLUSH_MS);
        }
    }
}

module.exports = Printer;
