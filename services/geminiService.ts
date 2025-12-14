export interface GenerateImageParams {
  prompt: string;
  base64Image?: string; // Optional: for editing an existing image
  aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  onStatusUpdate?: (status: string) => void;
}

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
  return {
    text: data.text || undefined,
    imageUrl: data.imageUrl || undefined
  };
};
