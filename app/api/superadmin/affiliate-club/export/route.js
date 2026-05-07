import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AffiliateProspect from '@/models/AffiliateProspect';
import ExcelJS from 'exceljs';
import { requireSuperAdmin } from '@/middleware/superadmin';

export async function GET(req) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.error) return authResult.response;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');

    const filter = {};
    if (status) filter.status = status;
    if (locationId) filter.locationId = locationId;

    const prospects = await AffiliateProspect.find(filter).sort({ createdAt: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Prospectos');

    worksheet.columns = [
      { header: 'Nombre', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Teléfono', key: 'phone', width: 20 },
      { header: 'Empresa', key: 'company', width: 25 },
      { header: 'Cargo', key: 'position', width: 20 },
      { header: 'Sede', key: 'locationId', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Código Descuento', key: 'discountCode', width: 20 },
      { header: 'Descuento %', key: 'discountPercentage', width: 15 },
      { header: 'Usado', key: 'discountUsed', width: 10 },
      { header: 'Asignado a', key: 'assignedTo', width: 30 },
      { header: 'Fecha Registro', key: 'createdAt', width: 20 }
    ];

    prospects.forEach(p => {
      worksheet.addRow({
        name: p.name,
        email: p.email || '',
        phone: p.phone,
        company: p.company,
        position: p.position || '',
        locationId: p.locationId,
        status: p.status,
        discountCode: p.discountCode,
        discountPercentage: p.discountPercentage,
        discountUsed: p.discountUsed ? 'Sí' : 'No',
        assignedTo: p.assignedTo || '',
        createdAt: new Date(p.createdAt).toLocaleDateString('es-AR')
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="prospectos_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
