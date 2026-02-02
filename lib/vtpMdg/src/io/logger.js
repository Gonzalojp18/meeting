const fs = require('fs');
const path = require('path');
const config = require('../config');
const bus = require('./events');

// Helper to format timestamps
function ts() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
}

async function appendLog(printerName, message) {
    const line = `[${ts()}] [${printerName}] ${message}\n`;

    // Console
    process.stdout.write(line);

    // File
    const file = path.join(config.LOG_DIR, `${printerName}.log`);
    try {
        await fs.promises.appendFile(file, line);
        bus.emit('log', { printer: printerName, message });
    } catch (err) {
        console.error(`Failed to write log for ${printerName}:`, err.message);
    }
}

async function tailLog(printerName, n = 100) {
    const file = path.join(config.LOG_DIR, `${printerName}.log`);
    try {
        if (!fs.existsSync(file)) return "";
        // Simple implementation: read whole file, take last N lines.
        // For massive logs, this is inefficient but fine for a simulator.
        const content = await fs.promises.readFile(file, 'utf8');
        const lines = content.trim().split('\n');
        return lines.slice(-n).join('\n');
    } catch (err) {
        return `Error reading log: ${err.message}`;
    }
}

module.exports = {
    log: appendLog,
    tail: tailLog
};
