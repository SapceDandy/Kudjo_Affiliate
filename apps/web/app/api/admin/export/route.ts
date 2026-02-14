import { NextRequest } from 'next/server';
import { proxyToFunctions } from '@/lib/server/proxyToFunctions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return proxyToFunctions(req, {
    path: '/api/control-center/export',
    allowedMethods: ['POST'],
    passthroughHeaders: true,
  });
}
