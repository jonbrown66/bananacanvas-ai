import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export const GallerySection = () => {
    const t = useTranslations('LandingPage.Gallery');
    return (
        <section className="py-24 px-6 bg-muted border-y border-border">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">{t('title')}</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
                </div>

                <div className="columns-1 md:columns-3 gap-6 space-y-6">
                    {[
                        "https://images.unsplash.com/photo-1566438480900-0609be27a4be?auto=format&fit=crop&w=800&q=80",
                        "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
                        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
                        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80",
                        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
                        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
                        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
                        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80"
                    ].map((src, i) => (
                        <div key={i} className="relative group overflow-hidden rounded-2xl break-inside-avoid">
                            <Image
                                src={src}
                                alt={`Gallery ${i}`}
                                width={800}
                                height={600}
                                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
