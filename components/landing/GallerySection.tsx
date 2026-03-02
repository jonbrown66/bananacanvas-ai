'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export const GallerySection = () => {
    const t = useTranslations('LandingPage.Gallery');

    // 扩展后的精选高级质感配图 (Abstract, Minimal Architecture, Premium Aesthetic)
    // 确保有充足的数量使得即使在大尺寸屏幕上也不会出现跑马灯留白断层
    const images = [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80", // Abstract fluid 1
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80", // Clean architecture 1
        "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80", // Minimalist architecture 2
        "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&w=800&q=80", // Abstract gradient / 3D
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80", // Clean workspace 1
        "https://images.unsplash.com/photo-1490122417551-6ee9691429d0?auto=format&fit=crop&w=800&q=80", // Minimal art
        "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=800&q=80", // Minimal interior 1
        "https://images.unsplash.com/photo-1581428982868-e410dd047a90?auto=format&fit=crop&w=800&q=80", // Architecture lines
        "https://images.unsplash.com/photo-1621619856624-42fd193a0661?auto=format&fit=crop&w=800&q=80", // Abstract fluid 2
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80", // Clean workspace 2
        "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80", // Modern minimal
        "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=800&q=80"  // Deep minimal dark
    ];

    return (
        <section className="py-24 px-6 bg-background">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl text-foreground mb-4">{t('title')}</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
                </div>

                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6 py-8 hover:[&>div]:opacity-40 transition-opacity duration-500">
                    {images.map((src, i) => {
                        // Pinterest 风格的错落高度分布
                        const heights = [
                            'h-64', 'h-96', 'h-72', 'h-[28rem]',
                            'h-80', 'h-64', 'h-96', 'h-[30rem]',
                            'h-72', 'h-80', 'h-[26rem]', 'h-64'
                        ];
                        const heightClass = heights[i % heights.length];

                        return (
                            <div
                                key={`masonry-${i}`}
                                className={`relative w-full ${heightClass} mb-4 md:mb-6 break-inside-avoid overflow-hidden rounded-[1.5rem] md:rounded-[2rem] group transition-all duration-700 hover:!opacity-100 hover:scale-[1.03] hover:shadow-2xl hover:z-20 cursor-pointer bg-muted`}
                            >
                                <Image
                                    src={src}
                                    alt={`Gallery Image ${i + 1}`}
                                    fill
                                    className="object-cover transition-transform duration-1500 ease-out group-hover:scale-110"
                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-700 pointer-events-none" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
