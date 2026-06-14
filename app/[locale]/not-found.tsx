'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function NotFound() {
    const t = useTranslations('Errors');

    return (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
            <div className="rounded-full bg-muted p-4">
                <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{t('notFound')}</h2>
            <p className="max-w-[500px] text-muted-foreground">
                {t('notFoundDesc')}
            </p>
            <Button asChild>
                <Link href="/">
                    {t('returnHome')}
                </Link>
            </Button>
        </div>
    );
}
