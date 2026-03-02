'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Sidebar } from './Sidebar';
import { Session as WorkspaceSession, ViewMode, UserProfile, Message } from '../types';
import { Icons } from './Icons';
import { generateOrEditImage } from '../services/geminiService';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/types';
import { Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useWorkspaceStore } from '../lib/store';

type MessageRow = Database['public']['Tables']['messages']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// Dynamic imports for performance
const ChatWorkspace = dynamic(() => import('./ChatWorkspace').then(mod => mod.ChatWorkspace), {
  loading: () => <div className="flex-1 flex items-center justify-center bg-background"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
});
const CanvasWorkspace = dynamic(() => import('./CanvasWorkspace').then(mod => mod.CanvasWorkspace), {
  loading: () => <div className="flex-1 flex items-center justify-center bg-background"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
});
const SettingsWorkspace = dynamic(() => import('./SettingsWorkspace').then(mod => mod.SettingsWorkspace), {
  loading: () => <div className="flex-1 flex items-center justify-center bg-background"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
});

interface AppProps {
  supabase: SupabaseClient<any, "public", any>;
  userEmail?: string;
  userName?: string;
  avatarUrl?: string;
  userId?: string;
  onLogout?: () => void | Promise<void>;
  logoutLoading?: boolean;
  initialViewMode?: ViewMode;
  initialSessionId?: string | null;
}

export default function App({
  supabase,
  userEmail = 'user@example.com',
  userName = 'Creative User',
  avatarUrl,
  userId,
  onLogout,
  logoutLoading,
  initialViewMode = 'chat',
  initialSessionId
}: AppProps) {
  const t = useTranslations('Workspace');

  // Connect to global Zustand Store
  const sidebarOpen = useWorkspaceStore(s => s.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore(s => s.setSidebarOpen);
  const userProfile = useWorkspaceStore(s => s.userProfile);
  const setUserProfile = useWorkspaceStore(s => s.setUserProfile);
  const sessions = useWorkspaceStore(s => s.sessions);
  const setSessions = useWorkspaceStore(s => s.setSessions);
  const currentSessionId = useWorkspaceStore(s => s.currentSessionId);
  const setCurrentSessionId = useWorkspaceStore(s => s.setCurrentSessionId);
  const setSessionLoaded = useWorkspaceStore(s => s.setSessionLoaded);

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [appLoading, setAppLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Sync state with props (e.g. when session loads)
  useEffect(() => {
    setUserProfile((prev: UserProfile) => ({
      ...prev,
      name: userName || prev.name,
      email: userEmail || prev.email,
      // Only update avatar if we are currently using the default placeholder or if the prop provides a specific value
      avatarUrl: (avatarUrl && (prev.avatarUrl === 'https://picsum.photos/200' || !prev.avatarUrl)) ? avatarUrl : prev.avatarUrl
    }));
  }, [userName, userEmail, avatarUrl]);

  const loadMessagesForProject = async (projectId: string) => {
    if (!projectId || projectId === 'temp' || projectId === '') {
      console.warn("Skipping message load for invalid project ID:", projectId);
      return;
    }

    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .returns<Database['public']['Tables']['messages']['Row'][]>();

      if (error) {
        console.error(`Supabase error loading messages for project ${projectId}:`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return;
      }

      const mapped: Message[] = (data || []).map((m) => ({
        id: m.id,
        role: m.author_role as 'user' | 'model',
        text: m.content || '',
        imageUrl: m.image_url || undefined,
        timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        parentId: m.parent_id || undefined,
        position: { x: Number(m.position_x || 0), y: Number(m.position_y || 0) }
      }));

      // updateMessages from the store inherently sets isLoaded to true
      useWorkspaceStore.getState().updateMessages(projectId, mapped);
    } finally {
      setLoadingMessages(false);
    }
  };

  const createNewSession = async (title: string = t('newProject')) => {
    if (!userId) return;
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('projects')
      .insert({ title, owner_id: userId, last_modified: nowIso } as any)
      .select()
      .single();

    if (error || !data) {
      console.error("Failed to create project", error);
      return;
    }

    const project = data as ProjectRow;

    const newSession: WorkspaceSession = {
      id: project.id,
      title: project.title,
      lastModified: project.last_modified ? new Date(project.last_modified).getTime() : Date.now(),
      messages: [],
      isLoaded: true
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(project.id);
    return project.id;
  };

  const touchProject = async (projectId: string) => {
    if (!projectId || projectId === 'temp') return;
    const nowIso = new Date().toISOString();
    // Cast to any because of Supabase type inference issue
    await supabase.from('projects').update({ last_modified: nowIso } as any).eq('id', projectId);
    setSessions((prev) => prev.map((s) => (s.id === projectId ? { ...s, lastModified: Date.now() } : s)));
  };

  // Fetch User Profile (Credits & Avatar)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, plan, avatar_url, display_name')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const profile = data as Pick<ProfileRow, "credits" | "avatar_url" | "display_name">;
        setUserProfile((prev: UserProfile) => ({
          ...prev,
          credits: profile.credits ?? 0,
          avatarUrl: profile.avatar_url || prev.avatarUrl,
          name: profile.display_name || prev.name
        }));
      }
    };
    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel("profiles-updates-app")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const next = (payload.new || payload.old) as ProfileRow;
          setUserProfile((prev: UserProfile) => ({
            ...prev,
            credits: typeof next?.credits === "number" ? next.credits : prev.credits,
            avatarUrl: next?.avatar_url || prev.avatarUrl,
            name: next?.display_name || prev.name
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!userId) return;
      setAppLoading(true);

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('last_modified', { ascending: false });

      if (error) {
        console.error("Failed to load projects", error);
        setAppLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        await createNewSession();
        setAppLoading(false);
        return;
      }

      const projects = data as ProjectRow[];

      const normalized = projects.map((p) => ({
        id: p.id,
        title: p.title,
        lastModified: p.last_modified ? new Date(p.last_modified).getTime() : Date.now(),
        messages: [],
        isLoaded: false
      }));
      setSessions(normalized);

      // Determine starting session
      let startId = projects[0].id;
      if (initialSessionId) {
        const found = projects.find(p => p.id === initialSessionId);
        if (found) {
          startId = found.id;
        }
      }

      // let the subsequent useEffect catch the !isLoaded state
      // and do the heavy data loading without blocking the UI
      setCurrentSessionId(startId);
      setAppLoading(false);
    };

    bootstrap();
  }, [supabase, userId]);

  useEffect(() => {
    if (!currentSessionId) return;
    const target = sessions.find((s) => s.id === currentSessionId);
    if (target && !target.isLoaded) {
      loadMessagesForProject(currentSessionId);
    }
  }, [currentSessionId, sessions]);

  const handlePrefetchSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    if (target && !target.isLoaded) {
      loadMessagesForProject(id);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0] || { messages: [], id: 'temp', title: 'Loading', lastModified: 0 };

  // Find the latest image in the current WorkspaceSession for context
  const latestImage = [...(currentSession.messages || [])].reverse().find(m => m.imageUrl)?.imageUrl || null;

  const handleNewSession = async () => {
    await createNewSession();
  };

  const handleDeleteSession = useCallback(async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    setSessions((prev: WorkspaceSession[]) => {
      const filtered = prev.filter((s: WorkspaceSession) => s.id !== id);
      if (filtered.length === 0) {
        createNewSession();
      } else if (currentSessionId === id) {
        setCurrentSessionId(filtered[0].id);
      }
      return filtered;
    });
  }, [supabase, currentSessionId, createNewSession, setCurrentSessionId, setSessions]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!window.confirm(t('deleteMessageConfirm'))) return;
    await supabase.from('messages').delete().eq('id', messageId);
    await touchProject(currentSessionId);
    setSessions((prevSessions: WorkspaceSession[]) => prevSessions.map((s: WorkspaceSession) => {
      if (s.id !== currentSessionId) return s;
      return {
        ...s,
        messages: s.messages.filter((m: Message) => m.id !== messageId),
        lastModified: Date.now()
      };
    }));
  }, [t, supabase, currentSessionId, touchProject, setSessions]);

  const handleRegenerateMessage = useCallback((message: Message) => {
    let promptText = "";
    let parentId = "";
    let sourceImage = undefined;
    let isContext = false;

    if (message.role === 'model') {
      const parent = currentSession.messages.find(m => m.id === message.parentId);
      if (parent) {
        promptText = parent.text;
        parentId = parent.parentId || ""; // Grandparent
        sourceImage = parent.imageUrl; // If the prompt had an image
        isContext = true;
      } else {
        return;
      }
    } else {
      // User message
      promptText = message.text;
      parentId = message.parentId || "";
      sourceImage = message.imageUrl;
      isContext = true; // Assume context for regen to avoid duplicating images in history visually
    }

    if (promptText) {
      const base64 = sourceImage ? sourceImage.split(',')[1] : undefined;
      // We need to use refs or carefully manage dependencies for handleSendMessage here to avoid circular dep
      handleSendMessage(promptText, base64, "1:1", parentId, isContext);
    }
  }, [currentSession.messages]);// Caution: handleSendMessage is used inside

  // 2. Canvas Optimization: Update Node Position
  const handleUpdateNodePosition = useCallback((nodeId: string, newPosition: { x: number; y: number }) => {
    useWorkspaceStore.getState().updateNodePosition(currentSessionId, nodeId, newPosition);
    supabase.from('messages').update({ position_x: newPosition.x, position_y: newPosition.y } as any).eq('id', nodeId);
  }, [currentSessionId, supabase]);

  // Batch update positions (Auto Layout)
  const handleAutoLayout = useCallback((newPositions: Record<string, { x: number, y: number }>) => {
    const currentMsgs = currentSession.messages;
    const updatedMessages = currentMsgs.map((m: Message) => newPositions[m.id] ? { ...m, position: newPositions[m.id] } : m);
    useWorkspaceStore.getState().updateMessages(currentSessionId, updatedMessages);

    const updates = Object.entries(newPositions).map(([id, pos]) =>
      supabase.from('messages').update({ position_x: pos.x, position_y: pos.y } as any).eq('id', id)
    );
    Promise.all(updates).catch(console.error);
  }, [currentSession.messages, currentSessionId, supabase]);

  // Helper to calculate new node position based on parent
  const calculateNodePosition = (parentId?: string, currentMessages: Message[] = []) => {
    const parent = currentMessages.find(m => m.id === parentId);

    if (!parent) {
      if (currentMessages.length === 0) return { x: 100, y: 100 }; // Initial padding
      // Default: Find rightmost node and add to it
      let maxX = 0;
      let maxY = 0;
      currentMessages.forEach(m => {
        if (m.position && m.position.x > maxX) {
          maxX = m.position.x;
          maxY = m.position.y;
        }
      });
      return { x: maxX + 450, y: maxY };
    }

    const parentPos = parent.position || { x: 0, y: 0 };
    // Branching logic: Calculate offset based on how many children this parent already has
    const siblings = currentMessages.filter(m => m.parentId === parentId);
    const siblingIndex = siblings.length;

    // x + 450 (width + gap), y + offset based on sibling count
    const yOffset = siblingIndex * 250;

    return {
      x: parentPos.x + 450,
      y: parentPos.y + yOffset
    };
  };

  const handleSendMessage = async (
    text: string,
    currentImageBase64?: string,
    aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16",
    parentId?: string,
    isContextImage: boolean = false
  ) => {

    if (!currentSessionId) return;

    const effectiveParentId = parentId || (currentSession.messages.length > 0 ? currentSession.messages[currentSession.messages.length - 1].id : undefined);
    const userPos = calculateNodePosition(effectiveParentId, currentSession.messages);
    let userMsgId = "";
    let placeholderId = "";

    setIsProcessing(true);
    setStatusMessage(t('processing'));

    try {
      const { data: userRow, error: userError } = await supabase
        .from('messages')
        .insert({
          project_id: currentSessionId,
          author_role: 'user',
          content: text,
          image_url: currentImageBase64 && !isContextImage ? `data:image/png;base64,${currentImageBase64}` : null,
          aspect_ratio: aspectRatio,
          parent_id: effectiveParentId || null,
          position_x: userPos.x,
          position_y: userPos.y
        } as any)
        .select()
        .single();

      if (userError) throw userError;

      const userMessageRow = userRow as MessageRow;

      userMsgId = userMessageRow?.id || Date.now().toString();
      const userMsg: Message = {
        id: userMsgId,
        role: 'user',
        text: text,
        timestamp: userMessageRow?.created_at ? new Date(userMessageRow.created_at).getTime() : Date.now(),
        parentId: effectiveParentId,
        position: userPos,
        imageUrl: (currentImageBase64 && !isContextImage) ? `data:image/png;base64,${currentImageBase64}` : undefined
      };

      const updatedMessages = [...currentSession.messages, userMsg];

      // Auto-title logic: If this is the first message, update the project title
      let newTitle = currentSession.title;
      if (currentSession.messages.length === 0) {
        newTitle = text.slice(0, 50);
        await supabase.from('projects').update({ title: newTitle } as any).eq('id', currentSessionId);
      }

      setSessions((prevSessions: WorkspaceSession[]) => prevSessions.map((s: WorkspaceSession) =>
        s.id === currentSessionId
          ? {
            ...s,
            messages: updatedMessages,
            lastModified: Date.now(),
            title: newTitle
          }
          : s
      ));
      await touchProject(currentSessionId);

      // Insert a placeholder skeleton node immediately so the canvas shows it
      const aiPos = { x: userPos.x + 450, y: userPos.y };
      placeholderId = `placeholder-${Date.now()}`;
      const placeholderMsg: Message = {
        id: placeholderId,
        role: 'model',
        text: statusMessage || t('generating'),
        timestamp: Date.now(),
        parentId: userMsgId,
        position: aiPos,
        isPlaceholder: true
      };
      const messagesWithPlaceholder = [...updatedMessages, placeholderMsg];

      setSessions((prevSessions: WorkspaceSession[]) => prevSessions.map((s: WorkspaceSession) =>
        s.id === currentSessionId
          ? { ...s, messages: messagesWithPlaceholder, lastModified: Date.now() }
          : s
      ));

      const response = await generateOrEditImage({
        prompt: text,
        base64Image: currentImageBase64,
        aspectRatio: aspectRatio,
        onStatusUpdate: (msg) => {
          setStatusMessage(msg);
          // Update placeholder text to show live status
          setSessions((prevSessions: WorkspaceSession[]) => prevSessions.map((s: WorkspaceSession) =>
            s.id === currentSessionId
              ? {
                ...s,
                messages: s.messages.map((m: Message) =>
                  m.id === placeholderId ? { ...m, text: msg } : m
                )
              }
              : s
          ));
        }
      });

      const aiContent = response.text || (response.imageUrl ? t('imageGenerated') : t('processedThat'));

      const { data: aiRow, error: aiError } = await supabase
        .from('messages')
        .insert({
          project_id: currentSessionId,
          author_role: 'model',
          content: aiContent,
          image_url: response.imageUrl || null,
          aspect_ratio: aspectRatio,
          parent_id: userMsgId,
          position_x: aiPos.x,
          position_y: aiPos.y
        } as any)
        .select()
        .single();

      if (aiError) throw aiError;

      const aiMessageRow = aiRow as MessageRow;

      const aiMsg: Message = {
        id: aiMessageRow?.id || Date.now().toString(),
        role: 'model',
        text: aiContent,
        imageUrl: response.imageUrl,
        timestamp: aiMessageRow?.created_at ? new Date(aiMessageRow.created_at).getTime() : Date.now(),
        parentId: userMsgId,
        position: aiPos
      };

      // Replace the placeholder with the real AI message
      setSessions((prevSessions: WorkspaceSession[]) => prevSessions.map((s: WorkspaceSession) =>
        s.id === currentSessionId
          ? {
            ...s,
            messages: s.messages.map((m: Message) => m.id === placeholderId ? aiMsg : m),
            lastModified: Date.now()
          }
          : s
      ));
      await touchProject(currentSessionId);
      const newCredits = Math.max(0, userProfile.credits - 5);
      setUserProfile((prev: UserProfile) => ({ ...prev, credits: newCredits }));
      if (userId) {
        await supabase.from('profiles').update({ credits: newCredits } as any).eq('id', userId);

        // Record credit deduction
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -5,
          source: 'Image Generation',
          metadata: { project_id: currentSessionId }
        } as any);
      }

    } catch (error: any) {
      console.error("Generation error:", error);

      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: t('errorPrefix') + (error.message || t('unexpectedError')),
        timestamp: Date.now(),
        parentId: userMsgId || effectiveParentId,
        position: { x: userPos.x + 450, y: userPos.y }
      };

      // Replace placeholder with error message (or append if no placeholder)
      setSessions((prevSessions: WorkspaceSession[]) =>
        prevSessions.map((s: WorkspaceSession) => {
          if (s.id !== currentSessionId) return s;
          const hasPlaceholder = s.messages.some((m: Message) => m.id === placeholderId);
          return {
            ...s,
            messages: hasPlaceholder
              ? s.messages.map((m: Message) => m.id === placeholderId ? errorMsg : m)
              : [...s.messages, errorMsg]
          };
        })
      );
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  if (appLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-muted-foreground font-medium animate-pulse">{t('loadingWorkspace')}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          isOpen={sidebarOpen}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onNewSession={handleNewSession}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onDeleteSession={handleDeleteSession}
          userProfile={userProfile}
          onLogout={onLogout}
          logoutLoading={logoutLoading}
          onToggle={() => setSidebarOpen((v) => !v)}
          onPrefetchSession={handlePrefetchSession}
        />

        <div className="flex-1 flex flex-col relative min-w-0">
          <>
            {!currentSession.isLoaded ? (
              <div
                key="session-loading"
                className="flex-1 flex flex-col lg:flex-row w-full h-full bg-muted/30"
              >
                {viewMode === 'canvas' ? (
                  /* Canvas Centric Loading Skeleton */
                  <div className="flex-1 relative w-full h-full bg-background overflow-hidden">
                    {/* Fake Grid Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                          <Loader2 className="animate-spin text-primary/40" size={48} />
                          <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping scale-75" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">
                            {t('loadingWorkspace')}
                          </span>
                          <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/30 animate-[skeletonShimmer_2s_infinite]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fake Floating Toolbars or Nodes in distance */}
                    <Skeleton className="absolute top-8 left-8 w-48 h-12 rounded-xl border border-border/50 opacity-20" />
                    <Skeleton className="absolute bottom-8 right-8 w-64 h-32 rounded-2xl border border-border/50 opacity-20" />
                  </div>
                ) : (
                  /* Chat Flow Loading Skeleton (Original) */
                  <>
                    <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-border bg-background h-1/2 lg:h-full p-6 space-y-6">
                      <div className="flex gap-4">
                        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                        <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tl-sm" />
                      </div>
                      <div className="flex gap-4 flex-row-reverse">
                        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                        <Skeleton className="h-24 w-2/3 rounded-2xl rounded-tr-sm" />
                      </div>
                      <div className="flex-1" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </div>

                    <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex items-center justify-center">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="text-sm font-medium animate-pulse">{t('loadingWorkspace') || 'Loading...'}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : viewMode === 'chat' ? (
              <div
                key="chat"
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                <ChatWorkspace
                  messages={currentSession.messages}
                  onSendMessage={handleSendMessage}
                  isProcessing={isProcessing}
                  onDeleteMessage={handleDeleteMessage}
                  onRegenerateMessage={handleRegenerateMessage}
                  latestImage={latestImage}
                  statusMessage={statusMessage}
                />
              </div>
            ) : viewMode === 'settings' ? (
              <div
                key="settings"
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                <SettingsWorkspace onNavigate={(sessionId) => {
                  setCurrentSessionId(sessionId);
                  setViewMode('chat');
                }} />
              </div>
            ) : (
              <div
                key="canvas"
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                <CanvasWorkspace
                  messages={currentSession.messages}
                  onSendMessage={handleSendMessage}
                  onUpdateNodePosition={handleUpdateNodePosition}
                  onAutoLayout={handleAutoLayout}
                  isProcessing={isProcessing}
                  onDeleteMessage={handleDeleteMessage}
                  onRegenerateMessage={handleRegenerateMessage}
                  statusMessage={statusMessage}
                />
              </div>
            )}
          </>
        </div>
      </div>
    </TooltipProvider>
  );
}
