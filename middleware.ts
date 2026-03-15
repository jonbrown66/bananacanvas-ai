import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAuthCookieName } from "@/lib/security/route-guards";

const handleI18n = createMiddleware(routing);

function hasSupabaseSessionCookie(req: NextRequest) {
  return req.cookies.getAll().some((cookie) => isSupabaseAuthCookieName(cookie.name));
}

export async function middleware(req: NextRequest) {
  // Apply i18n
  const res = handleI18n(req);

  const pathname = req.nextUrl.pathname;

  // If next-intl redirects, return immediately
  if (res.headers.get('Location')) {
    return res;
  }

  // Check authentication for /app routes
  // segments.includes('app') is a simple way to check if this is an app-related route
  const segments = pathname.split('/');
  const isAppRoute = segments.includes('app');
  const hasSession = hasSupabaseSessionCookie(req);

  if (isAppRoute && !hasSession) {
    // Redirect to login if accessing app route while unauthenticated
    const locale = segments.find(s => s === 'en' || s === 'zh-CN') || 'en';
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
