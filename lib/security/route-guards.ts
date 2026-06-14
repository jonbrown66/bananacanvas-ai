export function sanitizeNextPath(nextPath: unknown, fallback = "/app"): string {
  if (typeof nextPath !== "string") return fallback;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return fallback;
  return nextPath;
}

export function normalizeSuccessUrl(redirectUrl: string | null, origin: string): string | null {
  if (!redirectUrl) return null;

  if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
    return new URL(redirectUrl, origin).toString();
  }

  try {
    const parsed = new URL(redirectUrl);
    if (parsed.origin !== origin) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isSupabaseAuthCookieName(name: string): boolean {
  return /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name);
}

export function hasSupabaseSessionCookieName(name: string): boolean {
  return [
    "sb-access-token",
    "sb-refresh-token",
    "supabase-auth-token",
    "supabase-session-token"
  ].includes(name) || isSupabaseAuthCookieName(name);
}
