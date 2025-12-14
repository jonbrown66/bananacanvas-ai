<div align="center">
<img width="1200" height="475" alt="BananaCanvas AI" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# BananaCanvas AI
### AI-Powered Multimodal Creation Studio

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[English](README.md) | [中文说明](README_CN.md)

</div>

BananaCanvas AI is a cutting-edge creative workspace that combines chat-based AI interaction with an infinite canvas for multimodal content creation. Built with Next.js 15 and Supabase, it offers a seamless experience for generating, editing, and organizing AI-generated content.

## 🚀 Features

- **💬 AI Chat Workspace**: Seamlessly interact with advanced AI models (Gemini) to generate high-quality text and images in real-time.
- **🎨 Infinite Canvas**: A boundless creative space where you can drag, drop, and organize your ideas, images, and notes freely.
- **🖼️ Image Generation**: Create stunning visuals with integrated AI image generation tools directly within your workflow.
- **💳 Subscription System**: Robust integrated payments via Creem, offering a credit-based usage model for flexible scaling.
- **⚙️ Comprehensive Settings**: Full control over your profile, security, and billing preferences.
- **🌑 Dark Mode**: A meticulously designed UI that looks beautiful in both dark and light modes.
- **🔒 Secure Authentication**: Enterprise-grade security with Supabase Auth and Row Level Security (RLS).

## 🛠️ Tech Stack

### Core
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

### Backend & Database
- **BaaS**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime, Storage)
- **Email**: [Resend](https://resend.com/)

### UI & Components
- **Components**: [Radix UI](https://www.radix-ui.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

### AI & Integration
- **AI Models**: [Google Generative AI SDK](https://www.npmjs.com/package/@google/genai)
- **Validation**: [Zod](https://zod.dev/)
- **Payments**: [Creem](https://creem.io/)

## 🏁 Getting Started

### Prerequisites

Ensure you have the following installed/setup:
- Node.js 18+
- A Supabase project
- A Google Gemini API Key
- A Creem account (for payments)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/bananacanvas-ai.git
   cd bananacanvas-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add the following:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Google Gemini
   GEMINI_API_KEY=your_gemini_api_key

   # Creem Payments
   CREEM_API_KEY=your_creem_api_key
   CREEM_WEBHOOK_SECRET=your_webhook_secret
   NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER=...
   NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO=...
   NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS=...
   NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_300=...
   # ... add other product IDs

   # Resend
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Database Setup:**
   Run the SQL migrations located in `supabase/migrations` in your Supabase SQL Editor to set up the schema and RLS policies.
   > **Important**: Run `20251130_security_hardening.sql` to ensure data security.

5. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

```
bananacanvas-ai/
├── app/                  # Next.js App Router pages and API routes
│   ├── chat/             # Chat feature routes
│   └── (dashboard)/      # Dashboard layout and pages
├── components/           # Reusable UI components
│   ├── ui/               # Base UI components (buttons, inputs, etc.)
│   └── workspace/        # Workspace specific components
├── lib/                  # Utility functions and shared logic
├── supabase/             # Supabase configurations and migrations
│   └── migrations/       # SQL migration files
├── public/               # Static assets (images, icons)
├── styles/               # Global styles
└── types/                # TypeScript type definitions
```

## 🔒 Security

This project employs **Row Level Security (RLS)** in Supabase to protect user data. All API inputs are rigorously validated using **Zod** schema validation to prevent malformed requests and ensure data integrity.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
