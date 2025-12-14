'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function SidebarLanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const handleSwitch = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <div className="flex flex-col gap-1">
            <Button
                variant={locale === 'en' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSwitch('en')}
                className="w-full justify-start gap-2 px-2 font-normal"
            >
                <span className="text-xs font-bold border border-current rounded px-0.5">EN</span>
                English
            </Button>
            <Button
                variant={locale === 'zh-CN' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSwitch('zh-CN')}
                className="w-full justify-start gap-2 px-2 font-normal"
            >
                <span className="text-xs font-bold border border-current rounded px-0.5">中</span>
                简体中文
            </Button>
        </div>
    );
}
