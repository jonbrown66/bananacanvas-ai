export function sanitizeNextPath(nextPath, fallback = "/app") {
  if (typeof nextPath !== "string") return fallback;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return fallback;
  return nextPath;
}

export function normalizeSuccessUrl(redirectUrl, origin) {
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

export function isSupabaseAuthCookieName(name) {
  return /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name);
}
