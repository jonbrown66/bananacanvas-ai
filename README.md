<div align="center">
<img width="1200" height="475" alt="BananaCanvas AI" src="public/feature-canvas-black.png" />

# BananaCanvas AI
### The Infinite AI Multimodal Creation Studio

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[English](README.md) | [中文说明](README_CN.md)

</div>

**BananaCanvas AI** is an advanced enterprise-grade AI creation workspace. It uniquely blends real-time conversational AI (powered by Google Gemini/Flux) with a boundless, infinite node-based canvas. Experience a revolutionary way to brainstorm, generate, structure, and visualize knowledge and assets seamlessly.

## ✨ Differentiating Highlights

- **🪐 Infinite Node Canvas & Chat Modes**: Instantly toggle between a traditional chat thread and a free-flowing, zoomable infinite canvas. Nodes automatically map connections conceptually.
- **⚡ Extreme Performance Architecture**: Employs client-side **transparent WebP compression** within HTML5 Canvases, reducing output image payload footprint by 20x. Incorporates native `decoding="async"` to eliminate main-thread blocking, keeping the UI at a buttery-smooth 60fps even with dozens of ultra-HD generated assets.
- **🖼️ Pinterest-Style Masonry Gallery**: A dynamic and immersive irregular grid showcasing cutting-edge generative prompts safely encapsulated with deep optimization.
- **💳 Built-in SaaS Billing Ecosystem**: Features an out-of-the-box integrated payment system seamlessly hooked into Supabase environments.

## 🛠️ Technology Stack

- **Frontend Core**: [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript
- **Styling & UX**: [Tailwind CSS](https://tailwindcss.com/), Radix UI, Framer Motion (for physics-based animations)
- **State Management**: Zustand (with strict selector isolation for highly-optimized rendering)
- **Backend & Database**: [Supabase](https://supabase.com/) (Auth, PostgreSQL DB, RLS Protocols)
- **AI Engine**: Google Generative AI (Gemini 3.1 Flash Image preview / Flux)

## 🏎️ Start Your Engines

### Prerequisites
- Node.js 18+ (pnpm recommended)
- A Supabase project
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/bananacanvas-ai.git
   cd bananacanvas-ai
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   Initialize `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Spin up your studio:**
   ```bash
   pnpm dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛡️ Data Governance
Protected at the database level using Supabase Row Level Security (RLS). Prompts and generations are siloed strictly to authenticated owners with robust fallback edge handlers.

## 📄 License
This intellectual property is available under the MIT License. See [LICENSE](LICENSE).
