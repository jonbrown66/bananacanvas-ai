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

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function resolveImagePayload(value?: string | null): Promise<{ mimeType: ImageMimeType; base64: string } | null> {
  const parsed = parseImageDataUrl(value);
  if (parsed) return parsed;
  if (!value || !/^https?:\/\//i.test(value)) return null;

  // Session-level cache: branching repeatedly off the same context image must
  // not re-download the full image on every generation.
  const cached = resolvedImagePayloadCache.get(value);
  if (cached) return cached;

  const payload = await (async () => {
    const response = await fetch(value, { cache: "force-cache" });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!["image/png", "image/jpeg", "image/webp"].includes(blob.type)) return null;

    const dataUrl = await blobToDataUrl(blob);
    return parseImageDataUrl(dataUrl);
  })();

  if (payload) {
    resolvedImagePayloadCache.set(value, payload);
    trimResolvedImageCache();
  }
  return payload;
}

// Bounded cache so a long session cannot grow without limit (~12 entries).
const resolvedImagePayloadCache = new Map<string, { mimeType: ImageMimeType; base64: string }>();
const RESOLVED_IMAGE_CACHE_LIMIT = 12;

function trimResolvedImageCache() {
  while (resolvedImagePayloadCache.size > RESOLVED_IMAGE_CACHE_LIMIT) {
    const oldest = resolvedImagePayloadCache.keys().next().value;
    if (oldest === undefined) break;
    resolvedImagePayloadCache.delete(oldest);
  }
}

// Timeout guard: a hung decode (or a tainted canvas) must never leave the
// caller's await unsettled — that freezes the workspace in "processing" state.
const IMAGE_RESIZE_TIMEOUT_MS = 10_000;

export const resizeImageDataUrl = async (
  dataUrl: string,
  maxDimension: number = 1536,
  quality: number = 0.84
): Promise<string> => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(value);
    };

    // Fallback to the original payload if re-encoding fails for any reason.
    const fail = (reason: string) => {
      console.warn("resizeImageDataUrl fallback:", reason);
      finish(dataUrl);
    };

    const timer = setTimeout(() => fail("timeout"), IMAGE_RESIZE_TIMEOUT_MS);

    let img: HTMLImageElement;
    try {
      img = new Image();
    } catch {
      fail("Image constructor unavailable");
      return;
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const largestSide = Math.max(img.width, img.height, 1);
        const scale = Math.min(1, maxDimension / largestSide);
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(dataUrl); // fallback if canvas fails
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // toDataURL throws on a tainted canvas (cross-origin image without CORS).
        // Always fall back instead of leaving the promise pending.
        const webpBase64 = canvas.toDataURL('image/webp', quality);
        finish(webpBase64);
      } catch (e) {
        fail(e instanceof Error ? e.message : "canvas encode failed");
      }
    };
    img.onerror = () => fail("image decode failed");
    // Cross-origin sources (Supabase URLs) need CORS to keep the canvas clean.
    if (/^https?:\/\//i.test(dataUrl)) img.crossOrigin = 'anonymous';
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
    // Keep the server-side https URL as-is. Re-encoding to a base64 data URL
    // here used to add a full image download + main-thread canvas encode on
    // every generation, and blew the localStorage quota via zustand persist.
    const finalImageUrl = data.imageUrl || undefined;

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

export async function uploadWorkspaceImage(
  base64Image: string,
  imageMimeType: ImageMimeType
): Promise<{ imageUrl: string; storagePath?: string }> {
  const res = await fetch("/api/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image, imageMimeType })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Image upload failed");
  }

  return res.json();
}

/**
 * Returns a transformed (smaller) variant of a Supabase-hosted workspace image
 * for canvas node thumbnails, e.g.
 *   https://<proj>.supabase.co/storage/v1/render/image/sign/<path>?width=512
 * Supabase serves the resized image with long-lived cache headers, so nodes on
 * a big canvas stop downloading 1536px originals. Returns the original URL for
 * non-Supabase hosts or on any parse failure.
 */
export function getNodeThumbnailUrl(url: string | undefined | null, width = 512): string | undefined {
  if (!url || !/^https?:\/\//i.test(url)) return url || undefined;
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1 || !parsed.hostname.endsWith(".supabase.co")) return url;

    // /storage/v1/object/public/<bucket>/<path> → /storage/v1/render/image/public/<bucket>/<path>
    const afterObject = parsed.pathname.slice(idx + marker.length); // "public/<bucket>/<path>" or "sign/<bucket>/<path>?token=..."
    const slashIdx = afterObject.indexOf("/");
    const visibility = slashIdx === -1 ? afterObject : afterObject.slice(0, slashIdx);
    const rest = slashIdx === -1 ? "" : afterObject.slice(slashIdx + 1);
    if (!rest) return url;

    parsed.pathname = `/storage/v1/render/image/${visibility}/${rest}`;
    parsed.searchParams.set("width", String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}
