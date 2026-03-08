import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Order from "@/models/Order";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/middleware/superadmin";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session || !(await isSuperAdmin(session))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const locationId = searchParams.get("locationId");

    let query = { isDeleted: { $ne: true } };

    if (locationId) {
      query["location.locationId"] = locationId;
    }

    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
