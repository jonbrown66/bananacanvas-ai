'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-border rounded-2xl bg-card overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <span className="text-lg font-bold text-foreground">{question}</span>
                <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
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
                <h2 className="font-serif text-4xl text-center text-foreground mb-16">{t('title')}</h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>
        </section>
    );
};
