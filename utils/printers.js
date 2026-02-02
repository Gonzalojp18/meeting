import net from "net";
import os from "os";

/**
 * Intenta conectar a un puerto en una IP específica para ver si hay una impresora
 * Si encuentra algo en 9100, intenta pedir metadatos al 2026 (puerto API vtpMdg)
 */
export async function checkPrinter(ip, port = 9100, timeout = 500) {
  // 1. Verificar si el puerto TCP está abierto
  const online = await new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, ip);
  });

  if (!online) return null;

  // 2. Intentar pedir nombre/UID al emulador (API vtpMdg en puerto 2026)
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 800);

    const res = await fetch(`http://${ip}:2026/api/printers`, {
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      // vtpMdg devuelve un array. Buscamos la que coincida con el puerto escaneado.
      const p = data.find((item) => item.tcpPort === port);
      if (p) {
        return {
          ip,
          port,
          online: true,
          name: p.name,
          uid: `vtp-${p.name.toLowerCase()}`, // Normalizado a minúsculas
          isEmulator: true,
        };
      } else {
        // Si el API de vtpMdg responde pero NO reconoce este puerto TCP,
        // es altamente probable que sea un proceso "zombie" o fantasma.
        // Lo ignoramos para no ensuciar la UI.
        console.warn(
          `[SCAN] Detectado puerto zombie ${port} en ${ip} (vtpMdg no lo reconoce). Ignorando.`,
        );
        return null;
      }
    }
  } catch (e) {
    // No es un emulador vtpMdg o la API no responde
  }

  // Si respondió al puerto TCP pero NO hay rastro de vtpMdg en esa IP,
  // podría ser una impresora física real. En ese caso la mostramos como "raw".
  return {
    ip,
    port,
    online: true,
    name: `Printer-${ip.split(".").pop()}`,
    uid: `raw-${ip.replace(/\./g, "_")}-${port}`, // UID único por IP y Puerto
    isEmulator: false,
  };
}

/**
 * Escanea la subred local buscando servicios y resolviendo identidades
 * Soporta múltiples interfaces de red y puertos (9100-9102)
 */
export async function scanNetwork() {
  const interfaces = os.networkInterfaces();
  const prefixes = new Set();

  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        prefixes.add(iface.address.split(".").slice(0, 3).join("."));
      }
    }
  }

  const ports = [9100, 9101, 9102, 9103, 9104];
  const foundMap = new Map(); // Mapa para de-duplicar por UID

  for (const prefix of prefixes) {
    console.log(`[SCAN] Iniciando escaneo en subred ${prefix}.x...`);

    // Escaneamos en bloques de IPs para no saturar sockets del OS
    const chunkSize = 32;
    for (let i = 1; i <= 254; i += chunkSize) {
      const batch = [];
      for (let j = i; j < i + chunkSize && j <= 254; j++) {
        const ip = `${prefix}.${j}`;
        for (const port of ports) {
          batch.push(checkPrinter(ip, port));
        }
      }
      const results = await Promise.all(batch);

      for (const r of results) {
        if (r) {
          if (!foundMap.has(r.uid)) {
            foundMap.set(r.uid, r);
          }
        }
      }
    }
  }

  const uniqueResults = Array.from(foundMap.values());
  console.log(
    `[SCAN] Escaneo completado. Unidades únicas: ${uniqueResults.length}`,
  );
  return uniqueResults;
}

/**
 * Intenta resolver la ubicación actual (IP/Puerto) de una impresora por su UID
 * Útil cuando la IP ha cambiado debido a DHCP o reinicio.
 */
export async function resolvePrinter(uid) {
  console.log(`[RESOLVE] Buscando impresora por UID: ${uid}...`);
  const found = await scanNetwork();
  const match = found.find((p) => p.uid.toLowerCase() === uid.toLowerCase());

  if (match) {
    console.log(`[RESOLVE] ¡Encontrada! ${uid} ahora está en ${match.ip}:${match.port}`);
    return { ip: match.ip, port: match.port };
  }

  console.warn(`[RESOLVE] No se pudo encontrar la impresora ${uid} en la red.`);
  return null;
}
