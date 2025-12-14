import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/app";

  const redirectUrl = new URL(next, requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  if (!code) {
    return response;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          response.cookies.set(name, "", { ...options, maxAge: 0 });
        }
      }
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, credits')
        .eq('id', user.id)
        .single();

      // Check for existing transactions to avoid duplicates
      const { count } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const hasTransactions = count !== null && count > 0;

      if (!hasTransactions) {
        const targetCredits = 100;

        if (!profile) {
          // Create new profile
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            credits: targetCredits,
            plan: 'free'
          });
        } else {
          // Profile exists (likely from trigger), ensure credits are correct
          // This fixes the issue where DB default might have been 1000
          if (profile.credits !== targetCredits) {
            await supabase.from('profiles').update({ credits: targetCredits }).eq('id', user.id);
          }
        }

        // Record initial credit transactions
        await supabase.from('credit_transactions').insert([
          { user_id: user.id, amount: 50, source: 'Free Plan' },
          { user_id: user.id, amount: 50, source: 'New User Bonus' }
        ]);
      }
    }
  }

  return response;
}
