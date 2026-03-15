'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from "@/components/providers/supabase-provider";
import type { Database } from "@/lib/types";

import dynamic from 'next/dynamic';
import { Notification } from "@/components/ui/notification";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";

// Lazy load below-the-fold components
const FeaturesSection = dynamic(() => import("@/components/landing/FeaturesSection").then(mod => mod.FeaturesSection));
const GallerySection = dynamic(() => import("@/components/landing/GallerySection").then(mod => mod.GallerySection));
const PricingSection = dynamic(() => import("@/components/landing/PricingSection").then(mod => mod.PricingSection));
const FAQSection = dynamic(() => import("@/components/landing/FAQSection").then(mod => mod.FAQSection));
const Footer = dynamic(() => import("@/components/landing/Footer").then(mod => mod.Footer));

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const LandingPage = () => {
    const { supabase, session } = useSupabase();
    const [plan, setPlan] = useState<string>('free');
    const [notification, setNotification] = useState<{ message: string, show: boolean }>({ message: '', show: false });

    useEffect(() => {
        const loadProfile = async () => {
            if (!session?.user?.id) return;
            const { data } = await supabase
                .from("profiles")
                .select("plan")
                .eq("id", session.user.id)
                .single();
            if (data) {
                setPlan((data as Pick<ProfileRow, "plan">).plan || 'free');
            }
        };
        loadProfile();
    }, [session, supabase]);

    const showNotification = (message: string) => {
        setNotification({ message, show: true });
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-DEFAULT/30 selection:text-brand-light">
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <GallerySection />
            <PricingSection plan={plan} notify={showNotification} />
            <FAQSection />
            <Footer />

            <Notification
                message={notification.message}
                isVisible={notification.show}
                onClose={() => setNotification(prev => ({ ...prev, show: false }))}
            />
        </div>
    );
};
