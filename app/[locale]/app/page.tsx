'use client';

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkspaceApp from "@/components/AppWorkspace";
import { useSupabase } from "@/components/providers/supabase-provider";

export default function AppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, session } = useSupabase();
  const [loading, setLoading] = useState(false);
  const userEmail = session?.user?.email || "";
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "U";

  const viewParam = searchParams?.get("view");
  const sessionIdParam = searchParams?.get("sessionId");
  const initialViewMode = viewParam === "canvas" ? "canvas" : "chat";

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/?login=1");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceApp
        supabase={supabase}
        userEmail={userEmail}
        userName={(session?.user?.user_metadata?.full_name as string) || userEmail || "Creative User"}
        avatarUrl={(session?.user?.user_metadata?.avatar_url as string) || undefined}
        userId={session?.user?.id}
        onLogout={handleSignOut}
        logoutLoading={loading}
        initialViewMode={initialViewMode}
        initialSessionId={sessionIdParam}
      />
    </div>
  );
}
