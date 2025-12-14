import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreditHistoryDialog } from "@/components/settings/credit-history-dialog";
import type { Database } from "@/lib/types";
import { useTranslations } from "next-intl";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const PRO_PLAN_PRODUCT_ID = process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PRO!;
const BUSINESS_PLAN_PRODUCT_ID = process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_BUSINESS!;

interface BillingTabProps {
    billingProfile: Pick<ProfileRow, "credits" | "plan">;
    onNavigate?: (sessionId: string) => void;
}

export function BillingTab({ billingProfile, onNavigate }: BillingTabProps) {
    const t = useTranslations('Settings.Billing');
    const { session } = useSupabase();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const PACKAGES = [
        { credits: 300, price: "$4.9", desc: t('perfectForStarter'), highlight: false, productId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_300! },
        { credits: 800, price: "$9.9", desc: t('greatValue'), highlight: true, productId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_800! },
        { credits: 2800, price: "$29.9", desc: t('bestForPower'), highlight: false, productId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_2800! },
        { credits: 7200, price: "$69.9", desc: t('designedForTeams'), highlight: false, productId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_CREDITS_7200! }
    ];

    const handleCheckout = async (productId: string) => {
        if (!session?.user?.id) return;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/payments/checkout?productId=${productId}&redirectUrl=${encodeURIComponent(window.location.origin + '/app/settings/billing/success')}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session');
            }

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (e: any) {
            setError(e.message || "Operation failed");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6 min-h-[180px] shadow-sm flex flex-col justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('currentPlan')}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-4xl font-bold capitalize">{billingProfile.plan || "free"}</p>
                            <span className="text-sm text-muted-foreground">/ {t('month')}</span>
                        </div>
                    </div>
                    <Button
                        className="w-full"
                        onClick={() => handleCheckout(billingProfile.plan === 'pro' ? BUSINESS_PLAN_PRODUCT_ID : PRO_PLAN_PRODUCT_ID)}
                        disabled={loading || billingProfile.plan === 'business'}
                    >
                        {billingProfile.plan === 'business' ? t('currentPlan') : billingProfile.plan === 'pro' ? t('upgradeToBusiness') : t('upgradeToPro')}
                    </Button>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 min-h-[180px] shadow-sm flex flex-col justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('creditBalance')}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-4xl font-bold">{billingProfile.credits ?? 0}</p>
                            <span className="text-sm text-muted-foreground">{t('credits')}</span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setShowHistory(true)}>
                        {t('viewHistory')}
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium px-1">{t('topUpCredits')}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {PACKAGES.map((pkg) => (
                        <div
                            key={pkg.credits}
                            className={cn(
                                "relative rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
                                pkg.highlight
                                    ? "border-primary/50 bg-primary/5 shadow-sm"
                                    : "border-border bg-card"
                            )}
                        >
                            {pkg.highlight && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                                    {t('popular')}
                                </div>
                            )}
                            <div className="flex justify-between items-baseline pt-1">
                                <span className="font-semibold text-lg">{pkg.credits}</span>
                                <span className="font-bold text-2xl">{pkg.price}</span>
                            </div>
                            <p className="text-xs text-muted-foreground flex-1 leading-relaxed">{pkg.desc}</p>
                            <Button
                                size="sm"
                                className="w-full mt-1"
                                variant={pkg.highlight ? "default" : "secondary"}
                                onClick={() => handleCheckout(pkg.productId)}
                                disabled={loading}
                            >
                                {t('purchase')}
                            </Button>
                        </div>
                    ))}
                </div>
                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            </div>

            <CreditHistoryDialog open={showHistory} onOpenChange={setShowHistory} onNavigate={onNavigate} />
        </div>
    );
}
