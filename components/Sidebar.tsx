'use client';

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { LogOut, Shield, User, Wallet } from "lucide-react";
import { Icons } from "./Icons";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { SidebarLanguageSwitcher } from "@/components/SidebarLanguageSwitcher";
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
}



// ... (imports)

export const Sidebar: React.FC<SidebarProps> = ({
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
  onToggle
}) => {
  const router = useRouter();
  const t = useTranslations('Workspace');
  const [settingsOpen, setSettingsOpen] = useState(false); // Controls the small popup menu

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const settingsPopupRef = useRef<HTMLDivElement>(null);
  const settingsToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle Settings Popup
      if (
        settingsOpen &&
        settingsPopupRef.current &&
        !settingsPopupRef.current.contains(event.target as Node) &&
        settingsToggleRef.current &&
        !settingsToggleRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
      }

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
  }, [settingsOpen, confirmingId]);

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
      <div className="w-14 h-screen bg-muted/30 border-r border-border flex flex-col items-center py-4 gap-3 shadow-sm">
        <button
          className="h-9 w-9 flex items-center justify-center"
          onClick={() => router.push("/")}
          title={t('backToLanding')}
        >
          <Image src="/logo.png" alt="BananaCanvas" width={36} height={36} className="w-full h-full object-contain" />
        </button>
        <button
          className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm ${viewMode === "chat" ? "bg-card text-foreground shadow" : "bg-transparent text-muted-foreground hover:bg-card"}`}
          onClick={() => setViewMode("chat")}
          title={t('chat')}
        >
          <Icons.Chat size={16} />
        </button>
        <button
          className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm ${viewMode === "canvas" ? "bg-card text-foreground shadow" : "bg-transparent text-muted-foreground hover:bg-card"}`}
          onClick={() => setViewMode("canvas")}
          title={t('canvas')}
        >
          <Icons.Canvas size={16} />
        </button>
        <button
          onClick={onNewSession}
          className="h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 flex items-center justify-center"
          title={t('newProject')}
        >
          <Icons.New size={16} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setViewMode("settings")}
          className={`h-9 w-9 rounded-full bg-muted overflow-hidden border border-border hover:ring-2 hover:ring-primary/20 transition-all ${viewMode === "settings" ? "ring-2 ring-primary" : ""}`}
          title={t('settings')}
        >
          {userProfile.avatarUrl ? (
            <Image src={userProfile.avatarUrl} alt="User" width={36} height={36} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <User size={16} />
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 h-screen bg-muted/30 border-r border-border flex flex-col flex-shrink-0 transition-all duration-300">
      {/* 1. Logo & Project Name */}
      <button
        className="p-4 flex items-center gap-2 border-b border-border text-left"
        onClick={() => router.push("/")}
        title={t('backToLanding')}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <Image src="/logo.png" alt="Logo" width={32} height={32} className="w-full h-full object-contain" />
        </div>
        <span className="font-serif font-semibold text-xl text-foreground tracking-tight">BananaCanvas</span>
      </button>

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
            onClick={() => {
              onSelectSession(session.id);
              setViewMode("chat");
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
                <button
                  onClick={(e) => handleDeleteClick(e, session.id)}
                  className="hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full bg-card/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-sm transition"
                  title={t('delete')}
                >
                  <Icons.Trash size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Billing & User Info */}
      <div className="p-4 border-t border-border bg-muted/10 space-y-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Icons.Billing size={16} /> {t('credits')}
            </span>
            <span className="text-base font-bold text-foreground">{userProfile.credits} {t('pts')}</span>
          </div>
        </div>

        <div className="pt-1 relative">
          <button
            ref={settingsToggleRef}
            onClick={() => setSettingsOpen((v) => !v)}
            className={`w-full flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors ${viewMode === "settings" ? "bg-muted/50" : ""}`}
          >
            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden relative">
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
            <Icons.Settings size={16} className={`text-muted-foreground transition-transform ${settingsOpen ? "rotate-90" : ""}`} />
          </button>

          {settingsOpen && (
            <div
              ref={settingsPopupRef}
              className="absolute right-0 bottom-14 z-20 w-56 space-y-1 rounded-xl border border-border bg-popover shadow-xl p-2 origin-bottom-right animate-[settingsPop_160ms_ease-out]"
            >
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('appearance')}</div>
              <div className="px-2 pb-2">
                <ThemeToggle />
              </div>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('language')}</div>
              <div className="px-2 pb-2">
                <SidebarLanguageSwitcher />
              </div>
              <div className="h-px bg-border my-1" />
              <button
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition text-left text-foreground"
                onClick={() => {
                  setViewMode("settings");
                  setSettingsOpen(false);
                }}
              >
                <Icons.Settings size={16} className="text-muted-foreground" /> {t('settings')}
              </button>
              <div className="h-px bg-border" />
              <button
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition text-left text-destructive"
                onClick={() => {
                  setSettingsOpen(false);
                  onLogout?.();
                }}
                disabled={logoutLoading}
              >
                <LogOut size={16} /> {logoutLoading ? t('signingOut') : t('signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
