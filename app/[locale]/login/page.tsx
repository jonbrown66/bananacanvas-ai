'use client';

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { AlertCircle, Github, Loader2, Mail, Shield, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Link } from "@/i18n/routing";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type AuthMode = "login" | "signup";

export default function LoginPage() {
    const { supabase, session } = useSupabase();
    const router = useRouter();
    const t = useTranslations('Auth');

    const [mode, setMode] = useState<AuthMode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (session) {
            router.push("/app");
        }
    }, [session, router]);

    const handleEmailAuth = async () => {
        setError(null);
        setMessage(null);

        if (mode === "signup" && password !== confirm) {
            setError(t('passwordsDoNotMatch'));
            return;
        }

        setLoading(true);
        const redirectTo = `${window.location.origin}/auth/callback?next=/app`;

        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                setMessage(t('loginSuccess'));
                router.push("/app");
                router.refresh();
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: redirectTo }
                });
                if (error) throw error;
                setMessage(t('signUpSuccess'));
            }
        } catch (err: any) {
            setError(err.message || t('operationFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: "google" | "github") => {
        setError(null);
        setMessage(null);
        setLoading(true);
        const redirectTo = `${window.location.origin}/auth/callback?next=/app`;
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo }
            });
            if (error) throw error;
        } catch (err: any) {
            setLoading(false);
            setError(err.message || t('loginFailed'));
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
            <div className="absolute top-8 right-8">
                <LanguageSwitcher />
            </div>
            <Link href="/" className="absolute top-8 left-8 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={16} /> {t('backToHome')}
            </Link>

            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-serif font-medium text-foreground">{t('welcomeTitle')}</h1>
                    <p className="text-muted-foreground mt-2">{t('welcomeSubtitle')}</p>
                </div>

                <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-8">
                    <Tabs defaultValue="login" value={mode} onValueChange={(v) => setMode(v as AuthMode)}>
                        <TabsList className="w-full mb-6">
                            <TabsTrigger value="login" className="flex-1">{t('logIn')}</TabsTrigger>
                            <TabsTrigger value="signup" className="flex-1">{t('signUp')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="login">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-email">{t('emailLabel')}</Label>
                                    <Input id="login-email" type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">{t('passwordLabel')}</Label>
                                    <Input id="login-password" type="password" placeholder={t('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                <Button className="w-full" onClick={handleEmailAuth} disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t('loginButton')}
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="signup">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">{t('emailLabel')}</Label>
                                    <Input id="signup-email" type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">{t('passwordLabel')}</Label>
                                    <Input id="signup-password" type="password" placeholder={t('passwordSignupPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-confirm">{t('confirmPassword')}</Label>
                                    <Input id="signup-confirm" type="password" placeholder={t('confirmPlaceholder')} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                                </div>
                                <Button className="w-full" onClick={handleEmailAuth} disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t('signUpButton')}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="space-y-3 pt-6">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="h-px flex-1 bg-border" />
                            {t('orContinueWith')}
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={() => handleOAuth("google")} disabled={loading} className="border-border text-foreground hover:bg-muted">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                )}
                                {t('googleButton')}
                            </Button>
                            <Button variant="outline" onClick={() => handleOAuth("github")} disabled={loading} className="border-border text-foreground hover:bg-muted">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                                {t('githubButton')}
                            </Button>
                        </div>
                    </div>

                    {error ? (
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    ) : null}
                    {message ? (
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
                            <Mail className="h-4 w-4" />
                            {message}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
