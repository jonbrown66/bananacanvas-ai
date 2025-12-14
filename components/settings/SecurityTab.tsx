import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

export function SecurityTab() {
    const t = useTranslations('Settings.Security');
    const { supabase } = useSupabase();
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleChangePassword = async () => {
        if (password.length < 6) {
            setError(t('passwordTooShort'));
            return;
        }
        if (password !== confirm) {
            setError(t('passwordMismatch'));
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setMessage(t('passwordUpdated'));
            setPassword("");
            setConfirm("");
        } catch (e: any) {
            setError(e.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            const res = await fetch("/api/auth/delete", { method: "POST" });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Delete failed");
            }
            await supabase.auth.signOut();
            router.push("/?login=1");
        } catch (e: any) {
            setDeleteError(e.message || "Delete failed");
            setShowDeleteDialog(false);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-sm">
                <div>
                    <h3 className="text-lg font-medium">{t('password')}</h3>
                    <p className="text-sm text-muted-foreground">{t('passwordDesc')}</p>
                </div>

                <div className="grid gap-4 max-w-xl">
                    <div className="space-y-2">
                        <Label>{t('newPassword')}</Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('newPasswordPlaceholder')} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('confirmPassword')}</Label>
                        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t('confirmPasswordPlaceholder')} />
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <Button onClick={handleChangePassword} disabled={loading}>
                        {loading ? t('updating') : t('updatePassword')}
                    </Button>
                    {message && <span className="text-sm text-emerald-600 font-medium">{message}</span>}
                    {error && <span className="text-sm text-red-600 font-medium">{error}</span>}
                </div>
            </div>

            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 space-y-4">
                <div className="flex items-center gap-3 text-destructive">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-medium">{t('dangerZone')}</h3>
                </div>
                <p className="text-sm text-destructive/80 max-w-xl">
                    {t('deleteAccountDesc')}
                </p>
                <Button variant="destructive" className="bg-destructive hover:bg-destructive/90" onClick={() => setShowDeleteDialog(true)}>
                    {t('deleteAccount')}
                </Button>
                {deleteError && <p className="text-sm text-destructive font-medium">{deleteError}</p>}
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteAccountConfirmTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteAccountConfirmDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
                            {t('cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                            {deleting ? t('deleting') : t('deleteAccount')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
