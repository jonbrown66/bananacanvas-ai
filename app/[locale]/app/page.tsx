import { redirect } from "next/navigation";
import AppClient from "./app-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

interface AppPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AppPage({ params }: AppPageProps) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/login`);
  }

  const initialUser = {
    id: user.id,
    email: user.email || '',
    name: (user.user_metadata?.full_name as string) || user.email || 'Creative User',
    avatarUrl: (user.user_metadata?.avatar_url as string) || undefined
  };

  return <AppClient initialUser={initialUser} />;
}
