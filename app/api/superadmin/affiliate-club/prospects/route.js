import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AffiliateProspect from '@/models/AffiliateProspect';
import User from '@/models/User';
import { requireSuperAdmin } from '@/middleware/superadmin';

export async function GET(req) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.error) return authResult.response;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const assignedTo = searchParams.get('assignedTo');

    const filter = {};
    if (status) filter.status = status;
    if (locationId) filter.locationId = locationId;
    if (assignedTo) filter.assignedTo = assignedTo;

    const prospects = await AffiliateProspect.find(filter).sort({ createdAt: -1 }).lean();

    const decryptedProspects = prospects.map(p => {
      const { phoneHash, emailHash, nameHash, ...rest } = p;
      return rest;
    });

    return NextResponse.json({ success: true, prospects: decryptedProspects });
  } catch (error) {
    console.error('GET prospects error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.error) return authResult.response;

  try {
    await dbConnect();
    const body = await req.json();
    const { prospectId, status, assignedTo, notes } = body;

    if (!prospectId) {
      return NextResponse.json({ success: false, error: 'prospectId requerido' }, { status: 400 });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
      updateData.assignedAt = assignedTo ? new Date() : null;
    }
    if (notes !== undefined) updateData.notes = notes;

    const prospect = await AffiliateProspect.findByIdAndUpdate(
      prospectId,
      updateData,
      { new: true }
    );

    if (!prospect) {
      return NextResponse.json({ success: false, error: 'Prospect no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, prospect });
  } catch (error) {
    console.error('PUT prospects error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
