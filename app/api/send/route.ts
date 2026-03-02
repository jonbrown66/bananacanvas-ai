import { Resend } from 'resend';
import { NextResponse } from 'next/server';

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

const rateLimitMap = new Map();

export async function POST(request: Request) {
    try {
        // Basic IP Rate Limiting
        const forwardedFor = request.headers.get("x-forwarded-for");
        const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown";

        if (ip !== "unknown") {
            const now = Date.now();
            const windowMs = 60 * 1000; // 1 minute
            const maxRequests = 3;

            const userRequests = rateLimitMap.get(ip) || [];
            const recentRequests = userRequests.filter((time: number) => now - time < windowMs);

            if (recentRequests.length >= maxRequests) {
                return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
            }

            recentRequests.push(now);
            rateLimitMap.set(ip, recentRequests);
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
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
