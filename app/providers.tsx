import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { LazyMotion, domAnimation } from "framer-motion";
import { ClientPerformanceTracker } from "@/components/observability/ClientPerformanceTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider initialSession={null}>
      <LazyMotion features={domAnimation}>
        <ClientPerformanceTracker />
        {children}
      </LazyMotion>
    </SupabaseProvider>
  );
}
