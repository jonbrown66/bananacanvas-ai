import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

const MODEL = "gemini-3.1-flash-image-preview"; // Nano Banana 2 (Gemini 3.1 Flash Image)

const RequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  base64Image: z.string().optional(),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "16:9", "9:16"]).optional()
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: Record<string, unknown> }) =>
                cookieStore.set(name, value, options)
              );
            } catch { }
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll() { }
        }
      }
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits < 10) {
      return NextResponse.json({ error: "Insufficient credits. Please recharge." }, { status: 402 });
    }

    const body = await req.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { prompt, base64Image, aspectRatio } = result.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
    }

    // Deduct credits BEFORE calling API to prevent free usage if DB write fails after API success
    await supabaseAdmin.rpc("increment_credits", {
      p_user_id: user.id,
      p_amount: -10
    });
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      amount: -10,
      source: "Gemini Image Generation"
    });

    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [];

    if (base64Image && base64Image.length > 100) {
      parts.push({
        inlineData: {
          data: base64Image,
          mimeType: "image/png"
        }
      });
    }
    parts.push({ text: prompt });

    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: {
          imageConfig: {
            imageSize: "1K",
            aspectRatio: aspectRatio || "1:1"
          }
        }
      });
    } catch (apiError: any) {
      // API failed — refund credits
      await supabaseAdmin.rpc("increment_credits", {
        p_user_id: user.id,
        p_amount: 10
      });
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: user.id,
        amount: 10,
        source: "Gemini API Error Refund"
      });
      throw apiError;
    }

    const inlineBase64 =
      response?.data || response?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;

    const text =
      response?.text ||
      response?.candidates?.[0]?.content?.parts
        ?.filter((p: any) => p.text)
        ?.map((p: any) => p.text)
        ?.join("") ||
      "";

    return NextResponse.json({
      text: text || undefined,
      imageUrl: inlineBase64 ? `data:image/png;base64,${inlineBase64}` : undefined
    });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: error?.message || "Gemini API call failed" }, { status: 500 });
  }
}
