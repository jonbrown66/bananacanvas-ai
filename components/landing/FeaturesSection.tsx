'use client';

import React from 'react';
import { Layout, Zap, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export const FeaturesSection = () => {
  const t = useTranslations('LandingPage.Features');
  const shouldReduceMotion = usePrefersReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.08
      }
    }
  };

  const itemVariants = shouldReduceMotion
    ? {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.12 } }
    }
    : {
      hidden: { opacity: 0, y: 22, scale: 0.98 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring' as const, stiffness: 120, damping: 20 }
      }
    };

  // Update spotlight gradient position based on cursor.
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    currentTarget.style.setProperty('--x', `${clientX - left}px`);
    currentTarget.style.setProperty('--y', `${clientY - top}px`);
  };

  return (
    <section id="features" className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
          whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={shouldReduceMotion ? { duration: 0.12 } : { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl text-foreground mb-4">{t('title')}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]"
        >
          <motion.div
            variants={itemVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            onMouseMove={handleMouseMove}
            className="spotlight-card md:col-span-2 row-span-2 bg-card rounded-3xl p-8 border border-border shadow-sm relative overflow-hidden group hover:border-border/80 hover:shadow-lg transition-emphasis"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute top-8 left-8 z-10">
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand mb-4">
                <Layout size={24} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">{t('infiniteCanvas')}</h3>
              <p className="text-muted-foreground max-w-xs">{t('infiniteCanvasDesc')}</p>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.05),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="absolute bottom-[-20px] right-[-20px] w-[85%] h-auto z-10 transition-transform duration-500 group-hover:scale-[1.02]">
              <Image
                src="/feature-canvas.png"
                alt="Infinite Canvas Interface"
                width={1000}
                height={800}
                className="w-full h-auto rounded-xl shadow-2xl border-[6px] border-background/80 ring-1 ring-border/20 rotate-[-2deg] group-hover:rotate-0 transition-all duration-500 block dark:hidden"
              />
              <Image
                src="/feature-canvas-black.png"
                alt="Infinite Canvas Interface"
                width={1000}
                height={800}
                className="w-full h-auto rounded-xl shadow-2xl border-[6px] border-background/80 ring-1 ring-border/20 rotate-[-2deg] group-hover:rotate-0 transition-all duration-500 hidden dark:block"
              />
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            onMouseMove={handleMouseMove}
            className="spotlight-card bg-card rounded-3xl p-8 border border-border shadow-sm relative overflow-hidden group hover:border-border/80 hover:shadow-lg transition-emphasis"
          >
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-4 transition-transform group-hover:scale-110 duration-300">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 relative z-10">{t('fastGeneration')}</h3>
            <p className="text-muted-foreground text-sm relative z-10">{t('fastGenerationDesc')}</p>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors duration-500 pointer-events-none" />
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            onMouseMove={handleMouseMove}
            className="spotlight-card bg-card rounded-3xl p-8 border border-border shadow-sm relative overflow-hidden group hover:border-border/80 hover:shadow-lg transition-emphasis"
          >
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-4 transition-transform group-hover:scale-110 duration-300">
              <ImageIcon size={24} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 relative z-10">{t('smartEditing')}</h3>
            <p className="text-muted-foreground text-sm relative z-10">{t('smartEditingDesc')}</p>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors duration-500 pointer-events-none" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
