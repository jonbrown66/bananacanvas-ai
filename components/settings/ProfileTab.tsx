import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera } from "lucide-react";
import type { Database } from "@/lib/types";
import { useTranslations } from "next-intl";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

interface ProfileTabProps {
    initialName: string;
    initialAvatar: string;
    onUpdate?: (name: string, avatar: string) => void;
}

export function ProfileTab({ initialName, initialAvatar, onUpdate }: ProfileTabProps) {
    const t = useTranslations('Settings.Profile');
    const { supabase, session } = useSupabase();
    const [displayName, setDisplayName] = useState(initialName);
    const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setDisplayName(initialName);
        setAvatarUrl(initialAvatar);
        setAvatarPreview(initialAvatar);
    }, [initialName, initialAvatar]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const uploadAvatar = async () => {
        if (!avatarFile || !session?.user?.id) return avatarUrl;
        const ext = avatarFile.name.split(".").pop();
        const filePath = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from("public-avatars")
            .upload(filePath, avatarFile, { cacheControl: "3600", upsert: true, contentType: avatarFile.type });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("public-avatars").getPublicUrl(filePath);
        return publicData.publicUrl;
    };

    const handleSaveProfile = async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            let finalAvatar = avatarUrl;
            if (avatarFile) {
                finalAvatar = await uploadAvatar();
                setAvatarUrl(finalAvatar);
            }

            const updates: ProfileInsert = {
                id: session.user.id,
                display_name: displayName,
                avatar_url: finalAvatar
            };

            const { error: dbError } = await supabase
                .from("profiles")
                // Cast to any because of Supabase type inference issue
                .upsert(updates as any);
            if (dbError) throw dbError;

            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: displayName, avatar_url: finalAvatar }
            });
            if (authError) throw authError;

            setMessage(t('profileUpdated'));
            setAvatarFile(null);
            onUpdate?.(displayName, finalAvatar);
        } catch (e: any) {
            setError(e.message || t('failedToUpdate'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-2xl border border-border bg-card p-8 space-y-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                    <div className="relative group">
                        <Avatar className="h-24 w-24 border border-background shadow-sm">
                            <AvatarImage src={avatarPreview || avatarUrl} className="object-cover" />
                            <AvatarFallback className="text-sm">{(displayName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="space-y-2 flex-1">
                        <h3 className="text-lg font-medium">{t('publicProfile')}</h3>
                        <p className="text-sm text-muted-foreground">{t('publicProfileDesc')}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                {t('uploadNewAvatar')}
                            </Button>
                            {avatarFile && <span className="text-xs text-muted-foreground">{avatarFile.name}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 max-w-xl">
                    <div className="space-y-2">
                        <Label>{t('displayName')}</Label>
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('displayNamePlaceholder')} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('email')}</Label>
                        <Input value={session?.user?.email || ""} disabled className="bg-muted/50" />
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-border">
                    <Button onClick={handleSaveProfile} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('saveChanges')}
                    </Button>
                    {message && <span className="text-sm text-emerald-600 font-medium">{message}</span>}
                    {error && <span className="text-sm text-red-600 font-medium">{error}</span>}
                </div>
            </div>
        </div>
    );
}
