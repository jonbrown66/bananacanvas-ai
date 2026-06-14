import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseSessionCookieName } from "./lib/security/route-guards";

const handleI18n = createMiddleware(routing);

function hasSupabaseSessionCookie(req: NextRequest): boolean {
  for (const cookie of req.cookies.getAll()) {
    if (hasSupabaseSessionCookieName(cookie.name)) {
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
