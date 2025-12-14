import { Checkout } from "@creem_io/nextjs";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const creemCheckout = Checkout({
    apiKey: process.env.CREEM_API_KEY!,
    testMode: process.env.NODE_ENV !== "production",
    defaultSuccessUrl: "/app/settings/billing/success",
});

const QuerySchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    redirectUrl: z.string().url().optional()
});

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const result = QuerySchema.safeParse(queryParams);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        );

        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Pass the request to the Creem SDK handler
        // The SDK should handle reading productId from query params
        // We append user_id to the query params so the SDK forwards it to Creem
        url.searchParams.set('user_id', user.id);
        // Also try setting metadata directly if supported via query params
        url.searchParams.set('metadata[user_id]', user.id);

        const modifiedRequest = new NextRequest(url, request);

        let response;
        try {
            response = await creemCheckout(modifiedRequest);
        } catch (e: any) {
            // Check if it's a Next.js redirect error
            if (e.message === 'NEXT_REDIRECT') {
                throw e;
            }
            throw e;
        }

        // If the response is a redirect (307), return the URL as JSON
        // This allows the frontend to handle the redirect manually
        if (response.status === 307 || response.status === 303) {
            const location = response.headers.get("Location");
            if (location) {
                return NextResponse.json({ url: location });
            }
        }

        return response;
    } catch (error: any) {
        console.error("Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
