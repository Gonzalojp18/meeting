const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const config = require('../config');
const printerService = require('../printer/service');
const logger = require('../io/logger');
const bus = require('./events');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain'
};

function sendJSON(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function sendError(res, err, status = 500) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || String(err) }));
}

async function handleApi(req, res, pathname) {
    const method = req.method;

    // GET /api/events (SSE)
    if (method === 'GET' && pathname === '/api/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // Heartbeat
        const hb = setInterval(() => res.write(': heartbeat\n\n'), 15000);

        // Event listener
        const onEvent = (type, data) => {
            res.write(`event: ${type}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        const handlers = {
            'job': d => onEvent('job', d),
            'metrics': d => onEvent('metrics', d),
            'log': d => onEvent('log', d)
        };

        bus.on('job', handlers.job);
        bus.on('metrics', handlers.metrics);
        bus.on('log', handlers.log);

        req.on('close', () => {
            clearInterval(hb);
            bus.off('job', handlers.job);
            bus.off('metrics', handlers.metrics);
            bus.off('log', handlers.log);
        });
        return;
    }

    // GET /api/metrics
    if (method === 'GET' && pathname === '/api/metrics') {
        const printers = printerService.getPrinters();
        let totalConns = 0;
        let totalBytes = 0;
        let totalJobs = 0;

        for (const cfg of printers) {
            const p = printerService.getPrinter(cfg.name);
            const stats = p.getDiagnostics();
            totalConns += stats.activeConnections;
            totalBytes += stats.bytesReceived;
            totalJobs += stats.jobCount;
        }
        return sendJSON(res, {
            activePrinters: printers.length,
            activeConnections: totalConns,
            totalBytes,
            totalJobs
        });
    }

    // GET /api/printers
    if (method === 'GET' && pathname === '/api/printers') {
        const list = printerService.getPrinters();
        return sendJSON(res, list);
    }

    // POST /api/printers
    if (method === 'POST' && pathname === '/api/printers') {
        const body = await readBody(req);
        try {
            await printerService.addPrinter(body);
            return sendJSON(res, { ok: true });
        } catch (e) {
            return sendError(res, e, 400);
        }
    }

    // PUT /api/printers/:name
    if (method === 'PUT' && pathname.startsWith('/api/printers/') && !pathname.endsWith('/error')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        const body = await readBody(req);
        try {
            await printerService.updatePrinter(name, body);
            return sendJSON(res, { ok: true });
        } catch (e) {
            return sendError(res, e, 400);
        }
    }

    // POST /api/printers/:name/error (Toggle Error State)
    if (method === 'POST' && pathname.endsWith('/error')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        const body = await readBody(req); // { key: 'paperOut', value: true }
        const p = printerService.getPrinter(name);
        if (p) {
            p.setErrorState(body.key, body.value);
            return sendJSON(res, { ok: true, state: p.errorState });
        }
        return sendError(res, { message: 'Not found' }, 404);
    }

    // POST /api/printers/:name/reset
    if (method === 'POST' && pathname.endsWith('/reset')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        try {
            await printerService.resetPrinter(name);
            return sendJSON(res, { ok: true });
        } catch (e) {
            return sendError(res, e, 400);
        }
    }

    // DELETE /api/printers/:name/jobs
    if (method === 'DELETE' && pathname.endsWith('/jobs')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        try {
            await printerService.clearJobs(name);
            return sendJSON(res, { ok: true });
        } catch (e) {
            return sendError(res, e, 400);
        }
    }

    // DELETE /api/printers/:name/jobs/:jobId
    if (method === 'DELETE' && pathname.includes('/jobs/') && !pathname.endsWith('/jobs')) {
        const parts = pathname.split('/');
        const name = decodeURIComponent(parts[3]);
        const jobId = decodeURIComponent(parts[5]);
        try {
            await printerService.deleteJob(name, jobId);
            return sendJSON(res, { ok: true });
        } catch (e) {
            return sendError(res, e, 400);
        }
    }

    // DELETE /api/printers/:name/logs
    if (method === 'DELETE' && pathname.endsWith('/logs')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        try {
            await printerService.clearLogs(name);
            return sendJSON(res, { ok: true });
        } catch (e) {
            return sendError(res, e, 400);
        }
    }

    // DELETE /api/printers/:name
    if (method === 'DELETE' && pathname.startsWith('/api/printers/')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        try {
            await printerService.removePrinter(name);
            return sendJSON(res, { ok: true });
        } catch (e) {
            return sendError(res, e, 400);
        }
    }

    // POST /api/reset-all
    if (method === 'POST' && pathname === '/api/reset-all') {
        try {
            await printerService.resetAll();
            return sendJSON(res, { ok: true });
        } catch (e) {
            return sendError(res, e, 400);
        }
    }

    // GET /api/printers/:name/jobs
    if (method === 'GET' && pathname.endsWith('/jobs')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        const dir = path.join(config.OUT_DIR, name);
        try {
            if (!fs.existsSync(dir)) return sendJSON(res, []);
            const files = await fs.promises.readdir(dir);
            const jobs = new Set();
            files.forEach(f => {
                const base = f.split('.')[0];
                if (base) jobs.add(base);
            });
            const sorted = Array.from(jobs).sort().reverse();
            return sendJSON(res, sorted);
        } catch (e) {
            return sendError(res, e);
        }
    }

    // GET /api/printers/:name/logs
    if (method === 'GET' && pathname.endsWith('/logs')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        try {
            const content = await logger.tail(name, 100);
            return sendJSON(res, { content });
        } catch (e) {
            return sendError(res, e);
        }
    }

    // GET /api/printers/:name/diagnostics
    if (method === 'GET' && pathname.endsWith('/diagnostics')) {
        const name = decodeURIComponent(pathname.split('/')[3]);
        const p = printerService.getPrinter(name);
        if (!p) return sendError(res, { message: 'Not found' }, 404);
        return sendJSON(res, p.getDiagnostics());
    }

    return sendError(res, { message: 'Not found' }, 404);
}

// Serve static
async function handleStatic(req, res, pathname) {
    if (pathname === '/') pathname = '/index.html';

    let file = null;
    if (pathname.endsWith('.html')) {
        file = path.join(__dirname, '../web/views', pathname);
    } else {
        file = path.join(__dirname, '../web/public', pathname);
    }

    if (pathname.startsWith('/out/')) {
        const rel = pathname.replace('/out/', '');
        file = path.join(config.OUT_DIR, rel);
    }

    try {
        const stat = await fs.promises.stat(file);
        if (stat.isFile()) {
            const ext = path.extname(file);
            const type = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': type });
            fs.createReadStream(file).pipe(res);
            return;
        }
    } catch (e) {
    }

    res.writeHead(404);
    res.end('Not found');
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) { reject(e); }
        });
        req.on('error', reject);
    });
}

function start() {
    const server = http.createServer(async (req, res) => {
        const parsed = url.parse(req.url, true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (parsed.pathname.startsWith('/api/')) {
            await handleApi(req, res, parsed.pathname);
        } else {
            await handleStatic(req, res, parsed.pathname);
        }
    });

    return new Promise(resolve => {
        server.listen(config.HTTP_PORT, () => {
            logger.log('system', `HTTP Server listening on ${config.HTTP_PORT}`);
            resolve(server);
        });
    });
}

module.exports = { start };
