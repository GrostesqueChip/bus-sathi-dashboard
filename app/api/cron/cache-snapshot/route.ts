import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { generateFleetSnapshot } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';

const CACHE_COLLECTION = 'cache';
const CACHE_DOC = 'latest_snapshot';

function isAuthorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return true;
  return bearer === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const payload = await generateFleetSnapshot(adminDb);

    await adminDb.collection(CACHE_COLLECTION).doc(CACHE_DOC).set(payload, { merge: false });

    return NextResponse.json({
      ok: true,
      generatedAt: payload.generatedAt,
      totalTrips: payload.totalTrips,
      anomalies: payload.anomalies.length,
      flaggedTrips: payload.flaggedTripCount,
    });
  } catch (error: any) {
    console.error('[cache-snapshot] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate snapshot', details: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
