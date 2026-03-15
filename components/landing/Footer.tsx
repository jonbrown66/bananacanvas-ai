'use client';

import React from 'react';
import Image from 'next/image';
import { Twitter, Github, Linkedin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const SOCIAL_LINKS = [
  {
    href: 'https://x.com/bananacanvas',
    label: 'X',
    Icon: Twitter
  },
  {
    href: 'https://github.com/bananacanvas-ai',
    label: 'GitHub',
    Icon: Github
  },
  {
    href: 'https://www.linkedin.com/company/bananacanvas-ai',
    label: 'LinkedIn',
    Icon: Linkedin
  }
];

export const Footer = () => {
  const t = useTranslations('LandingPage.Footer');
  const shouldReduceMotion = usePrefersReducedMotion();

  return (
    <footer className="py-12 px-6 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.36, ease: [0.2, 0.8, 0.2, 1] }}
          className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12"
        >
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 cursor-pointer group">
              <div className="w-8 h-8 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Image src="/logo.png" alt="Logo" width={32} height={32} className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-medium tracking-tight text-foreground">BananaCanvas</span>
            </Link>
            <p className="text-muted-foreground max-w-sm">{t('tagline')}</p>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6">{t('product')}</h4>
            <ul className="space-y-4 text-muted-foreground">
              <li><a href="#features" className="hover-underline-anim hover:text-foreground transition-colors">{t('features')}</a></li>
              <li><a href="#pricing" className="hover-underline-anim hover:text-foreground transition-colors">{t('pricing')}</a></li>
              <li><Link href="/app" className="hover-underline-anim hover:text-foreground transition-colors">{t('launchApp')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6">{t('company')}</h4>
            <ul className="space-y-4 text-muted-foreground">
              <li><Link href="/contact" className="hover-underline-anim hover:text-foreground transition-colors">{t('contact')}</Link></li>
              <li><Link href="/privacy" className="hover-underline-anim hover:text-foreground transition-colors">{t('privacy')}</Link></li>
              <li><Link href="/terms" className="hover-underline-anim hover:text-foreground transition-colors">{t('terms')}</Link></li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.34, ease: [0.2, 0.8, 0.2, 1], delay: 0.06 }}
          className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border gap-4"
        >
          <p className="text-muted-foreground text-sm">{t('copyright')}</p>
          <div className="flex gap-6">
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <Icon size={20} />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
};
