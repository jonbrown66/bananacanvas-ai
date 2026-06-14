import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from "next/server";

const handleI18n = createMiddleware(routing);

const SUPABASE_AUTH_COOKIE_NAMES = [
  'sb-access-token',
  'sb-refresh-token',
  'supabase-auth-token',
  'supabase-session-token',
];

function hasSupabaseSessionCookie(req: NextRequest): boolean {
  for (const name of SUPABASE_AUTH_COOKIE_NAMES) {
    if (req.cookies.get(name)) {
      return true;
    }
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  const isLocalePrefixed = firstSegment === 'en' || firstSegment === 'zh-CN';

  const isAppRoute = segments.includes('app');

  if (isAppRoute) {
    const hasSession = hasSupabaseSessionCookie(req);
    if (!hasSession) {
      const locale = isLocalePrefixed ? firstSegment : 'en';
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url);
    }
  }

  const res = handleI18n(req);

  if (res.headers.get('Location')) {
    return res;
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
