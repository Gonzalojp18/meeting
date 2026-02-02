const net = require('net');
const logger = require('../io/logger');

class TcpServer {
    constructor(name, port, host, onDataCallback) {
        this.name = name;
        this.port = port;
        this.host = host || '0.0.0.0';
        this.onDataCallback = onDataCallback; // (socket, buffer, isFinal) => void
        this.server = null;
        this.connections = new Set();
    }

    async start() {
        // Try up to 10 ports
        for (let i = 0; i < 10; i++) {
            const currentPort = this.port + i;
            try {
                await this._listen(currentPort);
                this.port = currentPort; // Update actual port
                return;
            } catch (err) {
                if (err.code === 'EADDRINUSE') {
                    logger.log(this.name, `Port ${currentPort} busy, trying next...`);
                    continue;
                }
                throw err;
            }
        }
        throw new Error(`Could not find open port starting from ${this.port}`);
    }

    _listen(port) {
        return new Promise((resolve, reject) => {
            const server = net.createServer((socket) => this._handleConnection(socket));

            server.on('error', (err) => {
                // Only reject if it's a startup error. 
                // If running, we log. But here we are initializing.
                if (this.server === server) {
                    // This was the active server
                    reject(err);
                }
            });

            server.listen(port, () => {
                this.server = server;
                logger.log(this.name, `LISTEN port ${port}`);
                resolve();
            });
        });
    }

    async stop() {
        if (!this.server) return;

        // Destroy all active connections
        for (const socket of this.connections) {
            socket.destroy();
        }
        this.connections.clear();

        return new Promise((resolve) => {
            this.server.close(() => {
                logger.log(this.name, `CLOSED port ${this.port}`);
                this.server = null;
                resolve();
            });
        });
    }

    _handleConnection(socket) {
        const peer = `${socket.remoteAddress}:${socket.remotePort}`;
        logger.log(this.name, `CONNECT ${peer}`);
        this.connections.add(socket);

        socket.on('data', (chunk) => {
            if (this.onDataCallback) {
                this.onDataCallback(socket, chunk, false);
            }
        });

        socket.on('end', () => {
            if (this.onDataCallback) {
                this.onDataCallback(socket, Buffer.alloc(0), true); // Finalize signal
            }
            logger.log(this.name, `END ${peer}`);
        });

        socket.on('error', (err) => {
            logger.log(this.name, `SOCKET ERROR ${peer}: ${err.message}`);
        });

        socket.on('close', () => {
            this.connections.delete(socket);
            // Ensure we signal close if not already handled
            // But typically 'end' or logic in 'data' handles it. 
            // We might want to trigger a flush on close just in case.
            if (this.onDataCallback) {
                this.onDataCallback(socket, Buffer.alloc(0), true);
            }
        });
    }
}

module.exports = TcpServer;
