'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-border/60 rounded-3xl bg-card/30 transition-all duration-300 hover:bg-card overflow-hidden group">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 md:p-8 text-left"
            >
                <span className="text-base md:text-lg font-medium text-foreground">{question}</span>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 flex-shrink-0 ml-4 ${isOpen ? 'bg-brand text-white shadow-sm' : 'bg-muted text-muted-foreground group-hover:bg-border/60 group-hover:text-foreground'}`}>
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0 text-muted-foreground leading-relaxed text-sm md:text-base">
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

    const faqs = [
        {
            question: t('q1'),
            answer: t('a1')
        },
        {
            question: t('q2'),
            answer: t('a2')
        },
        {
            question: t('q3'),
            answer: t('a3')
        },
        {
            question: t('q4'),
            answer: t('a4')
        }
    ];

    return (
        <section id="faq" className="py-24 px-6 bg-background">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-4xl text-center text-foreground mb-16">{t('title')}</h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>
        </section>
    );
};
