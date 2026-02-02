import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Order from "@/models/Order";
import { auth } from "@/auth";

export async function GET(req) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const locationId = searchParams.get("locationId");

    // Filter out soft-deleted orders
    let query = { isDeleted: { $ne: true } };

    if (locationId) {
      query["location.locationId"] = locationId;
    }

    if (date) {
      // Fix: Parse YYYY-MM-DD components to construct Local Time dates
      const [y, m, d] = date.split("-").map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(100);

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await auth();
    // ESTRICTO: Solo admin puede borrar
    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado: Se requiere rol de administrador" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID de orden requerido");

    await dbConnect();

    // SOFT DELETE: Mark as deleted instead of removing from DB
    const deleted = await Order.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );

    if (!deleted)
      return NextResponse.json(
        { error: "Ticket no encontrado" },
        { status: 404 },
      );

    return NextResponse.json({
      success: true,
      message: "Ticket eliminado correctamente",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
