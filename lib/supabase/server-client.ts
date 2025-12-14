import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Database } from "../types";

// For server components: only read cookies; writes must happen in Route Handlers / Server Actions.
export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // no-op in RSC to avoid "Cookies can only be modified..." errors
        },
        remove() {
          // no-op in RSC
        }
      }
    }
  );
};
