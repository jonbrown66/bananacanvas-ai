import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { logApiEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/security/rate-limit";

const MODEL = "gemini-3.1-flash-image-preview";
const CREDIT_COST = 10;
const MAX_PROMPT_LENGTH = 2000;
const MAX_BASE64_LENGTH = 8_000_000;
const MAX_REQUESTS_PER_WINDOW = 6;
const MAX_CONCURRENT_REQUESTS_PER_USER = 2;

const activeRequestMap = new Map<string, number>();

function acquireUserSlot(userId: string) {
  const current = activeRequestMap.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT_REQUESTS_PER_USER) return false;
  activeRequestMap.set(userId, current + 1);
  return true;
}

function releaseUserSlot(userId: string) {
  const current = activeRequestMap.get(userId) ?? 0;
  if (current <= 1) {
    activeRequestMap.delete(userId);
    return;
  }
  activeRequestMap.set(userId, current - 1);
}

// Track last activity time for active requests to detect orphaned slots
const activeRequestTimestamps = new Map<string, number>();
const ORPHAN_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

function updateActiveRequestTimestamp(userId: string) {
  activeRequestTimestamps.set(userId, Date.now());
}

function startActiveRequestCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [userId, lastTs] of activeRequestTimestamps) {
      if (now - lastTs > ORPHAN_THRESHOLD_MS) {
        // Check if user still has active requests
        if (!activeRequestMap.has(userId)) {
          activeRequestTimestamps.delete(userId);
        }
      }
    }
  }, ORPHAN_THRESHOLD_MS);
}

function isMissingMetadataColumnError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("credit_transactions") &&
    message.includes("metadata") &&
    (message.includes("schema cache") || message.includes("column"))
  );
}

async function insertCreditTransaction(
  supabaseAdmin: any,
  payload: {
    user_id: string;
    amount: number;
    source: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabaseAdmin
    .from("credit_transactions")
    .insert(payload);
  if (!error) return;

  if (payload.metadata && isMissingMetadataColumnError(error)) {
    const { metadata: _ignored, ...fallbackPayload } = payload;
    const { error: fallbackError } = await supabaseAdmin
      .from("credit_transactions")
      .insert(fallbackPayload);
    if (!fallbackError) return;
    throw fallbackError;
  }

  throw error;
}

const RequestSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(MAX_PROMPT_LENGTH, "Prompt is too long"),
  base64Image: z
    .string()
    .max(MAX_BASE64_LENGTH, "Image is too large")
    .regex(/^[A-Za-z0-9+/=]+$/, "Image data is invalid")
    .optional(),
  imageMimeType: z.enum(["image/png", "image/jpeg", "image/webp"]).optional(),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "16:9", "9:16"]).optional(),
});

export async function POST(req: Request) {
  let shouldRefund = false;
  let userId: string | null = null;
  let supabaseAdmin: any = null;
  let slotAcquired = false;

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
            }[],
          ) {
            try {
              cookiesToSet.forEach(
                ({
                  name,
                  value,
                  options,
                }: {
                  name: string;
                  value: string;
                  options: Record<string, unknown>;
                }) => cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const limitResult = await checkRateLimit({
      key: `gemini:${user.id}`,
      limit: MAX_REQUESTS_PER_WINDOW,
      windowSeconds: 60
    });
    if (!limitResult.allowed) {
      logApiEvent("gemini.rate_limited", { userId: user.id, source: limitResult.source }, "warn");
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 },
      );
    }

    if (!acquireUserSlot(user.id)) {
      logApiEvent("gemini.concurrent_limited", { userId: user.id }, "warn");
      return NextResponse.json(
        {
          error:
            "Too many concurrent requests. Please wait for current generation to finish.",
        },
        { status: 429 },
      );
    }
    slotAcquired = true;
    updateActiveRequestTimestamp(user.id);

    supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      },
    );

    const body = await req.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    }

    const { prompt, base64Image, imageMimeType, aspectRatio } = result.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const { data: consumed, error: consumeError } = await supabaseAdmin.rpc(
      "consume_credits",
      {
        p_user_id: user.id,
        p_amount: CREDIT_COST,
      },
    );

    if (consumeError) {
      logApiEvent(
        "gemini.consume_credits_error",
        { userId: user.id, message: consumeError.message },
        "error",
      );
      throw consumeError;
    }
    if (!consumed) {
      logApiEvent("gemini.insufficient_credits", { userId: user.id }, "warn");
      return NextResponse.json(
        { error: "Insufficient credits. Please recharge." },
        { status: 402 },
      );
    }

    shouldRefund = true;

    await insertCreditTransaction(supabaseAdmin, {
      user_id: user.id,
      amount: -CREDIT_COST,
      source: "Gemini Image Generation",
      metadata: { provider: "gemini", model: MODEL },
    });

    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [];

    if (base64Image && base64Image.length > 100) {
      parts.push({
        inlineData: {
          data: base64Image,
          mimeType: imageMimeType || "image/png",
        },
      });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        imageConfig: {
          imageSize: "1K",
          aspectRatio: aspectRatio || "1:1",
        },
      },
    });
    shouldRefund = false;
    logApiEvent("gemini.success", { userId: user.id, model: MODEL });

    const inlineBase64 =
      response?.data ||
      response?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
        ?.inlineData?.data;

    const text =
      response?.text ||
      response?.candidates?.[0]?.content?.parts
        ?.filter((p: any) => p.text)
        ?.map((p: any) => p.text)
        ?.join("") ||
      "";

    return NextResponse.json({
      text: text || undefined,
      imageUrl: inlineBase64
        ? `data:image/png;base64,${inlineBase64}`
        : undefined,
    });
  } catch (error: any) {
    if (shouldRefund && userId && supabaseAdmin) {
      await supabaseAdmin.rpc("increment_credits", {
        p_user_id: userId,
        p_amount: CREDIT_COST,
      });
      await insertCreditTransaction(supabaseAdmin, {
        user_id: userId,
        amount: CREDIT_COST,
        source: "Gemini API Error Refund",
        metadata: { provider: "gemini", model: MODEL },
      });
      logApiEvent("gemini.refund_applied", { userId, model: MODEL }, "warn");
    }

    console.error("Gemini API error:", error);
    logApiEvent("gemini.failed", { userId, message: error?.message }, "error");
    return NextResponse.json(
      { error: error?.message || "Gemini API call failed" },
      { status: 500 },
    );
  } finally {
    if (slotAcquired && userId) {
      releaseUserSlot(userId);
      // Update timestamp on cleanup
      if (activeRequestMap.has(userId)) {
        updateActiveRequestTimestamp(userId);
      }
    }
  }
}
