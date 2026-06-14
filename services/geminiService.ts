export interface GenerateImageParams {
  prompt: string;
  base64Image?: string; // Optional: for editing an existing image
  imageMimeType?: ImageMimeType;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  onStatusUpdate?: (status: string) => void;
}

export type ImageMimeType = "image/png" | "image/jpeg" | "image/webp";

export function parseImageDataUrl(value?: string | null): { mimeType: ImageMimeType; base64: string } | null {
  if (!value) return null;
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(value);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase() as ImageMimeType,
    base64: match[2]
  };
}

export const resizeImageDataUrl = async (
  dataUrl: string,
  maxDimension: number = 1536,
  quality: number = 0.84
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const largestSide = Math.max(img.width, img.height, 1);
      const scale = Math.min(1, maxDimension / largestSide);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl); // fallback if canvas fails
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const webpBase64 = canvas.toDataURL('image/webp', quality);
      resolve(webpBase64);
    };
    img.onerror = () => resolve(dataUrl); // fallback on error
    img.src = dataUrl;
  });
};

export const generateOrEditImage = async (
  params: GenerateImageParams,
  timeoutMs: number = 60_000
): Promise<{ text?: string; imageUrl?: string }> => {
  params.onStatusUpdate?.("Contacting server...");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: params.prompt,
        base64Image: params.base64Image,
        imageMimeType: params.imageMimeType,
        aspectRatio: params.aspectRatio
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Gemini request failed");
    }

    const data = await res.json();
    let finalImageUrl = data.imageUrl || undefined;

    if (finalImageUrl) {
      params.onStatusUpdate?.("Optimizing image format...");
      try {
        finalImageUrl = await resizeImageDataUrl(finalImageUrl, 1536, 0.85);
      } catch (e) {
        console.warn("Failed to compress image to WebP", e);
      }
    }

    return {
      text: data.text || undefined,
      imageUrl: finalImageUrl
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求超时，Gemini 生成图片时间过长，请重试");
    }
    throw error;
  }
};
