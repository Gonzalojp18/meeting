const fs = require('fs');
const path = require('path');

// Global Env Vars
const HTTP_PORT = Number(process.env.HTTP_PORT || 2026);
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(__dirname, '../config');
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, '../out');
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');
const IDLE_FLUSH_MS = Number(process.env.IDLE_FLUSH_MS || 500);

const PRINTERS_FILE = path.join(CONFIG_DIR, 'printers.json');

// Factory Default Pinter
function generateDefaultPrinter(idx = 1) {
  return {
    name: `Printer_${idx}`,
    tcpPort: 9100 + (idx - 1),
    bindIp: '0.0.0.0',
    paper: 58,    // 58 or 80 (mm)
    columns: 32   // 32 or 48 typical
  };
}

// Ensure directories exist synchronously on startup (simple)
function ensureDirsSync() {
  [CONFIG_DIR, OUT_DIR, LOG_DIR].forEach(d => {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  });
}

function loadPrinters() {
  ensureDirsSync();
  if (fs.existsSync(PRINTERS_FILE)) {
    try {
      const data = fs.readFileSync(PRINTERS_FILE, 'utf8');
      const list = JSON.parse(data);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    } catch (e) {
      console.error("Failed to load printers config, using defaults:", e.message);
    }
  }
  return [generateDefaultPrinter(1)];
}

function savePrinters(list) {
  ensureDirsSync();
  fs.writeFileSync(PRINTERS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

module.exports = {
  HTTP_PORT,
  CONFIG_DIR,
  OUT_DIR,
  LOG_DIR,
  IDLE_FLUSH_MS,
  ensureDirs: ensureDirsSync,
  loadPrinters,
  savePrinters,
  generateDefaultPrinter
};
