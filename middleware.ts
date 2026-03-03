import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from './lib/supabase-middleware';

const handleI18n = createMiddleware(routing);

export async function middleware(req: NextRequest) {
  const { response, user } = await updateSession(req);

  // Apply i18n
  const res = handleI18n(req);

  // If next-intl redirects, return immediately
  if (res.headers.get('Location')) {
    return res;
  }

  // Check authentication for /app routes
  // We need to check both the raw path and the locale-prefixed path
  const pathname = req.nextUrl.pathname;
  const isAppRoute = pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname.match(/^\/(en|zh-CN)\/app($|\/)/);

  if (isAppRoute && !user) {
    // Redirect to login if accessing app route while unauthenticated
    // Get the locale to redirect to the correct login page
    const locale = pathname.match(/^\/(zh-CN|en)\//)?.[1] || 'en';
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
