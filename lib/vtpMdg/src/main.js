const config = require('./config');
const printerService = require('./printer/service');
const http = require('./io/http');
const logger = require('./io/logger');

const shutdown = async () => {
    logger.log('system', 'Shutting down...');
    const printers = printerService.getPrinters();
    for (const cfg of printers) {
        const p = printerService.getPrinter(cfg.name);
        if (p) await p.stop();
    }
    process.exit(0);
};

async function main() {
    try {
        // 1. Ensure directories
        config.ensureDirs();

        // 2. Start Printer Service (loads config, binders ports)
        logger.log('system', 'Starting Printer Service...');
        await printerService.init();

        // 3. Start HTTP Server
        logger.log('system', 'Starting HTTP / Web Server...');
        try {
            await http.start();
        } catch (httpErr) {
            logger.log('system', `HTTP Server failed: ${httpErr.message}. Cleaning up printers...`);
            const printers = printerService.getPrinters();
            for (const cfg of printers) {
                const p = printerService.getPrinter(cfg.name);
                if (p) await p.stop();
            }
            throw httpErr;
        }

        logger.log('system', 'Ready.');
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

// Handle signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
