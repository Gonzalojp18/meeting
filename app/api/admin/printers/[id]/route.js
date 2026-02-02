import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Printer from "@/models/Printer";
import { auth } from "@/auth";
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== "admin")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await dbConnect();
    const { roles } = await req.json();

    // Solo permitimos actualizar roles para mantener la integridad del Zero-Config
    const printer = await Printer.findByIdAndUpdate(
      id,
      { roles },
      { new: true },
    );
    return NextResponse.json(printer);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== "admin")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await dbConnect();
    await Printer.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
