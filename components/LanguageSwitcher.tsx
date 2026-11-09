'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative" disabled={isPending}>
                    {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                        <Languages className="h-5 w-5" />
                    )}
                    <span className="sr-only">Switch Language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSwitch('en')} disabled={locale === 'en' || isPending}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSwitch('zh-CN')} disabled={locale === 'zh-CN' || isPending}>
                    简体中文
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
