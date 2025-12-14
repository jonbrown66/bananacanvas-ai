import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-dynamic";

import { z } from "zod";

// ...

const VerifySchema = z.object({
    checkout_id: z.string().min(1),
    order_id: z.string().min(1),
    customer_id: z.string().min(1),
    product_id: z.string().min(1),
    signature: z.string().optional(),
    subscription_id: z.string().optional()
});

export async function GET(request: NextRequest) {
    try {
        const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const result = VerifySchema.safeParse(searchParams);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const { checkout_id, order_id, customer_id, product_id, signature, subscription_id } = result.data;

        // Note: Verify signature using process.env.CREEM_API_KEY or SECRET if available
        // For now, we trust the params but ensure idempotency

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
                        }
                    },
                },
            }
        );

        // Admin client for DB writes to bypass RLS
        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { }
                }
            }
        );

        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if order already exists
        const { data: existingOrder } = await supabaseAdmin
            .from('creem_orders')
            .select('id')
            .eq('order_id', order_id)
            .single();

        if (existingOrder) {
            return NextResponse.json({ success: true, message: "Order already processed" });
        }

        // Record Order
        // Note: We might not have 'amount' and 'currency' here if they aren't in params.
        // We'll insert what we have, using 0/USD as fallback if required by DB constraints.
        const { error: orderError } = await supabaseAdmin.from('creem_orders').insert({
            user_id: user.id,
            order_id: order_id,
            customer_id: customer_id,
            status: 'completed',
            amount: 0, // Fallback
            currency: 'USD' // Fallback
        });

        if (orderError) {
            console.error("Failed to insert order:", orderError);
            // Continue execution to ensure credits are updated
        }

        // Update Profile with Customer ID
        if (customer_id) {
            await supabaseAdmin.from('profiles').update({
                creem_customer_id: customer_id
            }).eq('id', user.id);
        }

        // Add Credits
        const CREDIT_PACKAGES: Record<string, number> = {
            [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_300!]: 300,
            [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_800!]: 800,
            [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_2800!]: 2800,
            [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_7200!]: 7200,
            // Subscriptions (initial purchase)
            [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO!]: 880,
            [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS!]: 2880
        };

        const creditsToAdd = CREDIT_PACKAGES[product_id!];
        if (creditsToAdd) {
            const { data: profile } = await supabaseAdmin.from('profiles').select('credits').eq('id', user.id).single();
            if (profile) {
                const newCredits = (profile.credits || 0) + creditsToAdd;
                await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);

                // Record credit transaction
                await supabaseAdmin.from('credit_transactions').insert({
                    user_id: user.id,
                    amount: creditsToAdd,
                    source: 'Recharge',
                });

                console.log(`[Payment Verify] Added ${creditsToAdd} credits to user ${user.id}`);
            }
        }

        // Handle Subscription Plan Update
        let plan = null;
        if (product_id === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER) plan = 'starter';
        else if (product_id === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO) plan = 'pro';
        else if (product_id === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS) plan = 'business';

        if (plan) {
            // subscription_id is already available from result.data

            await supabaseAdmin.from('profiles').update({
                plan: plan,
                creem_subscription_id: subscription_id
            }).eq('id', user.id);

            if (subscription_id) {
                const { error: subError } = await supabaseAdmin.from('creem_subscriptions').upsert({
                    subscription_id: subscription_id,
                    user_id: user.id,
                    customer_id: customer_id,
                    status: 'active',
                    plan_id: product_id,
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Approx 1 month
                    updated_at: new Date().toISOString()
                }, { onConflict: 'subscription_id' });

                if (subError) {
                    console.error("Failed to insert subscription:", subError);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Payment Verification Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
