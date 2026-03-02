'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
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

    const handleSwitch = (newLocale: string) => {
        // 使用原生 location 来替换第一段语言前缀，能够有效避免 next-intl 未显式声明的动态参数报错
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(/^\/(en|zh-CN)/, `/${newLocale}`);

        // 拼接上现有的 query 参数并进行跳转
        const currentSearch = window.location.search;
        window.location.href = `${newPath}${currentSearch}`;
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Languages className="h-5 w-5" />
                    <span className="sr-only">Switch Language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSwitch('en')} disabled={locale === 'en'}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSwitch('zh-CN')} disabled={locale === 'zh-CN'}>
                    简体中文
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
