import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {

        const headerList = await headers();
        const signatureHeader = headerList.get('x-signature');


        const text = await request.text();


        const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '');
        const digest = Buffer.from(hmac.update(text).digest('hex'), 'utf8');
        const signature = Buffer.from(signatureHeader || '', 'utf8');

        if (!crypto.timingSafeEqual(digest, signature)) {
            console.error('[Webhook] Invalid signature');
            console.error(`[Webhook] Expected: ${digest.toString()}, Got: ${signature.toString()}`);
            // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        } else {

        }

        const payload = JSON.parse(text);
        const { meta, data } = payload;
        const eventName = meta.event_name;
        const customData = meta.custom_data || (data.attributes.test_mode ? { user_id: meta.custom_data?.user_id } : meta.custom_data);

        // Initialize Supabase Admin Client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const userId = customData?.user_id;

        // if (!userId) {
        //     console.error('No user_id found in webhook custom_data');
        //     return NextResponse.json({ message: 'No user_id provided' }, { status: 200 });
        // }

        if (eventName === 'order_created') {
            const { status, total, currency, first_order_item } = data.attributes;
            const orderId = data.id;
            const customerId = data.attributes.customer_id;


            if (userId) {
                await supabase.from('lemon_squeezy_orders').insert({
                    user_id: userId,
                    order_id: orderId,
                    customer_id: customerId.toString(),
                    status,
                    total,
                    currency,
                });

                if (status === 'paid') {
                    // Update customer_id
                    await supabase.from('profiles').update({
                        lemon_squeezy_customer_id: customerId.toString()
                    }).eq('id', userId);


                    // Handle Credit Packages
                    const variantId = first_order_item?.variant_id?.toString();
                    const CREDIT_PACKAGES: Record<string, number> = {
                        // One-time packages
                        '1119171': 300,
                        '1119181': 800,
                        '1119182': 2800,
                        '1119184': 7200,
                        // Subscriptions (Pro: 880, Business: 2880)
                        '1116361': 880,
                        '1116456': 2880
                    };

                    if (variantId && CREDIT_PACKAGES[variantId]) {
                        const creditsToAdd = CREDIT_PACKAGES[variantId];

                        // Fetch current credits
                        const { data: profile, error: fetchError } = await supabase
                            .from('profiles')
                            .select('credits')
                            .eq('id', userId)
                            .single();

                        if (!fetchError && profile) {
                            const newCredits = (profile.credits || 0) + creditsToAdd;
                            const { error: updateError } = await supabase.from('profiles').update({
                                credits: newCredits
                            }).eq('id', userId);

                            if (updateError) {
                                console.error(`[Webhook] Failed to update credits for user ${userId}:`, updateError);
                            } else {

                            }
                        } else {
                            console.error(`[Webhook] Failed to fetch profile for user ${userId} to add credits`);
                        }
                    }
                }
            } else {
                console.warn('[Webhook] Order created but no userId found');
            }
        } else if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
            const { status, variant_id, renews_at, ends_at } = data.attributes;
            const subscriptionId = data.id;
            const customerId = data.attributes.customer_id;
            const planName = data.attributes.product_name;



            // If userId is missing from custom_data (e.g. in some update events), try to find it from existing subscription
            let targetUserId = userId;
            if (!targetUserId) {

                const { data: existingSub } = await supabase
                    .from('lemon_squeezy_subscriptions')
                    .select('user_id')
                    .eq('subscription_id', subscriptionId)
                    .single();
                if (existingSub) {
                    targetUserId = existingSub.user_id;

                } else {
                    console.warn(`[Webhook] Could not find existing subscription for ${subscriptionId}`);
                }
            }

            if (targetUserId) {
                const { error: subError } = await supabase.from('lemon_squeezy_subscriptions').upsert({
                    user_id: targetUserId,
                    subscription_id: subscriptionId,
                    customer_id: customerId.toString(),
                    status,
                    variant_id: variant_id.toString(),
                    plan_name: planName,
                    renews_at: renews_at,
                    ends_at: ends_at,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'subscription_id' });

                if (subError) {
                    console.error('[Webhook] Error upserting subscription:', subError);
                }

                let plan = 'free';
                const variantIdStr = variant_id.toString();
                if (variantIdStr === '1116359') plan = 'starter';
                else if (variantIdStr === '1116361') plan = 'pro';
                else if (variantIdStr === '1116456') plan = 'business';



                if (status === 'active') {
                    const { error: profileError } = await supabase.from('profiles').update({
                        plan: plan,
                        lemon_squeezy_subscription_id: subscriptionId,
                        lemon_squeezy_customer_id: customerId.toString()
                    }).eq('id', targetUserId);

                    if (profileError) {
                        console.error('[Webhook] Error updating profile:', profileError);
                    } else {

                    }
                } else if (status === 'cancelled' || status === 'expired') {
                    await supabase.from('profiles').update({
                        plan: 'free'
                    }).eq('id', targetUserId);

                }
            } else {
                console.error(`[Webhook] Could not find user_id for subscription ${subscriptionId}`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
