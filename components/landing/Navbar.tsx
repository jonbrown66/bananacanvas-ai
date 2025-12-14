import React, { useState } from 'react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { LandingThemeToggle } from "@/components/landing-theme-toggle";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '../LanguageSwitcher';

export const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const t = useTranslations('Landing');

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border py-4">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollTo('hero')}>
                    {/* Logo Icon */}
                    <div className="w-8 h-8 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Image src="/logo.png" alt="Logo" width={32} height={32} className="w-full h-full object-contain" />
                    </div>
                    <span className="font-serif text-xl font-medium tracking-tight text-foreground">BananaCanvas</span>
                </div>

                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">{t('features')}</button>
                    <button onClick={() => scrollTo('pricing')} className="hover:text-foreground transition-colors">{t('pricing')}</button>
                    <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">{t('faq')}</button>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <LandingThemeToggle />
                    </div>
                    <div className="h-4 w-px bg-border mx-2"></div>
                    <Link
                        href="/login"
                        className="bg-foreground text-background px-6 py-2.5 rounded-full hover:bg-muted-foreground/20 hover:text-foreground transition-all font-bold text-sm shadow-[0_0_20px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
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
            {mobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-card border-b border-border p-6 flex flex-col gap-4 shadow-2xl md:hidden animate-in slide-in-from-top-2">
                    <button onClick={() => scrollTo('features')} className="text-left py-3 text-muted-foreground hover:text-foreground font-medium border-b border-border">{t('features')}</button>
                    <button onClick={() => scrollTo('pricing')} className="text-left py-3 text-muted-foreground hover:text-foreground font-medium border-b border-border">{t('pricing')}</button>
                    <button onClick={() => scrollTo('faq')} className="text-left py-3 text-muted-foreground hover:text-foreground font-medium border-b border-border">{t('faq')}</button>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground font-medium">Settings</span>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            <LandingThemeToggle />
                        </div>
                    </div>
                    <Link
                        href="/login"
                        className="bg-foreground text-background py-3 rounded-xl text-center font-bold mt-2"
                    >
                        {t('getStarted')}
                    </Link>
                </div>
            )}
        </nav>
    );
};
