import { Checkout } from "@creem_io/nextjs";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { normalizeSuccessUrl } from "@/lib/security/route-guards";
import { logApiEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

const creemCheckout = Checkout({
    apiKey: process.env.CREEM_API_KEY!,
    testMode: process.env.NODE_ENV !== "production",
    defaultSuccessUrl: "/app?view=settings&tab=billing",
});

const QuerySchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    redirectUrl: z.string().optional()
});

const allowedProductIds = new Set(
    [
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO,
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS,
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_300,
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_800,
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_2800,
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_7200,
    ].filter((id): id is string => Boolean(id))
);

async function handleCheckout(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const result = QuerySchema.safeParse(queryParams);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const { productId, redirectUrl } = result.data;

        if (!allowedProductIds.has(productId)) {
            logApiEvent("checkout.invalid_product", { productId }, "warn");
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
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
                    setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: Record<string, unknown> }) =>
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
            logApiEvent("checkout.unauthorized", {}, "warn");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Pass the request to the Creem SDK handler
        // The SDK reads 'metadata' (JSON string), 'referenceId', and 'successUrl' from query params
        // Map our params to what the SDK expects
        url.searchParams.set('productId', productId);
        url.searchParams.set('metadata', JSON.stringify({ user_id: user.id }));
        url.searchParams.set('referenceId', user.id);

        // SDK expects 'successUrl' not 'redirectUrl' - map it
        const safeSuccessUrl = normalizeSuccessUrl(redirectUrl ?? null, url.origin);
        if ((redirectUrl ?? null) && !safeSuccessUrl) {
            logApiEvent("checkout.invalid_redirect", { redirectUrl }, "warn");
            return NextResponse.json({ error: "Invalid redirect URL" }, { status: 400 });
        }
        if (safeSuccessUrl) {
            url.searchParams.set('successUrl', safeSuccessUrl);
        }
        url.searchParams.delete('redirectUrl');

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
                logApiEvent("checkout.created", { userId: user.id, productId });
                return NextResponse.json({ url: location });
            }
        }

        return response;
    } catch (error: any) {
        console.error("Checkout Error:", error);
        logApiEvent("checkout.failed", { message: error.message }, "error");
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const POST = handleCheckout;
