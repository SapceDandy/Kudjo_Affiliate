import { NextRequest, NextResponse } from 'next/server';

type ProxyOptions = {
  path: string;
  allowedMethods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>;
  passthroughHeaders?: boolean;
};

function functionsBaseUrl(): string {
  return process.env.FUNCTIONS_URL || 'http://localhost:5001';
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('aborted'));
}

export async function proxyToFunctions(req: NextRequest, opts: ProxyOptions): Promise<NextResponse> {
  const method = (req.method || 'GET').toUpperCase();
  if (!opts.allowedMethods.includes(method as any)) {
    return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const base = functionsBaseUrl();
  const url = new URL(req.url);
  const target = `${base}${opts.path}${url.search}`;

  const headers: Record<string, string> = {};
  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  const auth = req.headers.get('authorization');
  if (auth) headers.authorization = auth;

  const cookie = req.headers.get('cookie');
  if (cookie) headers.cookie = cookie;

  const requestId = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
  if (requestId) headers['x-request-id'] = requestId;

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text();
  }

  try {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.FUNCTIONS_PROXY_TIMEOUT_MS || 8000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(target, {
      method,
      headers,
      body,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timer);
    });

    const text = await res.text();

    const responseHeaders: Record<string, string> = {
      'content-type': res.headers.get('content-type') || 'application/json',
    };

    const headerAllowList = ['content-disposition', 'cache-control', 'etag', 'x-request-id'];
    headerAllowList.forEach((h) => {
      const v = res.headers.get(h);
      if (v) responseHeaders[h] = v;
    });

    const response = new NextResponse(text, {
      status: res.status,
      headers: responseHeaders,
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) response.headers.set('set-cookie', setCookie);

    if (opts.passthroughHeaders) {
      res.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        response.headers.set(key, value);
      });
    }

    return response;
  } catch (e) {
    if (isAbortError(e)) {
      return NextResponse.json({ error: 'upstream_timeout' }, { status: 504 });
    }
    console.error('proxyToFunctions error:', e);
    return NextResponse.json({ error: 'bad_gateway' }, { status: 502 });
  }
}
