import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { logApiEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

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

const CREDIT_PACKAGES = new Map<string, number>(
  [
    [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_300, 300],
    [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_800, 800],
    [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_2800, 2800],
    [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_7200, 7200],
    [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO, 880],
    [process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS, 2880]
  ].filter((entry): entry is [string, number] => Boolean(entry[0]))
);

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "23505";
}

function verifyHmacSignature(payload: string, headerValue: string | null, secret: string): boolean {
  if (!headerValue) return false;

  const normalized = headerValue.startsWith("sha256=")
    ? headerValue.slice("sha256=".length)
    : headerValue;

  if (!/^[a-f0-9]{64}$/i.test(normalized)) return false;

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(normalized, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: Request) {
  try {
    const headerList = await headers();
    const signatureHeader = headerList.get("x-creem-signature");
    const text = await request.text();

    if (!process.env.CREEM_WEBHOOK_SECRET) {
      console.error("[Creem Webhook] CREEM_WEBHOOK_SECRET is not set");
      logApiEvent("creem_webhook.missing_secret", {}, "error");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    if (!verifyHmacSignature(text, signatureHeader, process.env.CREEM_WEBHOOK_SECRET)) {
      console.error("[Creem Webhook] Invalid signature");
      logApiEvent("creem_webhook.invalid_signature", {}, "warn");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(text);
    const result = WebhookSchema.safeParse(payload);

    if (!result.success) {
      console.error("[Creem Webhook] Invalid payload:", result.error);
      logApiEvent("creem_webhook.invalid_payload", { issues: result.error.issues.length }, "warn");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { event_type, data, metadata: topLevelMetadata } = result.data;
    const eventKey = crypto.createHash("sha256").update(text).digest("hex");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: insertEventError } = await supabase.from("webhook_events").insert({
      provider: "creem",
      event_key: eventKey,
      event_type,
      payload
    });

    if (insertEventError) {
      if (isDuplicateKeyError(insertEventError)) {
        logApiEvent("creem_webhook.duplicate_ignored", { eventKey, eventType: event_type });
        return NextResponse.json({ received: true });
      }
      throw insertEventError;
    }
    logApiEvent("creem_webhook.accepted", { eventKey, eventType: event_type });

    if (event_type === "checkout.completed") {
      const { id, product_id, metadata, customer, status, amount_total, currency } = data;
      const userId = metadata?.user_id || metadata?.referenceId;

      if (userId && status === "completed") {
        let isFirstOrder = false;
        const orderRow = {
          user_id: userId,
          order_id: id,
          customer_id: customer?.id,
          status,
          amount: amount_total,
          currency
        };

        const { error: insertOrderError } = await supabase.from("creem_orders").insert(orderRow);

        if (insertOrderError) {
          if (isDuplicateKeyError(insertOrderError)) {
            const { error: updateOrderError } = await supabase
              .from("creem_orders")
              .update(orderRow)
              .eq("order_id", id);
            if (updateOrderError) {
              throw updateOrderError;
            }
          } else {
            throw insertOrderError;
          }
        } else {
          isFirstOrder = true;
        }

        if (customer?.id) {
          await supabase.from("profiles").update({ creem_customer_id: customer.id }).eq("id", userId);
        }

        if (isFirstOrder) {
          const creditsToAdd = product_id ? CREDIT_PACKAGES.get(product_id) : undefined;
          if (creditsToAdd) {
            await supabase.rpc("increment_credits", { p_user_id: userId, p_amount: creditsToAdd });
            await supabase.from("credit_transactions").insert({
              user_id: userId,
              amount: creditsToAdd,
              source: "Creem Webhook - Recharge",
              metadata: {
                provider: "creem",
                event_type,
                order_id: id,
                product_id
              }
            });
          }
        }
      }
    } else if (event_type === "subscription.active" || event_type === "subscription.paid") {
      const { id, customer, plan_id, status, current_period_end } = data;

      let userId = topLevelMetadata?.user_id;

      if (!userId && customer?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("creem_customer_id", customer.id)
          .single();
        userId = profile?.id;
      }

      if (userId) {
        await supabase.from("creem_subscriptions").upsert({
          subscription_id: id,
          user_id: userId,
          customer_id: customer?.id,
          status,
          plan_id,
          current_period_end: current_period_end ? new Date(current_period_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        }, { onConflict: "subscription_id" });

        let plan = "free";
        if (plan_id === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO) plan = "pro";
        else if (plan_id === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS) plan = "business";

        if (status === "active") {
          await supabase.from("profiles").update({
            plan,
            creem_subscription_id: id
          }).eq("id", userId);

          if (event_type === "subscription.paid") {
            let renewalCredits = 0;
            if (plan === "pro") renewalCredits = 880;
            if (plan === "business") renewalCredits = 2880;

            if (renewalCredits > 0) {
              const renewalSource = `Creem Webhook - Subscription Renewal (${plan})`;
              const { data: existingRenewalTx, error: existingRenewalError } = await supabase
                .from("credit_transactions")
                .select("id")
                .eq("user_id", userId)
                .eq("source", renewalSource)
                .contains("metadata", {
                  provider: "creem",
                  subscription_id: id,
                  event_type,
                  period_end: current_period_end ?? null
                })
                .limit(1);

              if (existingRenewalError) {
                throw existingRenewalError;
              }

              if (!existingRenewalTx || existingRenewalTx.length === 0) {
                await supabase.rpc("increment_credits", { p_user_id: userId, p_amount: renewalCredits });
                await supabase.from("credit_transactions").insert({
                  user_id: userId,
                  amount: renewalCredits,
                  source: renewalSource,
                  metadata: {
                    provider: "creem",
                    subscription_id: id,
                    event_type,
                    period_end: current_period_end ?? null
                  }
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Creem Webhook] Error:", error);
    logApiEvent("creem_webhook.failed", { message: error.message }, "error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
