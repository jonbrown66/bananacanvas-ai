import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";
import { Providers } from "../providers";

import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "BananaCanvas AI",
    template: "%s | BananaCanvas AI"
  },
  description: "AI-powered conversational canvas for multimodal creation and editing. Create, edit, and collaborate with AI.",
  keywords: ["AI", "Canvas", "Design", "Generative AI", "Creative Tools", "Multimodal"],
  authors: [{ name: "BananaCanvas Team" }],
  creator: "BananaCanvas Team",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bananacanvas.ai",
    title: "BananaCanvas AI",
    description: "AI-powered conversational canvas for multimodal creation and editing.",
    siteName: "BananaCanvas AI",
    images: [
      {
        url: '/hero-image.png',
        width: 1200,
        height: 630,
        alt: 'BananaCanvas AI Preview',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BananaCanvas AI",
    description: "AI-powered conversational canvas for multimodal creation and editing.",
    creator: "@bananacanvas",
  },
  icons: {
    icon: "/logo.png",
  },
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Providers>{children}</Providers>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
// Force rebuild
