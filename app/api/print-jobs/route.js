import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Order from "@/models/Order";
import Printer from "@/models/Printer";
import mongoose from "mongoose";

/**
 * GET /api/print-jobs?locationId=xxx
 * Retorna las órdenes pendientes de imprimir para una sede específica.
 * También retorna la configuración de impresoras de esa sede.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    await dbConnect();

    // 1. Obtener órdenes aprobadas que NO han sido impresas aún
    // Excluye órdenes con error explícito O con más de 8 entradas en printHistory
    // (si llegó a 8 intentos sin marcarse como impresa, es un loop — se para automáticamente)
    const MAX_PRINT_ATTEMPTS = 8;
    const pendingOrders = await Order.find({
      "location.locationId": locationId,
      paymentStatus: "approved",
      "printStatus.printed": false,
      "printStatus.error": false,
      status: { $in: ["confirmed", "preparing", "pending"] },
      isDeleted: false,
      $expr: { $lt: [{ $size: { $ifNull: ["$printHistory", []] } }, MAX_PRINT_ATTEMPTS] }
    }).sort({ createdAt: 1 });

    // 2. Obtener la lista de impresoras configuradas para esta sede
    const printers = await Printer.find({
      locationId: locationId,
      isActive: true
    });

    // 3. Obtener el Menú para saber el rol de impresión de cada producto
    // (Optimizacion: Traemos solo categorías y sus items con printRole)
    const Menu = (await import("@/models/Menu")).default;
    const menu = await Menu.findOne({ "locations.isActive": true }).lean();

    // Mapa: itemId -> printRole ('kitchen' | 'bar')
    const itemRoleMap = {};
    if (menu) {
      menu.categories.forEach(cat => {
        const role = cat.printRole || 'kitchen'; // Default
        cat.items.forEach(item => {
          itemRoleMap[item._id.toString()] = role;
        });
      });
    }

    // 4. Enriquecer las órdenes con el rol de impresión por item
    const enrichedOrders = pendingOrders.map(order => {
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.map(item => {
        // Usa el printRole inyectado (como en test_print), sino lo busca en menu, sino kitchen
        const role = item.printRole || itemRoleMap[item.itemId.toString()] || 'kitchen';
        return { ...item, printRole: role };
      });
      return orderObj;
    });

    return NextResponse.json({
      orders: enrichedOrders,
      printers: printers
    });
  } catch (error) {
    console.error("[PRINT_JOBS_API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/print-jobs/confirm
 * El agente confirma que una orden se imprimió correctamente.
 */
export async function POST(req) {
  try {
    const { orderId, printerName, role, success, errorMsg } = await req.json();

    if (!orderId) throw new Error("orderId is required");

    await dbConnect();

    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    // Registrar en el historial atómicamente
    const historyEntry = {
      role: role || "unknown",
      printerName: printerName || "Agent",
      status: success ? "success" : "error",
      timestamp: new Date()
    };

    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      { $push: { printHistory: historyEntry } }
    );

    // Leer el documento RECIÉN actualizado para evitar Race Conditions (2 impresoras confirmando a la vez)
    const updatedOrder = await Order.findById(orderId).lean();

    if (success) {
      const locationPrinters = await Printer.find({
        locationId: updatedOrder.location.locationId,
        isActive: true
      });
      const requiredRoles = [...new Set(locationPrinters.flatMap(p => p.roles))];

      // Verificar historial exitoso en el order fresco
      const confirmedRoles = new Set(
        updatedOrder.printHistory.filter(h => h.status === 'success').map(h => h.role)
      );

      const allPrinted = requiredRoles.length === 0 || requiredRoles.every(r => confirmedRoles.has(r));

      await Order.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(orderId) },
        {
          $set: {
            "printStatus.printed": allPrinted,
            "printStatus.error": false,
            "printStatus.lastError": null
          }
        }
      );
    } else {
      await Order.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(orderId) },
        {
          $set: {
            "printStatus.error": true,
            "printStatus.lastError": errorMsg
          }
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PRINT_CONFIRM_API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
