import { SupabaseProvider } from "@/components/providers/supabase-provider";
// m components + LazyMotion: layout animations (sidebar active pill) need domMax.
import { LazyMotion, domMax, MotionConfig } from "framer-motion";
import { ClientPerformanceTracker } from "@/components/observability/ClientPerformanceTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider initialSession={null}>
      <LazyMotion features={domMax} strict>
        {/* One global reduced-motion switch: every m component respects the
            user's OS setting without per-component checks. */}
        <MotionConfig reducedMotion="user">
          <ClientPerformanceTracker />
          {children}
        </MotionConfig>
      </LazyMotion>
    </SupabaseProvider>
  );
}
