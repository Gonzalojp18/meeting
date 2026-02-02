const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure printer output directory exists
async function ensurePrinterDir(printerName) {
    const dir = path.join(config.OUT_DIR, printerName);
    await fs.promises.mkdir(dir, { recursive: true });
    return dir;
}

async function saveJobFile(printerName, fileName, content, encoding = 'utf8') {
    const dir = await ensurePrinterDir(printerName);
    const filePath = path.join(dir, fileName);
    await fs.promises.writeFile(filePath, content, encoding);
    return filePath;
}

module.exports = {
    saveJobFile
};
