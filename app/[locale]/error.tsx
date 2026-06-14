'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from 'next-intl';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();
    const t = useTranslations('Errors');

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
            <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{t('somethingWentWrong')}</h2>
            <p className="max-w-[500px] text-muted-foreground">
                {t('errorDesc')}
            </p>
            <div className="flex gap-2">
                <Button onClick={() => router.push('/')} variant="outline">
                    {t('goHome')}
                </Button>
                <Button onClick={() => reset()}>
                    {t('tryAgain')}
                </Button>
            </div>
        </div>
    );
}
