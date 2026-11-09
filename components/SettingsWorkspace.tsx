'use client';

import { useState, useEffect } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useTranslations } from 'next-intl';
import { useSupabase } from "@/components/providers/supabase-provider";
import { User, Shield, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import { BillingTab } from "@/components/settings/BillingTab";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function SettingsWorkspace({ onNavigate }: { onNavigate?: (sessionId: string) => void }) {
    const t = useTranslations('Settings');
    const { supabase, session } = useSupabase();
    const [activeTab, setActiveTab] = useState<"profile" | "security" | "billing">("profile");

    // Profile State
    const [displayName, setDisplayName] = useState<string>("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");

    // Billing State
    const [billingProfile, setBillingProfile] = useState<Pick<ProfileRow, "credits" | "plan">>({ credits: 0, plan: "free" });

    useEffect(() => {
        loadProfileData();

        // 1. Check URL parameters for initial mount
        const searchParams = new URLSearchParams(window.location.search);
        const tab = searchParams.get('tab');
        if (tab === 'billing' || tab === 'profile' || tab === 'security') {
            setActiveTab(tab as typeof activeTab);
            window.history.replaceState(null, '', window.location.pathname);
        }

        // 2. Listen to custom event for dynamic switching while already mounted
        const handleOpenTab = (e: Event) => {
            const customEvent = e as CustomEvent<"profile" | "security" | "billing">;
            setActiveTab(customEvent.detail);
        };
        window.addEventListener('open-settings-tab', handleOpenTab);

        return () => window.removeEventListener('open-settings-tab', handleOpenTab);
    }, [session, supabase]);

    const loadProfileData = async () => {
        if (!session?.user?.id) return;
        const { data, error } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, credits, plan")
            .eq("id", session.user.id)
            .single();

        if (error) {
            console.error("Error loading profile:", error);
            return;
        }

        // Cast data to any to avoid 'never' type inference issues
        const profileData = data as Pick<ProfileRow, "display_name" | "avatar_url" | "credits" | "plan"> | null;

        const name = profileData?.display_name || session.user.user_metadata?.full_name || "";
        const avatar = profileData?.avatar_url || session.user.user_metadata?.avatar_url || "";

        setDisplayName(name);
        setAvatarUrl(avatar);
        setBillingProfile({ credits: profileData?.credits ?? 0, plan: profileData?.plan || "free" });
    };

    const handleProfileUpdate = (name: string, avatar: string) => {
        setDisplayName(name);
        setAvatarUrl(avatar);
    };

    return (
        <div className="flex flex-col h-full bg-background items-center p-6 md:p-10">
            {/* Header & Navigation */}
            <div className="w-full max-w-4xl flex flex-col items-center gap-6 mb-8">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('managePreferences')}</p>
                </div>

                <div className="flex items-center p-1 bg-muted/60 rounded-full border border-border relative">
                    {(["profile", "security", "billing"] as const).map((tab) => {
                        const isActive = activeTab === tab;
                        const icon = tab === "profile" ? <User size={16} /> : tab === "security" ? <Shield size={16} /> : <Wallet size={16} />;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className="relative flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors z-10 active:scale-95"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="settingsTabActivePill"
                                        transition={{ type: "spring", stiffness: 480, damping: 35 }}
                                        className="absolute inset-0 bg-background rounded-full shadow-sm ring-1 ring-border"
                                    />
                                )}
                                <span className={`relative z-20 flex items-center gap-2 transition-colors ${
                                    isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                }`}>
                                    {icon} {t(tab)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="w-full max-w-3xl flex-1 overflow-y-auto pb-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                    >
                        {activeTab === "profile" && (
                            <ProfileTab
                                initialName={displayName}
                                initialAvatar={avatarUrl}
                                onUpdate={handleProfileUpdate}
                            />
                        )}

                        {activeTab === "security" && (
                            <SecurityTab />
                        )}

                        {activeTab === "billing" && (
                            <BillingTab
                                billingProfile={billingProfile}
                                onNavigate={onNavigate}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
