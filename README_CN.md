<div align="center">
<img width="1200" height="475" alt="BananaCanvas AI" src="public/feature-canvas-black.png" />

# BananaCanvas AI
### 您的终极 AI 多模态无限创想空间

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[English](README.md) | [中文说明](README_CN.md)

</div>

**BananaCanvas AI** 是一款专为企业级设计与创客打造的前沿 AI 工作区。我们开创性地将“智能对话驱动”与“无限节点白板”相融合，为您带来打破空间与灵感界限的多模态生产引擎。

## ✨ 颠覆传统的特性亮点

- **🪐 无限画板与流式对话双区切换**：抛弃了僵化的传统聊天 UI，您能随时切换到无限缩放的画板中，所有生成的节点和想法都能被自由铺展、拖拽与归类。
- **⚡ 超级重载性能架构**：搭载客户端**静默 WebP 压缩协议**，能将 AI 引擎传回的好几兆 4K 图片在存入数据库前体积疯狂压缩近 20 倍；并融入原生级的 `decoding="async"` 以及强悍的 Zustand 选择器订阅刷新，确保您即便在这个宇宙中塞入上百张高清巨图，页面交互也将稳定在 60 帧级别的丝滑流畅。
- **🖼️ 瀑布流画廊**：高品质、极简灵妙的 Masonry Pinterest 风格公共组件陈列，打破平庸。
- **💳 坚固的 SaaS 基建底座**：开箱即用集成了基于 Supabase RLS 的企业级权限体系与 Creem 免合规支付接入。

## 🛠️ 重型技术栈

- **前端中枢**：[Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript
- **视觉体系**：[Tailwind CSS](https://tailwindcss.com/), Radix UI, 以及带来物理级灵动阻尼控制的 Framer Motion
- **状态流转**：Zustand
- **云端后座**：[Supabase](https://supabase.com/) (Auth 安全认证, PostgreSQL 行级保护表)
- **AI 神经**：Google Generative AI Engine (Gemini 3.1 Flash Image preview / Flux 生态)

## 🏎️ 点火启动

### 环境准备
- Node.js 18+ (建议 pnpm)
- Supabase 项目及密钥
- Google Gemini API Key

### 全自动组装

1. **拖拽仓库:**
   ```bash
   git clone https://github.com/yourusername/bananacanvas-ai.git
   cd bananacanvas-ai
   ```

2. **注入依赖:**
   ```bash
   pnpm install
   ```

3. **初始化命脉:**
   新建 `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
   SUPABASE_SERVICE_ROLE_KEY=数据库_service_key

   GEMINI_API_KEY=你的_gemini_api密钥
   ```

4. **主引擎点火:**
   ```bash
   pnpm dev
   ```
   随后通过浏览器飞入 [http://localhost:3000](http://localhost:3000)

## 🛡️ 引力场安全隔离
全面依托 Supabase 的行级安全控制（Row Level Security），您的每一次 Prompt 心血与天马行空的巨幅生成坐标均被无缝沙盒化保护。

## 📄 开源许可证
本项目遵循 MIT License 协议开源，详见 [LICENSE](LICENSE) 文档。
