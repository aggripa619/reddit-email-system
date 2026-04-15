import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/reddit';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings?error=reddit_auth_denied', req.url));
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL('/settings?connected=1', req.url));
  } catch (err: any) {
    console.error('[Reddit OAuth] Token exchange failed:', err.message);
    const dest = new URL('/settings', req.url);
    dest.searchParams.set('error', 'token_exchange_failed');
    dest.searchParams.set('detail', err.message.slice(0, 200));
    return NextResponse.redirect(dest);
  }
}
