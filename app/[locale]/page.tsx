'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "@/i18n/routing";
import { useSupabase } from "@/components/providers/supabase-provider";
import { LandingPage } from "@/components/LandingPage";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { session } = useSupabase();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (session) {
      setIsRedirecting(true);
      router.replace('/app');
    }
  }, [session, router]);

  if (session || isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <>
      <LandingPage />
    </>
  );
}
