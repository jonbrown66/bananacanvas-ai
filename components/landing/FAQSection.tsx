'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const shouldReduceMotion = usePrefersReducedMotion();

    return (
        <div className="border-b border-border/60 py-6 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-start justify-between text-left group transition-all"
            >
                <span className={`text-lg md:text-xl font-medium tracking-tight pr-8 transition-colors ${isOpen ? 'text-primary' : 'text-foreground'}`}>
                    {question}
                </span>
                <div className={`mt-1.5 flex items-center justify-center w-6 h-6 rounded-full transition-transform duration-500 ${isOpen ? 'rotate-45 text-primary' : 'text-muted-foreground'}`}>
                    <Plus size={20} />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={shouldReduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 200, damping: 25 }}
                    >
                        <div className="pt-4 pb-2 text-muted-foreground leading-relaxed max-w-[60ch]">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const FAQSection = () => {
    const t = useTranslations('LandingPage.FAQ');
    const shouldReduceMotion = usePrefersReducedMotion();

    const faqs = [
        { question: t('q1'), answer: t('a1') },
        { question: t('q2'), answer: t('a2') },
        { question: t('q3'), answer: t('a3') },
        { question: t('q4'), answer: t('a4') }
    ];

    return (
        <section id="faq" className="py-32 px-6 bg-background">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 md:gap-24">
                {/* Left Column: Asymmetric Header */}
                <div className="lg:col-span-4 sticky top-32 h-fit">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        {t('title')}
                    </div>
                    <h2 className="text-5xl md:text-6xl font-bold tracking-tighter leading-none text-foreground mb-8">
                        {t('header')}
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed max-w-[30ch]">
                        {t('description')}
                    </p>
                </div>

                {/* Right Column: FAQ List */}
                <div className="lg:col-span-8">
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                        whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
                        className="flex flex-col"
                    >
                        {faqs.map((faq, index) => (
                            <FAQItem key={index} question={faq.question} answer={faq.answer} />
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
