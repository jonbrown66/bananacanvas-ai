import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logApiEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { uploadWorkspaceImage } from "@/lib/server/image-storage";

const MAX_BASE64_LENGTH = 8_000_000;

const RequestSchema = z.object({
  base64Image: z
    .string()
    .min(1, "Image is required")
    .max(MAX_BASE64_LENGTH, "Image is too large")
    .regex(/^[A-Za-z0-9+/=]+$/, "Image data is invalid"),
  imageMimeType: z.enum(["image/png", "image/jpeg", "image/webp"])
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options: Record<string, unknown>;
            }[]
          ) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          }
        }
      }
    );

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = await checkRateLimit({
      key: `image-upload:${user.id}`,
      limit: 20,
      windowSeconds: 60
    });
    if (!limitResult.allowed) {
      logApiEvent("image_upload.rate_limited", { userId: user.id, source: limitResult.source }, "warn");
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = RequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const uploaded = await uploadWorkspaceImage({
      userId: user.id,
      base64: result.data.base64Image,
      mimeType: result.data.imageMimeType,
      source: "upload"
    });

    logApiEvent("image_upload.success", { userId: user.id });
    return NextResponse.json(uploaded);
  } catch (error) {
    logApiEvent(
      "image_upload.failed",
      { message: (error as Error)?.message ?? "unknown" },
      "error"
    );
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 }
    );
  }
}
