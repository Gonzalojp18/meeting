import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';

export async function GET() {
    const start = Date.now();
    const status = { ok: true, db: false, latencyMs: 0, timestamp: new Date().toISOString() };

    try {
        await dbConnect();
        status.db = true;
    } catch {
        status.ok = false;
        status.db = false;
    }

    status.latencyMs = Date.now() - start;

    return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
