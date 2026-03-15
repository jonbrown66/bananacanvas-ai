import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { checkRateLimit, extractClientIp } from "@/lib/security/rate-limit";
import { logApiEvent } from "@/lib/observability";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

import { z } from "zod";

const ContactSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    message: z.string().min(1, "Message is required")
});

export async function POST(request: Request) {
    try {
        const ip = extractClientIp(request);
        if (ip) {
            const limitResult = await checkRateLimit({
                key: `contact:${ip}`,
                limit: 3,
                windowSeconds: 60
            });
            if (!limitResult.allowed) {
                logApiEvent("contact.rate_limited", { ip, source: limitResult.source }, "warn");
                return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
            }
        }

        const body = await request.json();
        const result = ContactSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }

        const { name, email, message } = result.data;

        const { data, error } = await resend.emails.send({
            from: 'BananaCanvas Contact <onboarding@resend.dev>',
            to: ['xinjunbang@gmail.com'],
            subject: `New Contact Form Submission from ${escapeHtml(name)}`,
            html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message)}</p>
      `,
        });

        if (error) {
            logApiEvent("contact.send_failed", { message: String(error) }, "error");
            return NextResponse.json({ error }, { status: 500 });
        }

        logApiEvent("contact.sent", { email });
        return NextResponse.json(data);
    } catch (error: any) {
        logApiEvent("contact.failed", { message: error?.message || "unknown" }, "error");
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
