import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { getServerSession } from "@/lib/supabase/session";

export async function Providers({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  return <SupabaseProvider initialSession={session}>{children}</SupabaseProvider>;
}
