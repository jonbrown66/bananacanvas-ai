import { createSupabaseServerClient } from "./server-client";

export async function getServerSession() {
  const supabase = await createSupabaseServerClient();

  // The `getSession` method is not secure for authentication on the server.
  // We return null here and let the client-side SupabaseProvider handle session restoration.
  return null;
}
