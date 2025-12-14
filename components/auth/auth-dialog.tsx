'use client';

import { useTranslations } from 'next-intl';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Github, Loader2, Mail, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabase } from "@/components/providers/supabase-provider";

type AuthMode = "login" | "signup";

interface AuthDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTab?: AuthMode;
  trigger?: React.ReactNode;
}

export function AuthDialog({ open, onOpenChange, defaultTab = "login", trigger }: AuthDialogProps) {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const t = useTranslations('Auth');

  const [mode, setMode] = useState<AuthMode>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isControlled = useMemo(() => typeof open === "boolean", [open]);
  const dialogOpen = isControlled ? (open as boolean) : undefined;

  useEffect(() => {
    if (session && onOpenChange) {
      onOpenChange(false);
    }
  }, [session, onOpenChange]);

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
        if (onOpenChange) onOpenChange(false);
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

  const triggerNode = trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null;

  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
      {triggerNode}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-amber-500" />
            {t('signInSecurely')}
          </DialogTitle>
          <DialogDescription>{t('signInDesc')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} value={mode} onValueChange={(v) => setMode(v as AuthMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="login">{t('logIn')}</TabsTrigger>
            <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="login-email" requiredMark>
                  {t('emailLabel')}
                </Label>
                <Input id="login-email" type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" requiredMark>
                  {t('passwordLabel')}
                </Label>
                <Input id="login-password" type="password" placeholder={t('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleEmailAuth} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('loginButton')}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="signup">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="signup-email" requiredMark>
                  {t('emailLabel')}
                </Label>
                <Input id="signup-email" type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" requiredMark>
                  {t('passwordLabel')}
                </Label>
                <Input id="signup-password" type="password" placeholder={t('passwordSignupPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm" requiredMark>
                  {t('confirmPassword')}
                </Label>
                <Input id="signup-confirm" type="password" placeholder={t('confirmPlaceholder')} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleEmailAuth} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('signUpButton')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 pt-3">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="h-px flex-1 bg-slate-200" />
            {t('orQuickSignIn')}
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => handleOAuth("google")} disabled={loading}>
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
            <Button variant="outline" onClick={() => handleOAuth("github")} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
              {t('githubButton')}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Mail className="h-4 w-4" />
            {message}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
