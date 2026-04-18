import { NextRequest, NextResponse } from 'next/server';
import { createSession, COOKIE_NAME } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.json({
      error: 'Invalid credentials',
      debug: {
        hasAdminUsername: !!process.env.ADMIN_USERNAME,
        hasAdminPassword: !!process.env.ADMIN_PASSWORD,
        hasSessionSecret: !!process.env.SESSION_SECRET,
        usernameMatch: username === process.env.ADMIN_USERNAME,
        passwordMatch: password === process.env.ADMIN_PASSWORD,
      },
    }, { status: 401 });
  }

  const sessionValue = await createSession(username);

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}
