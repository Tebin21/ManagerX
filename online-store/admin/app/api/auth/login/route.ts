import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkPassword, createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  let ok: boolean;
  try {
    ok = checkPassword(password);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server misconfigured' }, { status: 500 });
  }

  if (!ok) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, createSessionToken(), sessionCookieOptions());
  return NextResponse.json({ ok: true });
}
