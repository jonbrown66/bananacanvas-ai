'use client';

import React, { useState, useEffect, memo } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from 'next-intl';
import Image from "next/image";
import { LogOut, User, Globe, Check, Monitor, Sun, Moon, X } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icons } from "./Icons";
import { Session, ViewMode, UserProfile } from "../types";
import { markRouteStart } from "@/lib/perf/client-metrics";

interface SidebarProps {
  isOpen: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onNewSession: () => void | Promise<void>;
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void | Promise<void>;
  userProfile: UserProfile;
  onLogout?: () => void | Promise<void>;
  logoutLoading?: boolean;
  onToggle?: () => void;
  onPrefetchSession?: (id: string) => void;
}

export const Sidebar = memo(({
  isOpen,
  viewMode,
  setViewMode,
  onNewSession,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  userProfile,
  onLogout,
  logoutLoading,
  onToggle,
  onPrefetchSession
}: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Workspace');
  const locale = useLocale();
  const { setTheme, theme } = useTheme();

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const goLanding = () => {
    markRouteStart('/');
    router.push('/');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!confirmingId) return;

      const target = event.target as HTMLElement;
      if (!target.closest('.delete-confirmation-group')) {
        setConfirmingId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [confirmingId]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmingId(id);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const dateLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';

    if (isToday) {
      return new Intl.DateTimeFormat(dateLocale, {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    return new Intl.DateTimeFormat(dateLocale, {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (!isOpen) {
    return (
      <div className="w-14 h-[100dvh] bg-muted/30 border-r border-border flex flex-col items-center py-4 gap-3 shadow-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={onToggle}
            >
              <Icons.SidebarOpen size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {t('expandSidebar') || 'Expand Sidebar'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-9 w-9 flex items-center justify-center p-1"
              onClick={goLanding}
            >
              <Image src="/logo.png" alt="BananaCanvas" width={32} height={32} className="w-full h-full object-contain" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {t('backToLanding')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm transition-colors ${viewMode === 'chat' ? 'bg-card text-foreground shadow' : 'bg-transparent text-muted-foreground hover:bg-card'}`}
              onClick={() => setViewMode('chat')}
            >
              <Icons.Chat size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {t('chat')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm transition-colors ${viewMode === 'canvas' ? 'bg-card text-foreground shadow' : 'bg-transparent text-muted-foreground hover:bg-card'}`}
              onClick={() => setViewMode('canvas')}
            >
              <Icons.Canvas size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {t('canvas')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onNewSession}
              className="h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 flex items-center justify-center transition-colors"
            >
              <Icons.New size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {t('newProject')}
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setViewMode('settings')}
              className={`h-9 w-9 rounded-full bg-muted overflow-hidden border border-border hover:ring-2 hover:ring-primary/20 transition-all ${viewMode === 'settings' ? 'ring-2 ring-primary' : ''}`}
            >
              {userProfile.avatarUrl ? (
                <Image src={userProfile.avatarUrl} alt="User" width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <User size={16} />
                </div>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {t('settings')}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="w-64 h-[100dvh] bg-muted/30 border-r border-border flex flex-col flex-shrink-0 transition-all duration-300">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center gap-2 text-left flex-1"
              onClick={goLanding}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <Image src="/logo.png" alt="Logo" width={32} height={32} className="w-full h-full object-contain" />
              </div>
              <span className="font-semibold text-xl text-foreground tracking-tight">BananaCanvas</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t('backToLanding')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Icons.SidebarClose size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t('collapseSidebar') || 'Collapse Sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="px-3.5 py-3">
        <div className="h-9 bg-muted/70 p-0.5 rounded-lg flex relative border border-border/40">
          {(['chat', 'canvas'] as const).map((mode) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="relative flex-1 h-full flex items-center justify-center gap-2 rounded-[6px] text-xs font-semibold transition-colors z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarTabActivePill"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    className="absolute inset-0 bg-background dark:bg-card rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.1)]"
                  />
                )}
                <span className={`relative z-20 flex items-center justify-center gap-1.5 transition-colors duration-150 ${
                  isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}>
                  {mode === 'chat' ? <Icons.Chat size={14} className="shrink-0" /> : <Icons.Canvas size={14} className="shrink-0" />}
                  <span>{t(mode)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3.5 mb-2">
        <button
          onClick={onNewSession}
          className="w-full h-9 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 rounded-lg transition-all active:scale-[0.98] shadow-sm group"
        >
          <Icons.New size={15} className="group-hover:scale-110 transition-transform duration-200 shrink-0" />
          <span className="font-semibold text-xs tracking-wide">{t('new')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        <div className="px-2 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('recent')}</div>
        {sessions.map((session) => (
          <div
            key={session.id}
            onMouseEnter={() => onPrefetchSession?.(session.id)}
            onClick={() => {
              onSelectSession(session.id);
              if (viewMode === 'settings') {
                setViewMode('chat');
              }
            }}
            className={`group w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer relative ${session.id === currentSessionId && viewMode !== 'settings' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
          >
            <span
              className="flex-1 block truncate"
              style={{
                maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)'
              }}
            >
              {session.title}
            </span>
            <span suppressHydrationWarning className="text-[10px] text-muted-foreground group-hover:hidden whitespace-nowrap">{formatDate(session.lastModified)}</span>

            <div className="absolute right-2 flex items-center gap-1">
              <AnimatePresence mode="wait" initial={false}>
                {confirmingId === session.id ? (
                  <motion.div
                    key="confirming"
                    initial={{ opacity: 0, scale: 0.85, x: 8 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.85, x: 8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex items-center gap-1 delete-confirmation-group"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                        setConfirmingId(null);
                      }}
                      className="h-6 w-6 flex items-center justify-center rounded-md bg-red-500 text-white shadow-sm hover:bg-red-600 active:scale-90 transition"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingId(null);
                      }}
                      className="h-6 w-6 flex items-center justify-center rounded-md bg-muted text-foreground shadow-sm hover:bg-muted/80 active:scale-90 transition"
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                ) : (
                  <Tooltip key="trash-tooltip">
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleDeleteClick(e, session.id)}
                        className="hidden group-hover:flex h-6 w-6 items-center justify-center rounded-md bg-card/90 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-sm active:scale-90 transition"
                      >
                        <Icons.Trash size={12} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {t('delete')}
                    </TooltipContent>
                  </Tooltip>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3.5 border-t border-border bg-muted/10 space-y-2.5">
        <button
          onClick={() => {
            const newUrl = `${window.location.pathname}?tab=billing`;
            window.history.replaceState(null, '', newUrl);
            setViewMode('settings');
            window.dispatchEvent(new CustomEvent('open-settings-tab', { detail: 'billing' }));
          }}
          className="w-full bg-card border border-border/80 rounded-xl p-3 shadow-sm hover:border-primary/40 active:scale-[0.98] transition-all text-left outline-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Icons.Billing size={15} className="shrink-0" /> {t('credits')}
            </span>
            <span className="text-sm font-bold text-foreground font-mono">{userProfile.credits} {t('pts')}</span>
          </div>
        </button>

        <div className="pt-0.5 relative">
          <div className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-colors ${viewMode === 'settings' ? 'bg-muted/50' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden relative shrink-0">
              {userProfile.avatarUrl ? (
                <Image src={userProfile.avatarUrl} alt="User" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={16} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">{userProfile.name}</p>
              <p className="text-xs text-muted-foreground truncate">{t('accountSecurity')}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('settings')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Icons.Settings size={15} className="shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={12}
                className="w-48 bg-popover/95 backdrop-blur-md shadow-lg"
              >
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="py-2 cursor-default">
                    <span className="flex items-center gap-2">
                      <Icons.Settings size={16} className="text-muted-foreground" />
                      {t('appearance')}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent
                      sideOffset={8}
                      className="bg-popover/95 backdrop-blur-md shadow-lg min-w-[140px]"
                    >
                      <DropdownMenuItem onClick={() => setTheme('light')} className="py-2 cursor-pointer">
                        <span className="flex items-center gap-2 flex-1">
                          <Sun size={14} className="text-muted-foreground" />
                          <span>Light</span>
                        </span>
                        {theme === 'light' && <Check size={14} className="ml-2 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')} className="py-2 cursor-pointer">
                        <span className="flex items-center gap-2 flex-1">
                          <Moon size={14} className="text-muted-foreground" />
                          <span>Dark</span>
                        </span>
                        {theme === 'dark' && <Check size={14} className="ml-2 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')} className="py-2 cursor-pointer">
                        <span className="flex items-center gap-2 flex-1">
                          <Monitor size={14} className="text-muted-foreground" />
                          <span>System</span>
                        </span>
                        {theme === 'system' && <Check size={14} className="ml-2 text-primary" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="py-2 cursor-default">
                    <span className="flex items-center gap-2">
                      <Globe size={16} className="text-muted-foreground" />
                      {t('language')}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent
                      sideOffset={8}
                      className="bg-popover/95 backdrop-blur-md shadow-lg min-w-[140px]"
                    >
                      <DropdownMenuItem
                        onClick={() => router.replace(pathname, { locale: 'en' })}
                        className="py-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 flex-1">
                          <span className="text-[10px] font-bold border border-current rounded px-0.5 text-muted-foreground">EN</span>
                          <span>English</span>
                        </span>
                        {locale === 'en' && <Check size={14} className="ml-2 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.replace(pathname, { locale: 'zh-CN' })}
                        className="py-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 flex-1">
                          <span className="text-[10px] font-bold border border-current rounded px-0.5 text-muted-foreground">中</span>
                          <span>简体中文</span>
                        </span>
                        {locale === 'zh-CN' && <Check size={14} className="ml-2 text-primary" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator className="my-1.5 bg-border/60" />

                <DropdownMenuItem
                  className="py-2 cursor-pointer font-medium"
                  onClick={() => setViewMode('settings')}
                >
                  <Icons.Settings size={16} className="text-muted-foreground" />
                  <span className="ml-2">{t('settings')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5 bg-border/60" />

                <DropdownMenuItem
                  className="py-2 cursor-pointer focus:bg-destructive/10 text-destructive focus:text-destructive font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => onLogout?.()}
                  disabled={logoutLoading}
                >
                  <LogOut size={16} />
                  <span className="ml-2">{logoutLoading ? t('signingOut') : t('signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
});
