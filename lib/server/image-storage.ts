import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export type SupportedImageMimeType = "image/png" | "image/jpeg" | "image/webp";

const DEFAULT_BUCKET = "workspace-images";

const EXTENSION_BY_MIME: Record<SupportedImageMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
};

export function getWorkspaceImageBucket() {
  return process.env.SUPABASE_WORKSPACE_IMAGE_BUCKET || DEFAULT_BUCKET;
}

export async function uploadWorkspaceImage(params: {
  userId: string;
  base64: string;
  mimeType: SupportedImageMimeType;
  source: "upload" | "generation";
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Image storage is not configured.");
  }

  const buffer = Buffer.from(params.base64, "base64");
  if (!buffer.length) {
    throw new Error("Image payload is empty.");
  }

  const bucket = getWorkspaceImageBucket();
  const extension = EXTENSION_BY_MIME[params.mimeType];
  const storagePath = `${params.userId}/${params.source}/${Date.now()}-${randomUUID()}.${extension}`;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: params.mimeType,
      cacheControl: "31536000",
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
  if (!data.publicUrl) {
    throw new Error("Image storage did not return a public URL.");
  }

  return {
    imageUrl: data.publicUrl,
    storagePath
  };
}
