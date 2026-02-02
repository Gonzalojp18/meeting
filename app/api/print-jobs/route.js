import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Order from "@/models/Order";
import Printer from "@/models/Printer";

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
    const pendingOrders = await Order.find({
      "location.locationId": locationId,
      paymentStatus: "approved",
      "printStatus.printed": false,
      status: { $in: ["confirmed", "preparing", "pending"] },
      isDeleted: false
    }).sort({ createdAt: 1 });

    // 2. Obtener la lista de impresoras configuradas para esta sede
    const printers = await Printer.find({
      locationId: locationId,
      isActive: true
    });

    return NextResponse.json({
      orders: pendingOrders,
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

    // Registrar en el historial
    const historyEntry = {
      role: role || "unknown",
      printerName: printerName || "Agent",
      status: success ? "success" : "error",
      timestamp: new Date()
    };

    // Si tuvo éxito, marcamos como impresa globalmente (o por rol si quisiéramos ser más finos)
    const update = {
      $push: { printHistory: historyEntry }
    };

    if (success) {
      update.$set = { "printStatus.printed": true, "printStatus.error": false };
    } else {
      update.$set = { "printStatus.error": true, "printStatus.lastError": errorMsg };
    }

    await Order.findByIdAndUpdate(orderId, update);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PRINT_CONFIRM_API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
