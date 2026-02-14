import { NextRequest } from 'next/server';
import { proxyToFunctions } from '@/lib/server/proxyToFunctions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxyToFunctions(req, {
    path: '/api/analytics/offer',
    allowedMethods: ['GET'],
  });
}


