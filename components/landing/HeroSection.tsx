'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export const HeroSection = () => {
    const t = useTranslations('Landing');
    const shouldReduceMotion = usePrefersReducedMotion();
    const heroRef = useRef<HTMLDivElement>(null);
    const heroContentRef = useRef<HTMLDivElement>(null);
    const heroMockupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const hero = heroRef.current;
        const content = heroContentRef.current;
        const mockup = heroMockupRef.current;

        if (!hero || !content || !mockup) return;

        if (shouldReduceMotion) {
            content.style.opacity = '';
            content.style.transform = '';
            content.style.willChange = '';
            mockup.style.opacity = '';
            mockup.style.transform = '';
            mockup.style.willChange = '';
            return;
        }

        let rafId: number | null = null;

        const update = () => {
            rafId = null;

            const startY = hero.offsetTop + 40;
            const fadeDistance = Math.max(hero.offsetHeight * 0.82, window.innerHeight * 1.05, 1);
            const progress = Math.min(Math.max((window.scrollY - startY) / fadeDistance, 0), 1);

            if (progress <= 0.01) {
                content.style.opacity = '';
                content.style.transform = '';
                content.style.willChange = '';

                mockup.style.opacity = '';
                mockup.style.transform = '';
                mockup.style.willChange = '';
                return;
            }

            const contentOpacity = Math.max(0, 1 - progress * 1.35);
            const contentTranslate = progress * 54;
            const contentScale = 1 - progress * 0.045;

            const mockupOpacity = Math.max(0, 1 - progress * 1.12);
            const mockupTranslate = progress * 44;
            const mockupScale = 1 - progress * 0.04;

            content.style.opacity = String(contentOpacity);
            content.style.transform = `translate3d(0, ${contentTranslate}px, 0) scale(${contentScale})`;
            content.style.willChange = progress > 0 && progress < 1 ? 'opacity, transform' : '';

            mockup.style.opacity = String(mockupOpacity);
            mockup.style.transform = `translate3d(0, ${mockupTranslate}px, 0) scale(${mockupScale})`;
            mockup.style.willChange = progress > 0 && progress < 1 ? 'opacity, transform' : '';
        };

        const scheduleUpdate = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);

        return () => {
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
        };
    }, [shouldReduceMotion]);

    return (
        <div id="hero" ref={heroRef} className="relative">
            {/* Hero Section */}
            <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6 relative overflow-hidden">
                <div ref={heroContentRef} className="max-w-5xl mx-auto text-center relative z-10 transition-emphasis">
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
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 md:w-96 md:h-96 bg-brand/10 rounded-full blur-3xl md:blur-[128px] opacity-30 mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 md:w-96 md:h-96 bg-foreground/5 rounded-full blur-3xl md:blur-[128px] opacity-20 mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
                </div>
            </section>

            {/* UI Mockup Section */}
            <section className="px-6 pb-24 relative z-20 -mt-12 md:-mt-20">
                <div className="max-w-6xl mx-auto">
                    <div ref={heroMockupRef} className="relative rounded-xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 transition-emphasis">
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
                                quality={85}
                                sizes="(max-width: 1280px) 100vw, 1280px"
                            />
                            <Image
                                src="/hero-image-black.png"
                                alt="BananaCanvas Interface"
                                width={1920}
                                height={1080}
                                className="w-full h-auto object-cover hidden dark:block"
                                priority
                                quality={85}
                                sizes="(max-width: 1280px) 100vw, 1280px"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
