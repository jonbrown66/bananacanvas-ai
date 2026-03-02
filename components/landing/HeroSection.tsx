'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export const HeroSection = () => {
    const t = useTranslations('Landing');

    return (
        <>
            {/* Hero Section */}
            <section id="hero" className="pt-32 pb-20 md:pt-48 md:pb-32 px-6 relative overflow-hidden">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-brand-secondary text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-[0_0_15px_-3px_rgba(249,115,22,0.15)] dark:shadow-[0_0_15px_-3px_rgba(249,115,22,0.1)]">
                        <Sparkles size={12} className="text-brand" />
                        <span>{t('newFeature')}</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl leading-[1.1] font-medium text-foreground mb-8 tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        {t('heroTitle')}
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        {t('heroSubtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <Link
                            href="/app"
                            className="group relative w-full sm:w-auto px-10 py-4 bg-foreground text-background rounded-full font-semibold text-lg transition-all hover:-translate-y-1 hover:bg-foreground/90 hover:shadow-lg active:scale-95 overflow-hidden flex items-center justify-center gap-2"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {t('startCreating')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Abstract Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/10 rounded-full blur-[128px] opacity-30 mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-foreground/5 rounded-full blur-[128px] opacity-20 mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
                </div>
            </section>

            {/* UI Mockup Section */}
            <section className="px-6 pb-24 relative z-20 -mt-12 md:-mt-20">
                <div className="max-w-6xl mx-auto">
                    <div className="relative rounded-xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
                        {/* Window Controls */}
                        <div className="h-10 bg-muted border-b border-border flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            <div className="ml-4 px-3 py-1 bg-background/20 rounded text-xs text-muted-foreground font-mono">bananacanvas-pro.app</div>
                        </div>

                        {/* App Interface */}
                        <div className="relative bg-background overflow-hidden">
                            <Image
                                src="/hero-image.png"
                                alt="BananaCanvas Interface"
                                width={1920}
                                height={1080}
                                className="w-full h-auto object-cover block dark:hidden"
                                priority
                            />
                            <Image
                                src="/hero-image-black.png"
                                alt="BananaCanvas Interface"
                                width={1920}
                                height={1080}
                                className="w-full h-auto object-cover hidden dark:block"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};
