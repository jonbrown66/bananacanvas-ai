'use client';

import React, { useState } from 'react';
import { Zap, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSupabase } from "@/components/providers/supabase-provider";
import { useTranslations } from 'next-intl';

interface PricingSectionProps {
    plan: string;
    notify: (message: string) => void;
}

export const PricingSection = ({ plan, notify }: PricingSectionProps) => {
    const t = useTranslations('LandingPage.Pricing');
    const router = useRouter();
    const { session } = useSupabase();
    const [pricingMode, setPricingMode] = useState<'monthly' | 'yearly' | 'credits'>('monthly');

    const handlePurchase = async (productId: string) => {
        if (!session?.user?.id) {
            router.push('/login');
            return;
        }

        try {
            const redirectUrl = encodeURIComponent(window.location.origin + '/app/settings/billing/success');
            const response = await fetch(`/api/payments/checkout?productId=${productId}&redirectUrl=${redirectUrl}`);
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("No redirect URL returned", data);
                notify("Something went wrong. Please try again.");
            }
        } catch (error) {
            console.error("Checkout error:", error);
            notify("Failed to initiate checkout.");
        }
    };

    const handleUpgrade = async (targetPlan: string, productId: string) => {
        if (!session?.user?.id) {
            router.push('/login');
            return;
        }

        const PLAN_LEVELS: Record<string, number> = {
            'free': 0,
            'starter': 1,
            'pro': 2,
            'business': 3
        };

        const currentLevel = PLAN_LEVELS[plan] || 0;
        const targetLevel = PLAN_LEVELS[targetPlan] || 0;

        if (targetLevel < currentLevel) {
            notify("You are already on a higher plan.");
            return;
        }

        if (targetLevel === currentLevel) {
            notify("You are already on this plan.");
            return;
        }

        await handlePurchase(productId);
    };

    const creditPackages = [
        {
            credits: 300,
            price: "$4.9",
            desc: t('creditPackagesDesc'),
            productId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_300!,
            highlight: false
        },
        {
            credits: 800,
            price: "$9.9",
            desc: t('creditPackagesDesc'),
            productId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_800!,
            highlight: true
        },
        {
            credits: 2800,
            price: "$29.9",
            desc: t('creditPackagesDesc'),
            productId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_2800!,
            highlight: false
        },
        {
            credits: 7200,
            price: "$69.9",
            desc: t('creditPackagesDesc'),
            productId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_7200!,
            highlight: false
        }
    ];

    const subscriptionPlans = [
        {
            name: t('free'),
            price: "$0",
            period: "",
            desc: t('basicFeatures'),
            features: [
                t('creditsPerMonth', { count: 50 }),
                t('storage', { size: '2 GB' }),
                t('maxFileSize', { size: '5 MB' }),
                t('commercialLicense'),
                t('fastGeneration'),
                t('resolutionSupport', { res: '1K' })
            ],
            buttonText: t('getStartedFree'),
            action: () => router.push('/app'),
            highlight: false
        },
        {
            name: t('pro'),
            price: pricingMode === 'yearly' ? '$99' : '$9.9',
            period: pricingMode === 'yearly' ? `/${t('year')}` : `/${t('month')}`,
            desc: t('advancedFeatures'),
            features: [
                t('creditsPerMonth', { count: 2880 }),
                t('storage', { size: '50 GB' }),
                t('maxFileSize', { size: '20 MB' }),
                t('commercialLicense'),
                t('fastGeneration'),
                t('resolutionSupport', { res: '2K' })
            ],
            buttonText: t('upgrade'),
            action: () => handleUpgrade('pro', process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO!),
            highlight: true
        },
        {
            name: t('business'),
            price: pricingMode === 'yearly' ? '$299' : '$29.9',
            period: pricingMode === 'yearly' ? `/${t('year')}` : `/${t('month')}`,
            desc: t('enterpriseFeatures'),
            features: [
                t('creditsPerMonth', { count: 2880 }),
                t('storage', { size: '50 GB' }),
                t('maxFileSize', { size: '100 MB' }),
                t('commercialLicense'),
                t('fastGeneration'),
                t('resolutionSupport', { res: '4K' })
            ],
            buttonText: t('upgrade'),
            action: () => handleUpgrade('business', process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS!),
            highlight: false
        }
    ];

    return (
        <section id="pricing" className="py-24 px-6 bg-background border-t border-border">
            <div className="max-w-7xl mx-auto">
                {/* Toggle */}
                <div className="flex justify-center mb-16">
                    <div className="bg-muted p-1 rounded-full border border-border inline-flex relative">
                        <button
                            onClick={() => setPricingMode('monthly')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${pricingMode === 'monthly' ? 'bg-card text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('monthly')}
                        </button>
                        <button
                            onClick={() => setPricingMode('yearly')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${pricingMode === 'yearly' ? 'bg-card text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('yearly')}
                        </button>
                        <div className="w-px h-4 bg-border my-auto mx-1"></div>
                        <button
                            onClick={() => setPricingMode('credits')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${pricingMode === 'credits' ? 'bg-card text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('credits')}
                        </button>
                    </div>
                </div>

                {pricingMode === 'credits' ? (
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-foreground mb-2">{t('creditPackages')}</h3>
                            <p className="text-muted-foreground">{t('creditPackagesDesc')}</p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {creditPackages.map((pkg, index) => (
                                <div key={index} className={`bg-card rounded-3xl p-6 border border-border flex flex-col ${pkg.highlight ? 'border-2 border-foreground shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.3)] transform scale-105 z-10 relative' : ''}`}>
                                    {pkg.highlight && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background px-3 py-0.5 rounded-full text-xs font-bold shadow-lg">
                                            {t('popular')}
                                        </div>
                                    )}
                                    <div className={`flex items-center justify-between mb-8 ${pkg.highlight ? 'mt-2' : ''}`}>
                                        <div className="flex items-center gap-2 text-foreground font-bold text-xl">
                                            <Zap size={20} className="text-muted-foreground" /> {pkg.credits}
                                        </div>
                                        <div className="text-brand-DEFAULT font-bold text-2xl">{pkg.price}</div>
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-8 flex-1">
                                        {pkg.desc}
                                    </p>
                                    <button
                                        onClick={() => handlePurchase(pkg.productId)}
                                        className={`w-full py-3 px-6 rounded-xl bg-muted text-foreground font-bold hover:bg-muted/80 transition-colors ${pkg.highlight ? 'shadow-lg shadow-foreground/5 dark:shadow-white/10' : ''}`}
                                    >
                                        {t('purchase')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {subscriptionPlans.map((planItem, index) => (
                            <div key={index} className={`bg-card rounded-3xl p-8 border border-border flex flex-col ${planItem.highlight ? 'border-2 border-foreground shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.3)] transform scale-105 z-10 relative' : ''}`}>
                                {planItem.highlight && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                                        {t('popular')}
                                    </div>
                                )}
                                <h3 className="text-lg font-medium text-foreground mb-4">{planItem.name}</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-bold text-foreground tracking-tight">{planItem.price}</span>
                                    {planItem.period && <span className="text-lg text-muted-foreground font-medium">{planItem.period}</span>}
                                </div>
                                <p className="text-muted-foreground text-sm mb-8">{planItem.desc}</p>

                                <button
                                    onClick={planItem.action}
                                    className={`w-full py-3 px-6 rounded-xl bg-muted text-foreground font-bold hover:bg-muted/80 transition-colors mb-8 ${planItem.highlight ? 'shadow-lg shadow-foreground/5 dark:shadow-white/10' : ''}`}
                                >
                                    {planItem.buttonText}
                                </button>

                                <div className="border-t border-dashed border-border mb-8"></div>

                                <ul className="space-y-4 flex-1">
                                    {planItem.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                                <Check size={12} className="text-green-500" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};
