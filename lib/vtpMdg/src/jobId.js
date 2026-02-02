let jobSeq = 0;

function newJobId(printerName) {
    jobSeq++;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp =
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_` +
        `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    // Format: PrinterName_YYYYMMDD_HHMMSS_0001
    return `${printerName}_${stamp}_${String(jobSeq).padStart(4, "0")}`;
}

module.exports = { newJobId };
