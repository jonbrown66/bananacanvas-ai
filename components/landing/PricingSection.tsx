'use client';

import React, { useState } from 'react';
import { Zap, Check, Loader2 } from 'lucide-react';
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
    const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

    const handlePurchase = async (productId: string) => {
        if (!session?.user?.id) {
            router.push('/login');
            return;
        }

        if (loadingProductId) return;

        try {
            setLoadingProductId(productId);

            const redirectUrl = encodeURIComponent(window.location.origin + '/app/settings/billing/success');
            const response = await fetch(`/api/payments/checkout?productId=${productId}&redirectUrl=${redirectUrl}`);
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("No redirect URL returned", data);
                notify("Something went wrong. Please try again.");
                setLoadingProductId(null);
            }
        } catch (error) {
            console.error("Checkout error:", error);
            notify("Failed to initiate checkout.");
            setLoadingProductId(null);
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
                <div className="flex justify-center mb-16 relative z-20">
                    <div className="bg-muted/30 p-1.5 rounded-full border border-border inline-flex relative">
                        <button
                            onClick={() => setPricingMode('monthly')}
                            className={`px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${pricingMode === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('monthly')}
                        </button>
                        <button
                            onClick={() => setPricingMode('yearly')}
                            className={`px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${pricingMode === 'yearly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('yearly')}
                        </button>
                        <div className="w-px h-6 bg-border/50 my-auto mx-2"></div>
                        <button
                            onClick={() => setPricingMode('credits')}
                            className={`px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${pricingMode === 'credits' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
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
                                <div
                                    key={index}
                                    className={`relative group bg-card rounded-3xl p-8 transition-all duration-300 ${pkg.highlight ? 'border-2 border-brand shadow-sm transform scale-105 z-10' : 'border border-border hover:border-border/80 hover:shadow-lg hover:-translate-y-1'} flex flex-col`}
                                >
                                    {pkg.highlight && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white px-3 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase">
                                            {t('popular')}
                                        </div>
                                    )}
                                    <div className={`flex items-center justify-between xl:flex-row flex-col xl:items-end items-start gap-4 mb-8 relative z-10 ${pkg.highlight ? 'mt-2' : ''}`}>
                                        <div className="flex items-center gap-2 text-foreground font-semibold text-xl">
                                            <Zap size={20} className={pkg.highlight ? "text-brand" : "text-muted-foreground"} /> {pkg.credits}
                                        </div>
                                        <div className="text-foreground tracking-tight font-bold text-3xl">{pkg.price}</div>
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-8 flex-1 leading-relaxed relative z-10">
                                        {pkg.desc}
                                    </p>
                                    <button
                                        onClick={() => handlePurchase(pkg.productId)}
                                        disabled={loadingProductId === pkg.productId}
                                        className={`w-full py-3 px-6 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all relative z-10 ${pkg.highlight ? 'bg-brand text-white shadow-sm hover:opacity-90 active:scale-95' : 'bg-muted text-foreground hover:bg-muted/80 active:scale-95'} disabled:opacity-70 disabled:cursor-not-allowed`}
                                    >
                                        {loadingProductId === pkg.productId ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> {t('purchase')}
                                            </>
                                        ) : (
                                            t('purchase')
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {subscriptionPlans.map((planItem, index) => (
                            <div
                                key={index}

                                className={`relative group bg-card rounded-3xl p-8 transition-all duration-300 ${planItem.highlight ? 'border-2 border-brand shadow-sm transform scale-105 z-10 flex flex-col' : 'border border-border hover:border-border/80 hover:-translate-y-1 hover:shadow-lg flex flex-col'}`}
                            >
                                {planItem.highlight && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white px-3 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase">
                                        {t('popular')}
                                    </div>
                                )}
                                <h3 className={`text-lg font-semibold relative z-10 mb-4 ${planItem.highlight ? 'text-brand' : 'text-foreground'}`}>{planItem.name}</h3>
                                <div className="flex items-baseline gap-1 mb-2 relative z-10">
                                    <span className="text-4xl font-bold text-foreground tracking-tight">{planItem.price}</span>
                                    {planItem.period && <span className="text-sm text-muted-foreground font-medium">{planItem.period}</span>}
                                </div>
                                <p className="text-muted-foreground text-sm mb-8 leading-relaxed relative z-10">{planItem.desc}</p>

                                <button
                                    onClick={planItem.action}
                                    disabled={loadingProductId !== null}
                                    className={`w-full py-3 px-6 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all relative z-10 mb-8 ${planItem.highlight ? 'bg-brand text-white shadow-sm hover:opacity-90 active:scale-95' : 'bg-muted text-foreground hover:bg-muted/80 active:scale-95'} disabled:opacity-70 disabled:cursor-not-allowed`}
                                >
                                    {(planItem.name === t('pro') && loadingProductId === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO) ||
                                        (planItem.name === t('business') && loadingProductId === process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS) ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> {planItem.buttonText}
                                        </>
                                    ) : (
                                        planItem.buttonText
                                    )}
                                </button>

                                <div className="border-t border-border/50 mb-8 w-full relative z-10"></div>

                                <ul className="space-y-4 flex-1 relative z-10">
                                    {planItem.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-start gap-3 text-sm text-foreground/80">
                                            <div className="mt-0.5">
                                                <Check size={16} strokeWidth={3} className={planItem.highlight ? "text-brand" : "text-muted-foreground"} />
                                            </div>
                                            <span className="leading-relaxed">{feature}</span>
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
