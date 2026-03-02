export interface GenerateImageParams {
  prompt: string;
  base64Image?: string; // Optional: for editing an existing image
  aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  onStatusUpdate?: (status: string) => void;
}

const compressImageToWebP = async (base64Str: string, quality: number = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str); // fallback if canvas fails
        return;
      }
      ctx.drawImage(img, 0, 0);
      const webpBase64 = canvas.toDataURL('image/webp', quality);
      resolve(webpBase64);
    };
    img.onerror = () => resolve(base64Str); // fallback on error
    img.src = base64Str;
  });
};

export const generateOrEditImage = async (
  params: GenerateImageParams
): Promise<{ text?: string; imageUrl?: string }> => {
  params.onStatusUpdate?.("Contacting server...");

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: params.prompt,
      base64Image: params.base64Image,
      aspectRatio: params.aspectRatio
    })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Gemini request failed");
  }

  const data = await res.json();
  let finalImageUrl = data.imageUrl || undefined;

  if (finalImageUrl) {
    params.onStatusUpdate?.("Optimizing image format...");
    try {
      finalImageUrl = await compressImageToWebP(finalImageUrl, 0.85);
    } catch (e) {
      console.warn("Failed to compress image to WebP", e);
    }
  }

  return {
    text: data.text || undefined,
    imageUrl: finalImageUrl
  };
};
