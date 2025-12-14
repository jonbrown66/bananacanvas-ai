import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { z } from "zod";

const MODEL = "gemini-3-pro-image-preview";

const RequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  base64Image: z.string().optional(),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "16:9", "9:16"]).optional()
});

export async function POST(req: Request) {
  try {
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

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        imageConfig: {
          imageSize: "1K",
          aspectRatio: aspectRatio || "1:1"
        }
      }
    });

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
