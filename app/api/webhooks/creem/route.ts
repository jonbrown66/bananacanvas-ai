import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from "zod";

export const dynamic = 'force-dynamic';

const WebhookSchema = z.object({
    event_type: z.string(),
    data: z.object({
        id: z.string(),
        product_id: z.string().optional(),
        metadata: z.object({ user_id: z.string().optional(), referenceId: z.string().optional() }).optional(),
        customer: z.object({ id: z.string() }).optional(),
        status: z.string().optional(),
        amount_total: z.number().optional(),
        currency: z.string().optional(),
        plan_id: z.string().optional(),
        current_period_end: z.number().optional()
    }),
    metadata: z.object({ user_id: z.string().optional() }).optional()
});

export async function POST(request: Request) {
    try {

        const headerList = await headers();
        const signatureHeader = headerList.get('x-creem-signature');


        const text = await request.text();


        // Verify Signature
        if (!process.env.CREEM_WEBHOOK_SECRET) {
            console.error('[Creem Webhook] CREEM_WEBHOOK_SECRET is not set');
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        const hmac = crypto.createHmac('sha256', process.env.CREEM_WEBHOOK_SECRET);
        const digest = hmac.update(text).digest('hex');

        if (signatureHeader !== digest) {
            console.error('[Creem Webhook] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(text);
        const result = WebhookSchema.safeParse(payload);

        if (!result.success) {
            console.error('[Creem Webhook] Invalid payload:', result.error);
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const { event_type, data, metadata: topLevelMetadata } = result.data;

        // Initialize Supabase Admin Client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );



        if (event_type === 'checkout.completed') {
            const { id, product_id, metadata, customer, status, amount_total, currency } = data;
            const userId = metadata?.user_id || metadata?.referenceId;

            if (userId && status === 'completed') {
                // 幂等性检查：查看该订单是否已处理过
                const { data: existingOrder } = await supabase
                    .from('creem_orders')
                    .select('order_id')
                    .eq('order_id', id)
                    .maybeSingle();

                // Record Order (upsert for idempotency)
                await supabase.from('creem_orders').upsert({
                    user_id: userId,
                    order_id: id,
                    customer_id: customer?.id,
                    status: status,
                    amount: amount_total,
                    currency: currency
                }, { onConflict: 'order_id' });

                // Update Profile with Customer ID
                if (customer?.id) {
                    await supabase.from('profiles').update({
                        creem_customer_id: customer.id
                    }).eq('id', userId);
                }

                // Add Credits - 仅在首次处理时发放，防止 webhook 重试导致重复积分
                if (!existingOrder) {
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
                        await supabase.rpc('increment_credits', { p_user_id: userId, p_amount: creditsToAdd });
                        await supabase.from('credit_transactions').insert({
                            user_id: userId,
                            amount: creditsToAdd,
                            source: 'Creem Webhook - Recharge'
                        });
                    }
                }
            }
        } else if (event_type === 'subscription.active' || event_type === 'subscription.paid') {
            // Handle Subscription Updates
            const { id, customer, plan_id, status, current_period_end } = data;
            // We might need to look up user by customer_id if metadata isn't present in this event

            let userId = topLevelMetadata?.user_id; // Check if metadata is at top level

            if (!userId && customer?.id) {
                const { data: profile } = await supabase.from('profiles').select('id').eq('creem_customer_id', customer.id).single();
                userId = profile?.id;
            }

            if (userId) {
                // Upsert Subscription
                await supabase.from('creem_subscriptions').upsert({
                    subscription_id: id,
                    user_id: userId,
                    customer_id: customer?.id,
                    status: status,
                    plan_id: plan_id,
                    current_period_end: current_period_end ? new Date(current_period_end * 1000).toISOString() : null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'subscription_id' });

                // Update Profile Plan
                let plan = 'free';
                if (plan_id === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER) plan = 'starter';
                else if (plan_id === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO) plan = 'pro';
                else if (plan_id === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS) plan = 'business';

                if (status === 'active') {
                    await supabase.from('profiles').update({
                        plan: plan,
                        creem_subscription_id: id
                    }).eq('id', userId);

                    // Add credits on renewal (subscription.paid)
                    if (event_type === 'subscription.paid') {
                        let renewalCredits = 0;
                        if (plan === 'pro') renewalCredits = 880;
                        if (plan === 'business') renewalCredits = 2880;

                        if (renewalCredits > 0) {
                            await supabase.rpc('increment_credits', { p_user_id: userId, p_amount: renewalCredits });
                            await supabase.from('credit_transactions').insert({
                                user_id: userId,
                                amount: renewalCredits,
                                source: `Creem Webhook - Subscription Renewal (${plan})`
                            });
                        }
                    }
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[Creem Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
