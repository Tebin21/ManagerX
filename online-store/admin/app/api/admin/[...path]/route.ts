import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasValidSession } from '@/lib/auth';
import { backendAdminApiKey, backendBaseUrl } from '@/lib/backend';

// Generic proxy from the browser to online-store/server's /api/admin/* —
// mirrors the "Proxying to a backend" pattern from Next.js's own
// backend-for-frontend guide. This is the ONLY thing that ever attaches the
// server-to-server ONLINE_STORE_ADMIN_API_KEY; the browser never sees it.
// Server Components use lib/backend.ts's fetchAdmin() directly for reads —
// this route exists for Client Component mutations (buttons, forms).
async function proxyToBackend(request: NextRequest, path: string[]): Promise<NextResponse> {
  // Defense-in-depth on top of proxy.ts's redirect (see that file's comment).
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const target = new URL(`/api/admin/${path.join('/')}`, backendBaseUrl());
  target.search = request.nextUrl.search;

  const headers: Record<string, string> = { Authorization: `Bearer ${backendAdminApiKey()}` };
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const hasBody = !['GET', 'HEAD'].includes(request.method);

  const backendRes = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: 'no-store',
  });

  const responseContentType = backendRes.headers.get('content-type') ?? '';
  const passthroughHeaders: Record<string, string> = {};
  if (responseContentType) passthroughHeaders['Content-Type'] = responseContentType;
  const disposition = backendRes.headers.get('content-disposition');
  if (disposition) passthroughHeaders['Content-Disposition'] = disposition;

  const body = await backendRes.arrayBuffer();
  return new NextResponse(body, { status: backendRes.status, headers: passthroughHeaders });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  return proxyToBackend(request, (await ctx.params).path);
}
export async function POST(request: NextRequest, ctx: RouteContext) {
  return proxyToBackend(request, (await ctx.params).path);
}
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return proxyToBackend(request, (await ctx.params).path);
}
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return proxyToBackend(request, (await ctx.params).path);
}
