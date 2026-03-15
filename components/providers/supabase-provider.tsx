'use client';

import { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { reportClientMetric } from "@/lib/perf/client-metrics";

interface SupabaseProviderProps {
  children: React.ReactNode;
  initialSession: Session | null;
}

interface SupabaseContextValue {
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
  session: Session | null;
  isSessionLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({ children, initialSession }: SupabaseProviderProps) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isSessionLoading, setIsSessionLoading] = useState(!initialSession);

  useEffect(() => {
    let isMounted = true;
    const startedAt = performance.now();

    const bootstrapSession = async () => {
      if (initialSession) {
        setSession(initialSession);
        setIsSessionLoading(false);
        reportClientMetric({
          name: "auth_session_bootstrap_duration",
          value: Number((performance.now() - startedAt).toFixed(2)),
          unit: "ms",
          tags: { source: "server" }
        });
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!error) {
        setSession(data.session ?? null);
      }
      setIsSessionLoading(false);
      reportClientMetric({
        name: "auth_session_bootstrap_duration",
        value: Number((performance.now() - startedAt).toFixed(2)),
        unit: "ms",
        tags: { source: "browser" }
      });
    };

    void bootstrapSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession ?? null);
      setIsSessionLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, initialSession]);

  const value = useMemo(
    () => ({
      supabase,
      session,
      isSessionLoading
    }),
    [supabase, session, isSessionLoading]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export const useSupabase = () => {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }
  return ctx;
};
