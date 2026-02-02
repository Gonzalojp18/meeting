# ESC/POS Printer Simulator

A lightweight, zero-dependency Node.js service that simulates multiple thermal ESC/POS printers. It accepts raw TCP connections (just like real hardware) and generates visual outputs (`.txt`, `.html`, `.svg`) for every print job.

Ideal for developing Point of Sale (POS) applications without wasting paper or owning physical hardware.

## Features

- **Multi-Printer Simulation**: Run 1 to 10 virtual printers simultaneously.
- **TCP Socket Server**: Each printer listens on its own dedicated port (default `9100`+).
- **Web Management UI**: Dashboard to add/remove printers, view real-time logs, and preview tickets.
- **Zero Dependencies**: Built with 100% native Node.js modules (net, http, fs).
- **Persistent State**: Configuration and logs persist across restarts.
- **Visual Output**: Instantly view printed receipts as HTML or SVG in the browser.

## Requirements

- **Node.js**: v18 or newer
- **Docker** (optional, recommended for deployment)

## Quick Start

### Running Locally

1. **Start the server**:
   ```bash
   node src/main.js
   ```

2. **Open the Dashboard**:
   Go to [http://localhost:2026](http://localhost:2026)

3. **Print a Test**:
   Use `netcat` (nc) or your POS application to send data to localhost port 9100.
   ```bash
   echo "Hello World" | nc localhost 9100
   ```

### Running with Docker

1. **Build and Run**:
   ```bash
   docker-compose up -d --build
   ```

2. **Access**:
   - Web UI: http://localhost:2026
   - Printer 1: TCP 9100
### Running in Background (Production)

To run the simulator as a background service (daemon), use the provided helper script:

```bash
./run-bg.sh
```

Or manually:
```bash
docker build -t vtpmdg-escpos-sim .
docker run -d \
  --name vtp-sim \
  --restart unless-stopped \
  -p 3000:2026 \
  -p 9100-9110:9100-9110 \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/out:/app/out \
  -v $(pwd)/logs:/app/logs \
  vtpmdg-escpos-sim
```

1. **Stop**: `docker stop vtp-sim`
2. **Logs**: `docker logs -f vtp-sim`

## Configuration

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `3000` | Port for the Web Dashboard & API |
| `CONFIG_DIR` | `/app/config` | Directory to store `printers.json` |
| `OUT_DIR` | `/app/out` | Directory for generated job files |
| `LOG_DIR` | `/app/logs` | Directory for printer logs |
| `IDLE_FLUSH_MS` | `500` | Time to wait after data stops to finalize job |

### Printer Configuration
Printers are stored in `config/printers.json`. You can modify this via the Web UI.

Each printer has:
- **Name**: Unique identifier (e.g., "Kitchen").
- **TCP Port**: Dedicated port (e.g., 9100).
- **Paper Width**: 58mm or 80mm.
- **Columns**: Max characters per line (typically 32 or 48).

## Usage Guide

### Sending Print Jobs
The simulator listens for raw bytes. You can send text or ESC/POS binary data.

**Example (Node.js)**
```javascript
const net = require('net');
const client = new net.Socket();

client.connect(9100, 'localhost', () => {
  // Initialize + Center + Bold + Text + Cut
  const buffer = Buffer.from([
    0x1b, 0x40,             // Init
    0x1b, 0x61, 0x01,       // Center Align
    0x1b, 0x45, 0x01,       // Bold On
    ...Buffer.from('SALE!'),
    0x0a,                   // LF
    0x1d, 0x56, 0x01        // Cut
  ]);
  client.write(buffer);
  client.end();
});
```

### Supported Commands
The simulator implements a subset of the ESC/POS standard:
- **Text**: UTF-8 text runs.
- **Formatting**: Bold (`ESC E`), Align (`ESC a`), Size/Scale (`GS !`).
- **Control**: Cut (`GS V`), Init (`ESC @`).
- **Images**: Placeholders only (decoded metadata, but content is skipped).

## Advanced Networking

### Specific IP Binding
You can configure a printer to listen on a specific interface (e.g., `192.168.1.50`) instead of all interfaces (`0.0.0.0`). This allows simulating multiple printers on one machine using IP aliases.

### Docker Cluster Mode
To verify multi-node setups with distinct IPs:
```bash
docker-compose -f docker-compose.ips.yml up
```
This spawns independent containers at `172.20.0.10` and `172.20.0.11`.

## API Reference
The application exposes a REST API on port 2026.
See [API.md](API.md) for full documentation.

**Key Endpoints:**
- `GET /api/printers`
- `GET /api/events` (SSE Stream)
- `POST /api/printers/:name/error` (Simulate Errors)

## Directories
- **`src/`**: Source code.
- **`out/`**: Generated artifacts (`.txt`, `.html`, `.svg`, `.raw`).
- **`logs/`**: Logs per printer.
- **`config/`**: JSON configuration database.

## License
MIT
