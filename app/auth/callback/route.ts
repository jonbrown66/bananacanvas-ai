import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types";
import { sanitizeNextPath } from "@/lib/security/route-guards";
import { logApiEvent } from "@/lib/observability";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/app";
  const safeNext = sanitizeNextPath(next, "/app");

  const redirectUrl = new URL(safeNext, requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  if (!code) {
    logApiEvent("auth.callback.no_code", { next: safeNext }, "warn");
    return response;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logApiEvent("auth.callback.exchange_failed", {
      message: error.message,
      code: (error as any)?.code ?? null
    }, "warn");
  }

  if (!error) {
    const user = (data as any)?.user ?? data?.session?.user ?? null;
    const canSyncProfile = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (user && canSyncProfile) {
      const displayName = typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : (user.email?.split("@")[0] ?? "User");
      const avatarUrl = typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null;

      // Keep callback fast: cap profile sync latency to avoid blocking redirect.
      const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return []; },
            setAll() { },
          },
        }
      );

      const syncTask = (async () =>
        supabaseAdmin.from("profiles").upsert(
          {
            id: user.id,
            email: user.email ?? "",
            display_name: displayName,
            avatar_url: avatarUrl,
            plan: "free"
          },
          {
            onConflict: "id",
            ignoreDuplicates: true
          }
        ))();

      void syncTask.catch((syncError) => {
        logApiEvent("auth.callback.profile_sync_failed", {
          message: (syncError as Error)?.message ?? "unknown"
        }, "warn");
      });

      await Promise.race([
        syncTask,
        new Promise((resolve) => setTimeout(resolve, 280))
      ]);
    }
  }

  const duration = Date.now() - startedAt;
  response.headers.set("Server-Timing", `auth_callback;dur=${duration}`);
  logApiEvent("auth.callback.duration", {
    duration_ms: duration,
    has_code: true,
    next: safeNext
  });

  return response;
}
