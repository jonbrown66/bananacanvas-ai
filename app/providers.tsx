import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { getServerSession } from "@/lib/supabase/session";
import { LazyMotion, domAnimation } from "framer-motion";

export async function Providers({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  return (
    <SupabaseProvider initialSession={session}>
      <LazyMotion features={domAnimation}>
        {children}
      </LazyMotion>
    </SupabaseProvider>
  );
}
