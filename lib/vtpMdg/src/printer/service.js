const config = require('../config');
const Printer = require('./printer');
const logger = require('../io/logger');
const fs = require('fs');
const path = require('path');

class PrinterService {
    constructor() {
        this.printers = new Map(); // name -> Printer instance
    }

    async init() {
        const list = config.loadPrinters();
        for (const cfg of list) {
            await this.addPrinter(cfg, false);
        }
    }

    getPrinters() {
        return Array.from(this.printers.values()).map(p => p.config);
    }

    getPrinter(name) {
        return this.printers.get(name);
    }

    async addPrinter(cfg, save = true) {
        if (this.printers.has(cfg.name)) {
            throw new Error(`Printer ${cfg.name} already exists.`);
        }
        if (this.printers.size >= 10) {
            throw new Error("Max 10 printers reached.");
        }
        for (const p of this.printers.values()) {
            if (p.config.tcpPort === cfg.tcpPort) {
                throw new Error(`Port ${cfg.tcpPort} is already in use by ${p.config.name}`);
            }
        }

        const p = new Printer(cfg);
        this.printers.set(cfg.name, p);
        await p.start();

        if (save) this._persist();
        return p;
    }

    async removePrinter(name) {
        if (!this.printers.has(name)) {
            throw new Error(`Printer ${name} not found.`);
        }
        if (this.printers.size <= 1) {
            throw new Error("Cannot remove the last printer.");
        }

        const p = this.printers.get(name);
        await p.stop();
        this.printers.delete(name);

        this._persist();
    }

    async updatePrinter(oldName, newCfg) {
        const p = this.printers.get(oldName);
        if (!p) throw new Error("Printer not found");

        // Validate constraints
        // If changing name, check conflict
        if (newCfg.name !== oldName && this.printers.has(newCfg.name)) {
            throw new Error(`Name ${newCfg.name} already exists.`);
        }

        // If changing port, check conflict
        if (newCfg.tcpPort !== p.config.tcpPort) {
            for (const other of this.printers.values()) {
                if (other.config.name !== oldName && other.config.tcpPort === newCfg.tcpPort) {
                    throw new Error(`Port ${newCfg.tcpPort} is already in use.`);
                }
            }
        }

        // Stop old
        await p.stop();
        this.printers.delete(oldName);

        // Start new
        try {
            const newP = new Printer(newCfg);
            this.printers.set(newCfg.name, newP);
            await newP.start();
        } catch (e) {
            // Try to revert? for now just throw, but state might be inconsistent if start fails. 
            // In sim it's usually fine. 
            throw e;
        }

        this._persist();
    }

    async resetPrinter(name) {
        const p = this.printers.get(name);
        if (!p) throw new Error("Printer not found");

        const def = {
            ...p.config,
            paper: 58,
            columns: 32
        };
        await this.updatePrinter(name, def);
    }

    async resetAll() {
        const all = Array.from(this.printers.keys());
        for (const name of all) {
            await this.printers.get(name).stop();
        }
        this.printers.clear();

        const def = config.generateDefaultPrinter(1);
        const p = new Printer(def);
        this.printers.set(def.name, p);
        await p.start();

        this._persist();
    }

    async clearJobs(name) {
        const dir = path.join(config.OUT_DIR, name);
        if (fs.existsSync(dir)) {
            const files = await fs.promises.readdir(dir);
            await Promise.all(files.map(f => fs.promises.unlink(path.join(dir, f))));
        }
    }

    async deleteJob(name, jobId) {
        const dir = path.join(config.OUT_DIR, name);
        if (!fs.existsSync(dir)) return;

        // Delete all related files: .txt, .html, .svg, .raw
        const extensions = ['.txt', '.html', '.svg', '.raw'];
        for (const ext of extensions) {
            const f = path.join(dir, `${jobId}${ext}`);
            if (fs.existsSync(f)) {
                await fs.promises.unlink(f);
            }
        }
    }

    async clearLogs(name) {
        const file = path.join(config.LOG_DIR, `${name}.log`);
        if (fs.existsSync(file)) {
            await fs.promises.truncate(file, 0);
        }
    }

    _persist() {
        const list = Array.from(this.printers.values()).map(p => p.config);
        config.savePrinters(list);
    }
}

module.exports = new PrinterService();
