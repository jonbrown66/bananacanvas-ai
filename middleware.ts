import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from './lib/supabase-middleware';

const handleI18n = createMiddleware(routing);

export async function middleware(req: NextRequest) {
  const { response: supabaseResponse, user } = await updateSession(req);

  // Apply i18n
  const res = handleI18n(req);

  const pathname = req.nextUrl.pathname;
  console.log(`[Middleware] Path: ${pathname}, User: ${user ? 'Authenticated' : 'Guest'}`);

  // Merge Supabase cookies into the i18n response
  supabaseResponse.cookies.getAll().forEach(cookie => {
    res.cookies.set(cookie.name, cookie.value, cookie);
  });

  // If next-intl redirects, return immediately
  if (res.headers.get('Location')) {
    return res;
  }

  // Check authentication for /app routes
  // segments.includes('app') is a simple way to check if this is an app-related route
  const segments = pathname.split('/');
  const isAppRoute = segments.includes('app');

  if (isAppRoute && !user) {
    console.log(`[Middleware] Auth required for ${pathname}. Redirecting to login.`);
    // Redirect to login if accessing app route while unauthenticated
    const locale = segments.find(s => s === 'en' || s === 'zh-CN') || 'en';
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    const redirectRes = NextResponse.redirect(url);
    // Also copy cookies to the redirect response
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectRes.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectRes;
  }

  return res;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
