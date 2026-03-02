'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "@/i18n/routing";
import { useSupabase } from "@/components/providers/supabase-provider";
import { LandingPage } from "@/components/LandingPage";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { session } = useSupabase();
  const router = useRouter();
  useEffect(() => {
    if (session) {
      router.replace('/app');
    }
  }, [session, router]);

  if (session) {
    return null;
  }

  return <LandingPage />;
}
