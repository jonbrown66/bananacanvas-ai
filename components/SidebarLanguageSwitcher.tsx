'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function SidebarLanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const handleSwitch = (newLocale: 'en' | 'zh-CN') => {
        if (newLocale === locale) return;
        startTransition(() => {
            router.replace(pathname, { locale: newLocale });
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <Button
                variant={locale === 'en' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleSwitch('en')}
                disabled={isPending}
                className="w-full justify-start gap-2 px-2 font-normal"
            >
                <span className="text-xs font-bold border border-current rounded px-0.5">EN</span>
                <span className="flex-1 text-left">English</span>
                {isPending && locale !== 'en' && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </Button>
            <Button
                variant={locale === 'zh-CN' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleSwitch('zh-CN')}
                disabled={isPending}
                className="w-full justify-start gap-2 px-2 font-normal"
            >
                <span className="text-xs font-bold border border-current rounded px-0.5">中</span>
                <span className="flex-1 text-left">简体中文</span>
                {isPending && locale !== 'zh-CN' && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </Button>
        </div>
    );
}
