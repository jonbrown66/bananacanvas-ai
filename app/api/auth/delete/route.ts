import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types";
import { logApiEvent } from "@/lib/observability";

const MAX_RECENT_SIGN_IN_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  const confirmationHeader = request.headers.get("x-confirm-delete");
  if (confirmationHeader !== "true") {
    return NextResponse.json({ error: "Missing delete confirmation header" }, { status: 400 });
  }

  const supabase = createServerClient<Database>(supabaseUrl, serviceRoleKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        response.cookies.set(name, value, options);
      },
      remove(name: string, options: any) {
        response.cookies.set(name, "", { ...options, maxAge: 0 });
      }
    }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logApiEvent("auth.delete.unauthorized", {}, "warn");
    return NextResponse.json({ error: "No authenticated user found" }, { status: 401 });
  }

  const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  if (!lastSignInAt || Date.now() - lastSignInAt > MAX_RECENT_SIGN_IN_MS) {
    logApiEvent("auth.delete.reauth_required", { userId: user.id }, "warn");
    return NextResponse.json({ error: "Please sign in again before deleting your account." }, { status: 403 });
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteError) {
    logApiEvent("auth.delete.failed", { userId: user.id, message: deleteError.message }, "error");
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  logApiEvent("auth.delete.success", { userId: user.id });

  return response;
}
