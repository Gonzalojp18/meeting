import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Printer from "@/models/Printer";
import { scanNetwork, checkPrinter } from "@/utils/printers";
import { auth } from "@/auth";
import { executePrintSaga } from "@/lib/print/saga";

/**
 * Sincroniza las impresoras encontradas con la base de datos (Filtrado por Sede)
 */
async function syncPrinters(foundDevices, locationId) {
  if (!locationId) throw new Error("locationId es requerido para sincronizar");

  // Solo buscamos impresoras de la sede actual
  const savedPrinters = await Printer.find({ locationId });
  const linkedUids = new Set(savedPrinters.map((p) => p.uid.toLowerCase()));

  // 1. Actualizar impresoras existentes
  for (const saved of savedPrinters) {
    const match = foundDevices.find((d) => {
      if (d.uid.toLowerCase() === saved.uid.toLowerCase()) return true;
      const nameMatch = d.name.toLowerCase() === saved.name.toLowerCase();
      const ipMatch = d.ip === saved.ip;
      const portMatch = d.port === saved.port;
      return (
        (nameMatch && ipMatch) ||
        (nameMatch && portMatch) ||
        (ipMatch && portMatch)
      );
    });

    if (match) {
      const updateFields = { lastStatus: "online" };
      let needsUpdate = false;

      if (match.ip !== saved.ip) {
        updateFields.ip = match.ip;
        needsUpdate = true;
      }
      if (match.port !== saved.port) {
        updateFields.port = match.port;
        needsUpdate = true;
      }
      if (match.name !== saved.name) {
        updateFields.name = match.name;
        needsUpdate = true;
      }
      // Actualizar UID al valor normalizado si cambió el case o el valor
      if (match.uid !== saved.uid) {
        updateFields.uid = match.uid;
        needsUpdate = true;
      }

      if (needsUpdate || saved.lastStatus !== "online") {
        await Printer.findByIdAndUpdate(saved._id, updateFields);
      }
      // Aseguramos que el UID encontrado esté marcado como vinculado
      linkedUids.add(match.uid.toLowerCase());
    } else if (saved.lastStatus === "online") {
      await Printer.findByIdAndUpdate(saved._id, { lastStatus: "offline" });
    }
  }

  // 2. Retornar solo dispositivos que NO estén vinculados (comparación case-insensitive)
  return foundDevices.filter((d) => !linkedUids.has(d.uid.toLowerCase()));
}
// Middleware de seguridad básico
async function checkAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("No autorizado");
  }
}
export async function GET(req) {
  try {
    await checkAdmin();
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const locationId = searchParams.get("locationId");

    // Acción especial: Escaneo de red + Sincronización Automática
    if (action === "scan") {
      const found = await scanNetwork();
      const newDevices = await syncPrinters(found, locationId);
      return NextResponse.json(newDevices);
    }

    // Acción especial: Test de conexión manual (TCP Check)
    if (action === "test") {
      const id = searchParams.get("id");
      const printer = await Printer.findById(id);
      if (!printer) throw new Error("Impresora no encontrada");

      const result = await checkPrinter(printer.ip, printer.port);
      const status = result ? "online" : "offline";

      await Printer.findByIdAndUpdate(id, { lastStatus: status });
      return NextResponse.json({ status });
    }

    // Acción especial: Re-imprimir orden
    if (action === "reprint") {
      const orderId = searchParams.get("orderId");
      const type = searchParams.get("type") || "kitchen"; // Default to Kitchen ticket for Admins

      if (!orderId) throw new Error("orderId es requerido");

      // Force print to bypass "already printed" check
      const result = await executePrintSaga(orderId, { force: true, type, isReprint: true });
      return NextResponse.json(result);
    }

    // Acción especial: Imprimir Prueba (Multitarea o Individual)
    if (action === "test_print") {
      const roles = searchParams.get("roles")?.split(",") || [];
      const printerId = searchParams.get("printerId");

      const mockOrder = {
        _id: "test_" + Date.now(),
        orderNumber: "TEST-PRINT",
        customer: { name: "PRUEBA DE SISTEMA", phone: "000-000" },
        items: [{ name: "Ticket de Validación", quantity: 1, price: 0 }],
        location: {
          locationName: "Sede Admin",
          locationId: locationId || "admin_test",
        },
        total: 0,
        createdAt: new Date(),
      };

      if (printerId) {
        // Prueba individual
        const printer = await Printer.findById(printerId);
        if (!printer) throw new Error("Impresora no encontrada");
        const result = await executePrintSaga(mockOrder, {
          type: "test",
          targetUids: [printer.uid],
        });
        return NextResponse.json(result);
      } else if (roles.length > 0) {
        // Prueba por roles
        const results = [];
        let totalSent = 0;
        for (const role of roles) {
          const res = await executePrintSaga(mockOrder, { type: role });
          results.push({ role, status: res.status });
          if (res.status === "success") totalSent++;
        }

        if (totalSent === 0) {
          return NextResponse.json(
            { error: "No se encontraron impresoras activas para los roles seleccionados en esta sede.", results },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, results, totalSent });
      }
      throw new Error("Debe especificar roles o printerId");
    }

    // Por defecto: Listar impresoras guardadas (Filtrado por sede)
    const query = locationId ? { locationId } : {};
    const printers = await Printer.find(query);
    return NextResponse.json(printers);
  } catch (error) {
    const status = error.message === "No autorizado" ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
export async function POST(req) {
  try {
    await checkAdmin();
    await dbConnect();
    const data = await req.json();
    console.log("RECIBIENDO DATA PRINTER:", data);

    const printer = await Printer.create(data);
    return NextResponse.json(printer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
