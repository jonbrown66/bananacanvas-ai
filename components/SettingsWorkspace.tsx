'use client';

import { useState, useEffect } from "react";
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

                <div className="flex items-center p-1 bg-muted/50 rounded-full border border-border">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all",
                            activeTab === "profile"
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <User size={16} /> {t('profile')}
                    </button>
                    <button
                        onClick={() => setActiveTab("security")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all",
                            activeTab === "security"
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <Shield size={16} /> {t('security')}
                    </button>
                    <button
                        onClick={() => setActiveTab("billing")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all",
                            activeTab === "billing"
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <Wallet size={16} /> {t('billing')}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="w-full max-w-3xl flex-1 overflow-y-auto pb-10">
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
            </div>
        </div>
    );
}
