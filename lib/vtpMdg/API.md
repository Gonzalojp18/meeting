# API Reference

The ESC/POS Printer Simulator exposes a REST API on port `3000` (default) for management and monitoring.

## Base URL
`http://localhost:2026/api`

## Endpoints

### 1. Printers Management

#### `GET /api/printers`
Returns a list of all configured printers.

**Response:**
```json
[
  {
    "name": "Printer_1",
    "tcpPort": 9100,
    "bindIp": "0.0.0.0",
    "paper": 58,
    "columns": 32
  }
]
```

#### `POST /api/printers`
Create a new printer configuration.

**Body:**
```json
{
  "name": "Kitchen",
  "tcpPort": 9101,
  "bindIp": "0.0.0.0",
  "paper": 80,
  "columns": 48
}
```

#### `PUT /api/printers/:name`
Update an existing printer. Use `bindIp` to restrict the interface (e.g., `127.0.0.1`).

**Body:** Same as POST.

#### `DELETE /api/printers/:name`
Remove a printer configuration permanently.

#### `POST /api/printers/:name/reset`
Reset a specific printer to its default state.

---

### 2. Jobs & Output

#### `GET /api/printers/:name/jobs`
Get a list of job IDs for a printer (sorted newest first).

**Response:** `["20231027_100500_001", "20231027_100100_002"]`

#### `DELETE /api/printers/:name/jobs/:jobId`
Delete a specific job and its associated files (.txt, .html, .svg, .raw).

#### `DELETE /api/printers/:name/jobs`
Delete **ALL** history/jobs for a specific printer.

#### `GET /out/:printerName/:jobId.html`
(Static) View the rendered HTML receipt. Access via root URL, not `/api`.
Also available: `.txt`, `.svg`, `.raw`.

---

### 3. Diagnostics & Real-time

#### `GET /api/metrics`
Global aggregate statistics.

**Response:**
```json
{
  "activePrinters": 2,
  "activeConnections": 1,
  "totalBytes": 1024,
  "totalJobs": 5
}
```

#### `GET /api/printers/:name/diagnostics`
Detailed realtime stats for a specific printer.

**Response:**
```json
{
  "status": "listening",
  "uptimeSeconds": 120,
  "activeConnections": 1,
  "network": { "port": 9100, "ip": "0.0.0.0" },
  "errors": { "paperOut": false, "coverOpen": false }
}
```

#### `POST /api/printers/:name/error`
Toggle simulated hardware errors.

**Body:**
```json
{
  "key": "paperOut",
  "value": true
}
```

#### `GET /api/printers/:name/logs`
Get recent logs for a specific printer.

#### `GET /api/events`
Server-Sent Events (SSE) stream.
**Events:** `job`, `log`, `metrics`.

---

### 4. System

#### `POST /api/reset-all`
**Danger:** Factory reset. Deletes all printers, jobs, and logs. Restores 1 default printer.

## Status Codes
*   `200 OK`: Success
*   `400 Bad Request`: Invalid input or operation failed
*   `404 Not Found`: Printer or resource not found
*   `500 Internal Error`: Server error
