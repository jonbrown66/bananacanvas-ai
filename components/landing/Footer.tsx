import React from 'react';
import Link from 'next/link';
import { Twitter, Github, Linkedin } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const Footer = () => {
    const t = useTranslations('LandingPage.Footer');
    return (
        <footer className="py-12 px-6 bg-background border-t border-border">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-brand-DEFAULT rounded-lg"></div>
                            <span className="font-serif text-xl font-bold text-foreground">BananaCanvas</span>
                        </div>
                        <p className="text-muted-foreground max-w-sm">
                            {t('tagline')}
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground mb-6">{t('product')}</h4>
                        <ul className="space-y-4 text-muted-foreground">
                            <li><a href="#features" className="hover:text-foreground transition-colors">{t('features')}</a></li>
                            <li><a href="#pricing" className="hover:text-foreground transition-colors">{t('pricing')}</a></li>
                            <li><a href="/app" className="hover:text-foreground transition-colors">{t('launchApp')}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground mb-6">{t('company')}</h4>
                        <ul className="space-y-4 text-muted-foreground">
                            <li><a href="#" className="hover:text-foreground transition-colors">{t('contact')}</a></li>
                            <li><a href="#" className="hover:text-foreground transition-colors">{t('privacy')}</a></li>
                            <li><a href="#" className="hover:text-foreground transition-colors">{t('terms')}</a></li>
                        </ul>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border">
                    <p className="text-muted-foreground text-sm mb-4 md:mb-0">
                        {t('copyright')}
                    </p>
                    <div className="flex gap-6">
                        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Twitter size={20} />
                        </a>
                        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Github size={20} />
                        </a>
                        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Linkedin size={20} />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
