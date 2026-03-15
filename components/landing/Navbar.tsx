'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { LandingThemeToggle } from "@/components/landing-theme-toggle";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');
    const [isScrolled, setIsScrolled] = useState(false);
    const t = useTranslations('Landing');
    const shouldReduceMotion = usePrefersReducedMotion();

    const navItems = useMemo<Array<{ id: string; label: string }>>(() => ([
        { id: 'features', label: t('features') },
        { id: 'pricing', label: t('pricing') },
        { id: 'faq', label: t('faq') }
    ]), [t]);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    useEffect(() => {
        const sections = ['hero', ...navItems.map((item) => item.id)];
        const nodes = sections
            .map((id) => document.getElementById(id))
            .filter((node): node is HTMLElement => Boolean(node));

        if (!nodes.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visible[0]?.target?.id) {
                    setActiveSection(visible[0].target.id);
                }
            },
            {
                root: null,
                rootMargin: '-32% 0px -55% 0px',
                threshold: [0.1, 0.25, 0.5, 0.75]
            }
        );

        nodes.forEach((node) => observer.observe(node));

        return () => {
            nodes.forEach((node) => observer.unobserve(node));
            observer.disconnect();
        };
    }, [navItems]);

    useEffect(() => {
        const onScroll = () => {
            const nextScrolled = window.scrollY > 8;
            setIsScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));

            if (window.scrollY < 40) {
                setActiveSection('hero');
            }
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 py-4 transition-emphasis ${isScrolled ? 'bg-background/88 backdrop-blur-xl border-b border-border/90 shadow-[0_12px_32px_-24px_rgba(0,0,0,0.38)]' : 'bg-background/70 backdrop-blur-lg border-b border-border/50'}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollTo('hero')}>
                    {/* Logo Icon */}
                    <div className="w-8 h-8 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Image src="/logo.png" alt="Logo" width={32} height={32} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xl font-medium tracking-tight text-foreground">BananaCanvas</span>
                </div>

                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    {navItems.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => scrollTo(item.id)}
                                className={`relative pb-1 transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'} hover-underline-anim`}
                            >
                                {item.label}
                                {isActive && (
                                    <motion.span
                                        layoutId="nav-active-line"
                                        className="absolute left-0 right-0 -bottom-1 h-[2px] rounded-full bg-primary"
                                        transition={shouldReduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 450, damping: 36 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <LandingThemeToggle />
                    </div>
                    <div className="h-4 w-px bg-border mx-2"></div>
                    <Link
                        href="/login"
                        className="bg-foreground text-background px-6 py-2 rounded-full font-medium text-sm transition-all hover:bg-foreground/90 active:scale-95"
                    >
                        {t('getStarted')}
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden p-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                        transition={shouldReduceMotion ? { duration: 0.12 } : { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
                        className="absolute top-full left-0 right-0 bg-card border-b border-border p-6 flex flex-col gap-4 shadow-2xl md:hidden"
                    >
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollTo(item.id)}
                                className={`text-left py-3 font-medium border-b border-border transition-colors ${activeSection === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                        <div className="flex items-center justify-between py-3 border-b border-border">
                            <span className="text-muted-foreground font-medium">Settings</span>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher />
                                <LandingThemeToggle />
                            </div>
                        </div>
                        <Link
                            href="/login"
                            className="bg-foreground text-background py-3 rounded-xl text-center font-medium mt-2 active:scale-95 transition-transform"
                        >
                            {t('getStarted')}
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};
