import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Printer from "@/models/Printer";
import Order from "@/models/Order";
import mongoose from "mongoose";
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
// Middleware de seguridad refinado
async function verifyAccess(requiredRole = "staff") {
  const session = await auth();
  const role = session?.user?.role;

  if (!role) throw new Error("No autorizado");

  const ALLOWED_ROLES = ["admin", "manager", "staff", "superadmin"];
  const ADMIN_ROLES = ["admin", "superadmin"];

  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("No autorizado");
  }

  if (requiredRole === "admin" && !ADMIN_ROLES.includes(role)) {
    throw new Error("No autorizado - Requiere rol de Administrador");
  }

  return session;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const locationId = searchParams.get("locationId");

    await dbConnect();

    // 1. Acciones críticas (Solo Admin: scan) o Staff (test de conexión)
    if (action === "scan" || action === "test") {
      if (action === "scan") {
        await verifyAccess("admin");
      } else {
        await verifyAccess("staff");
      }

      if (action === "scan") {
        const found = await scanNetwork();
        const newDevices = await syncPrinters(found, locationId);
        return NextResponse.json(newDevices);
      }

      if (action === "test") {
        const id = searchParams.get("id");
        const printer = await Printer.findById(id);
        if (!printer) throw new Error("Impresora no encontrada");
        const result = await checkPrinter(printer.ip, printer.port);
        const status = result ? "online" : "offline";
        await Printer.findByIdAndUpdate(id, { lastStatus: status });
        return NextResponse.json({ status });
      }
    }

    // 2. Acciones operativas (Admin y Staff)
    await verifyAccess("staff");

    // Re-imprimir orden (Cloud Friendly)
    if (action === "reprint") {
      const orderId = searchParams.get("orderId");
      if (!orderId) throw new Error("orderId es requerido");

      await Order.findByIdAndUpdate(orderId, {
        $set: {
          "printStatus.printed": false,
          "printStatus.error": false
        }
      });
      return NextResponse.json({ success: true, message: "Encolado para reimpresión" });
    }

    // Imprimir Prueba (Cloud Friendly)
    // Usamos collection.insertOne() directo al driver de MongoDB para BYPASSEAR
    // los hooks Mongoose (pre-save de cifrado / post-save de descifrado).
    // No es necesario cifrar una orden de prueba — solo debe ser detectada por el agente.
    if (action === "test_print") {
      try {
        const fakeId = new mongoose.Types.ObjectId();
        const now = new Date();
        const rolesParam = searchParams.get("roles");
        // Si no mandan roles, usamos kitchen por defecto
        const reqRoles = rolesParam ? rolesParam.split(',') : ['kitchen'];

        // Generamos un ítem por cada rol que se requiere testear
        const testItems = reqRoles.map(r => ({
          _id: new mongoose.Types.ObjectId(),
          itemId: fakeId,
          name: `TICKET DE PRUEBA (${r.toUpperCase()})`,
          quantity: 1,
          price: 0,
          printRole: r // inyectamos el rol hardcoded
        }));

        await Order.collection.insertOne({
          _id: new mongoose.Types.ObjectId(),
          orderNumber: `TEST-${Date.now().toString().slice(-6)}`,
          customer: {
            name: "PRUEBA DE SISTEMA",
            lastname: "OPERADOR",
            phone: "000000000",
            email: "staff@test.com",
          },
          items: testItems,
          location: {
            locationName: "Sede Operativa",
            locationId: locationId || "location1",
          },
          deliveryMethod: "Retiro en Sucursal",
          total: 0,
          subtotal: 0,
          deliveryFee: 0,
          paymentStatus: "approved",
          status: "confirmed",
          printStatus: { printed: false, error: false },
          printHistory: [],
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      } catch (insertErr) {
        console.error('[test_print] Error insertando orden de prueba:', insertErr.message);
        return NextResponse.json(
          { error: 'Error al crear ticket de prueba: ' + insertErr.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Ticket de prueba creado." });
    }

    // Por defecto: Listar impresoras
    const query = locationId ? { locationId } : {};
    const printers = await Printer.find(query);
    return NextResponse.json(printers);

  } catch (error) {
    const status = error.message.includes("No autorizado") ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(req) {
  try {
    await verifyAccess("staff"); // Staff puede agregar impresoras
    await dbConnect();
    const data = await req.json();
    const printer = await Printer.create(data);
    return NextResponse.json(printer, { status: 201 });
  } catch (error) {
    const status = error.message.includes("No autorizado") ? 401 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(req) {
  try {
    await verifyAccess("staff"); // Staff puede eliminar impresoras
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await Printer.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error.message.includes("No autorizado") ? 401 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
