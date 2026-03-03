'use client';

import React, { useState, useRef, useEffect, memo } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from 'next-intl';
import Image from "next/image";
import { LogOut, User, Globe, Check, Monitor, Sun, Moon } from "lucide-react";
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



// ... (imports)

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
  const t = useTranslations('Workspace');
  const locale = useLocale();
  const { setTheme, theme } = useTheme();

  // Load language mapping
  const languageOptions = [
    { code: 'en', label: 'English', icon: 'EN' },
    { code: 'zh-CN', label: '简体中文', icon: '中' }
  ];

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle Delete Confirmation
      if (confirmingId) {
        const target = event.target as HTMLElement;
        if (!target.closest(".delete-confirmation-group")) {
          setConfirmingId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [confirmingId]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmingId(id);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!isOpen) {
    return (
      <div className="w-14 h-screen bg-muted/30 border-r border-border flex flex-col items-center py-4 gap-3 shadow-sm pt-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mb-2"
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
              onClick={() => router.push("/")}
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
              className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm ${viewMode === "chat" ? "bg-card text-foreground shadow" : "bg-transparent text-muted-foreground hover:bg-card"}`}
              onClick={() => setViewMode("chat")}
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
              className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm ${viewMode === "canvas" ? "bg-card text-foreground shadow" : "bg-transparent text-muted-foreground hover:bg-card"}`}
              onClick={() => setViewMode("canvas")}
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
              className="h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 flex items-center justify-center"
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
              onClick={() => setViewMode("settings")}
              className={`h-9 w-9 rounded-full bg-muted overflow-hidden border border-border hover:ring-2 hover:ring-primary/20 transition-all ${viewMode === "settings" ? "ring-2 ring-primary" : ""}`}
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
    <div className="w-64 h-screen bg-muted/30 border-r border-border flex flex-col flex-shrink-0 transition-all duration-300">
      {/* 1. Logo & Project Name & Toggle */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center gap-2 text-left flex-1"
              onClick={() => router.push("/")}
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

      {/* 2. Chat/Canvas Toggle */}
      <div className="px-4 py-4">
        <div className="bg-muted p-1 rounded-lg flex">
          <button
            onClick={() => setViewMode("chat")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "chat" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Icons.Chat size={16} />
            {t('chat')}
          </button>
          <button
            onClick={() => setViewMode("canvas")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "canvas" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Icons.Canvas size={16} />
            {t('canvas')}
          </button>
        </div>
      </div>

      {/* 4. New Project Button */}
      <div className="px-4 mb-2">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg transition-colors shadow-sm group"
        >
          <Icons.New size={18} className="group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">{t('new')}</span>
        </button>
      </div>

      {/* 5. Recent History */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('recent')}</div>
        {sessions.map((session) => (
          <div
            key={session.id}
            onMouseEnter={() => onPrefetchSession?.(session.id)}
            onClick={() => {
              onSelectSession(session.id);
              if (viewMode === "settings") {
                setViewMode("chat");
              }
            }}
            className={`group w-full text-left px-3 py-3 rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer relative ${session.id === currentSessionId && viewMode !== "settings" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"
              }`}
          >
            <span
              className="flex-1 block truncate"
              style={{
                maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)"
              }}
            >
              {session.title}
            </span>
            <span className="text-xs text-muted-foreground group-hover:hidden whitespace-nowrap">{formatDate(session.lastModified)}</span>

            <div className="absolute right-2 flex items-center gap-1">
              {confirmingId === session.id ? (
                <div className="flex items-center gap-1 delete-confirmation-group">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                      setConfirmingId(null);
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition"
                  >
                    ✓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingId(null);
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow-sm hover:bg-gray-300 transition"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => handleDeleteClick(e, session.id)}
                      className="hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full bg-card/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-sm transition"
                    >
                      <Icons.Trash size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t('delete')}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Billing & User Info */}
      <div className="p-4 border-t border-border bg-muted/10 space-y-3">
        <button
          onClick={() => {
            const newUrl = window.location.pathname + '?tab=billing';
            window.history.replaceState(null, '', newUrl);
            setViewMode("settings");
            window.dispatchEvent(new CustomEvent('open-settings-tab', { detail: 'billing' }));
          }}
          className="w-full bg-card border border-border rounded-xl p-4 shadow-sm hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-all text-left outline-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Icons.Billing size={16} /> {t('credits')}
            </span>
            <span className="text-base font-bold text-foreground">{userProfile.credits} {t('pts')}</span>
          </div>
        </button>

        <div className="pt-1 relative">
          <div
            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${viewMode === "settings" ? "bg-muted/50" : ""}`}
          >
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
                <button className="p-1.5 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  <Icons.Settings size={16} className={`transition-transform`} />
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
                      <DropdownMenuItem onClick={() => setTheme("light")} className="py-2 cursor-pointer">
                        <span className="flex items-center gap-2 flex-1">
                          <Sun size={14} className="text-muted-foreground" />
                          <span>Light</span>
                        </span>
                        {theme === "light" && <Check size={14} className="ml-2 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")} className="py-2 cursor-pointer">
                        <span className="flex items-center gap-2 flex-1">
                          <Moon size={14} className="text-muted-foreground" />
                          <span>Dark</span>
                        </span>
                        {theme === "dark" && <Check size={14} className="ml-2 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("system")} className="py-2 cursor-pointer">
                        <span className="flex items-center gap-2 flex-1">
                          <Monitor size={14} className="text-muted-foreground" />
                          <span>System</span>
                        </span>
                        {theme === "system" && <Check size={14} className="ml-2 text-primary" />}
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
                      <DropdownMenuItem onClick={() => {
                        const currentPath = window.location.pathname;
                        const newPath = currentPath.replace(/^\/(en|zh-CN)/, '/en');
                        window.location.href = `${newPath}${window.location.search}`;
                      }} className="py-2 cursor-pointer">
                        <span className="flex items-center gap-2 flex-1">
                          <span className="text-[10px] font-bold border border-current rounded px-0.5 text-muted-foreground">EN</span>
                          <span>English</span>
                        </span>
                        {locale === 'en' && <Check size={14} className="ml-2 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const currentPath = window.location.pathname;
                        const newPath = currentPath.replace(/^\/(en|zh-CN)/, '/zh-CN');
                        window.location.href = `${newPath}${window.location.search}`;
                      }} className="py-2 cursor-pointer">
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
                  onClick={() => setViewMode("settings")}
                >
                  <Icons.Settings size={16} className="text-muted-foreground" />
                  <span className="ml-2">{t('settings')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5 bg-border/60" />

                <DropdownMenuItem
                  className="py-2 cursor-pointer focus:bg-destructive/10 text-destructive focus:text-destructive font-medium"
                  onClick={() => onLogout?.()}
                >
                  <LogOut size={16} />
                  <span className="ml-2">{t('signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
});
