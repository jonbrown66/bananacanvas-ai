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
                    setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: Record<string, unknown> }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
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

        // [SECURITY PATCH]: 以前依赖客户端传参发积分，极易被伪造请求恶意刷量。
        // 现在将具体的积分增加与订阅状态更新，全部交由后端的安全 Webhook (/api/webhooks/creem/route.ts) 统一处理。
        // 此接口此时仅作为一个前端回调状态的成功确认，而不进行实际 DB 写操作，防止被薅羊毛。

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Payment Verification Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
