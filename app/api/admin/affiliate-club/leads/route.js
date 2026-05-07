import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AffiliateProspect from '@/models/AffiliateProspect';
import { requireAdmin } from '@/middleware/admin';

export async function GET(req) {
  const authResult = await requireAdmin(req);
  if (authResult.error) return authResult.response;

  try {
    await dbConnect();
    const { session } = authResult;

    const filter = { assignedTo: session.user.email };

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    if (status) filter.status = status;

    const leads = await AffiliateProspect.find(filter).sort({ assignedAt: -1 }).lean();

    const decryptedLeads = leads.map(l => {
      const { phoneHash, emailHash, nameHash, ...rest } = l;
      return rest;
    });

    return NextResponse.json({ success: true, leads: decryptedLeads });
  } catch (error) {
    console.error('GET leads error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req) {
  const authResult = await requireAdmin(req);
  if (authResult.error) return authResult.response;

  try {
    await dbConnect();
    const { session } = authResult;
    const body = await req.json();
    const { prospectId, status, notes } = body;

    if (!prospectId) {
      return NextResponse.json({ success: false, error: 'prospectId requerido' }, { status: 400 });
    }

    const prospect = await AffiliateProspect.findById(prospectId);
    if (!prospect) {
      return NextResponse.json({ success: false, error: 'Prospect no encontrado' }, { status: 404 });
    }

    if (prospect.assignedTo !== session.user.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await AffiliateProspect.findByIdAndUpdate(
      prospectId,
      updateData,
      { new: true }
    );

    return NextResponse.json({ success: true, prospect: updated });
  } catch (error) {
    console.error('PUT leads error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
