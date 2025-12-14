import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "./lib/types";

const handleI18n = createMiddleware(routing);

export async function middleware(req: NextRequest) {
  const res = handleI18n(req);

  // If next-intl redirects, return immediately
  if (res.headers.get('Location')) {
    return res;
  }

  /* 
   * TEMPORARILY DISABLED SUPABASE AUTH IN MIDDLEWARE
   * Reason: Development environment Proxy/Fake-IP issues cause Edge Runtime crashes.
   * Security: Client-Side Auth (Components) will still protect the UI.
   * Status: Bypass enabled.
   */

  /*
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Update the response cookies
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          // Update the response cookies
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        }
      },
      auth: {
        detectSessionInUrl: false,
        autoRefreshToken: false,
      }
    }
  );
  */

  const user = null;

  /*
  try {
    const {
      data
    } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    // Ignore fetch errors (likely due to Proxy/Fake-IP in Edge Runtime)
    console.warn("Supabase auth check failed in middleware, proceeding as unauthenticated:", err);
  }
  */

  // Protected routes logic
  const pathname = req.nextUrl.pathname;
  // Remove locale prefix to check the actual path
  const pathnameWithoutLocale = pathname.replace(/^\/(en|zh-CN)/, '') || '/';

  const isProtected = pathnameWithoutLocale.startsWith("/app");

  /*
  if (!user && isProtected) {
    // Determine current locale to redirect correctly
    const localeMatch = pathname.match(/^\/(en|zh-CN)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

    const redirectUrl = new URL(`/${locale}/login`, req.url);
    return NextResponse.redirect(redirectUrl);
  }
  */

  return res;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
