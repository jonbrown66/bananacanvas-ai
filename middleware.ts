import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from "next/server";

const handleI18n = createMiddleware(routing);

export async function middleware(req: NextRequest) {
  const res = handleI18n(req);

  // If next-intl redirects, return immediately
  if (res.headers.get('Location')) {
    return res;
  }

  return res;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
