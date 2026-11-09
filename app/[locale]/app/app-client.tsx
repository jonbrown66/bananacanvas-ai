'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import WorkspaceApp from "@/components/AppWorkspace";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import {
  consumeFlowMetric,
  markRouteStart,
  reportClientMetric
} from "@/lib/perf/client-metrics";

interface InitialUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export default function AppClient({ initialUser }: { initialUser?: InitialUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, session, isSessionLoading } = useSupabase();
  const [loading, setLoading] = useState(false);

  const userId = session?.user?.id || initialUser?.id;
  const userEmail = session?.user?.email || initialUser?.email || "";
  const userName = (session?.user?.user_metadata?.full_name as string) || initialUser?.name || userEmail || "Creative User";
  const avatarUrl = (session?.user?.user_metadata?.avatar_url as string) || initialUser?.avatarUrl;

  const viewParam = searchParams?.get("view");
  const sessionIdParam = searchParams?.get("sessionId");
  const initialViewMode = viewParam === "canvas" ? "canvas" : "chat";

  useEffect(() => {
    // Only redirect if both server session and client session are confirmed absent
    if (!initialUser && !isSessionLoading && !session) {
      markRouteStart("/login");
      router.replace("/login");
    }
  }, [initialUser, isSessionLoading, session, router]);

  useEffect(() => {
    if (isSessionLoading || !session) return;

    const oauthFlow = consumeFlowMetric("auth_oauth_to_app");
    if (oauthFlow) {
      reportClientMetric({
        name: "auth_oauth_to_app_duration",
        value: Number(oauthFlow.duration.toFixed(2)),
        unit: "ms",
        tags: oauthFlow.tags
      });
    }

    const passwordFlow = consumeFlowMetric("auth_password_to_app");
    if (passwordFlow) {
      reportClientMetric({
        name: "auth_password_to_app_duration",
        value: Number(passwordFlow.duration.toFixed(2)),
        unit: "ms",
        tags: passwordFlow.tags
      });
    }
  }, [isSessionLoading, session]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      markRouteStart("/");
      router.replace("/?login=1");
    } finally {
      setLoading(false);
    }
  };

  if (!userId && isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceApp
        supabase={supabase}
        userEmail={userEmail}
        userName={userName}
        avatarUrl={avatarUrl}
        userId={userId}
        onLogout={handleSignOut}
        logoutLoading={loading}
        initialViewMode={initialViewMode}
        initialSessionId={sessionIdParam}
      />
    </div>
  );
}
