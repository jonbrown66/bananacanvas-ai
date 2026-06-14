'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Sidebar } from './Sidebar';
import { Session as WorkspaceSession, ViewMode, UserProfile, Message } from '../types';
import { Icons } from './Icons';
import { generateOrEditImage, parseImageDataUrl, type ImageMimeType } from '../services/geminiService';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { reportClientMetric } from '@/lib/perf/client-metrics';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useShallow } from 'zustand/react/shallow';
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
  const tSecurity = useTranslations('Settings.Security');

  // Connect to global Zustand Store
  // Connect to global Zustand Store with useShallow for array/object properties
  const sidebarOpen = useWorkspaceStore(s => s.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore(s => s.setSidebarOpen);
  const userProfile = useWorkspaceStore(useShallow(s => s.userProfile));
  const setUserProfile = useWorkspaceStore(s => s.setUserProfile);
  const sessions = useWorkspaceStore(useShallow(s => s.sessions));
  const setSessions = useWorkspaceStore(s => s.setSessions);
  const currentSessionId = useWorkspaceStore(s => s.currentSessionId);
  const setCurrentSessionId = useWorkspaceStore(s => s.setCurrentSessionId);

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [appLoading, setAppLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<{
    messageId: string;
    x: number;
    y: number;
  } | null>(null);
  const inflightMessageLoadsRef = React.useRef<Map<string, Promise<void>>>(new Map());
  const workspaceMountedAtRef = React.useRef(performance.now());
  const shellReadyReportedRef = React.useRef(false);

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

  const loadMessagesForProject = useCallback(async (
    projectId: string,
    reason: 'initial' | 'switch' | 'prefetch' = 'switch'
  ) => {
    if (!projectId || projectId === 'temp' || projectId === '') {
      console.warn("Skipping message load for invalid project ID:", projectId);
      return;
    }

    const existingLoad = inflightMessageLoadsRef.current.get(projectId);
    if (existingLoad) {
      return existingLoad;
    }

    const startedAt = performance.now();

    const task = (async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true })
          .returns<Database['public']['Tables']['messages']['Row'][]>();

        if (error) {
          const info = {
            code: (error as any)?.code ?? null,
            message: (error as any)?.message ?? null,
            details: (error as any)?.details ?? null,
            hint: (error as any)?.hint ?? null
          };
          // Avoid noisy dev overlay from console.error on recoverable fetch issues.
          console.warn(`Supabase message load failed for project ${projectId}:`, info);
          useWorkspaceStore.getState().updateMessages(projectId, []);
          reportClientMetric({
            name: 'workspace_messages_load_failed',
            value: Number((performance.now() - startedAt).toFixed(2)),
            unit: 'ms',
            level: 'warn',
            tags: { reason, project_id: projectId }
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
        reportClientMetric({
          name: 'workspace_messages_load_duration',
          value: Number((performance.now() - startedAt).toFixed(2)),
          unit: 'ms',
          tags: {
            reason,
            project_id: projectId,
            messages: mapped.length
          }
        });
      } catch (err) {
        // Network interruptions or transient runtime issues should not block the workspace.
        console.warn(`Unexpected message load failure for project ${projectId}:`, err);
        useWorkspaceStore.getState().updateMessages(projectId, []);
        reportClientMetric({
          name: 'workspace_messages_load_exception',
          value: Number((performance.now() - startedAt).toFixed(2)),
          unit: 'ms',
          level: 'warn',
          tags: { reason, project_id: projectId }
        });
      } finally {
        inflightMessageLoadsRef.current.delete(projectId);
      }
    })();

    inflightMessageLoadsRef.current.set(projectId, task);
    return task;
  }, [supabase]);

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

  // Initialization: Fetch User Profile and Projects in Parallel
  useEffect(() => {
    const initWorkspace = async () => {
      if (!userId) {
        console.warn("Init skipped: No userId available.");
        setAppLoading(false);
        return;
      }

      setAppLoading(true);
      const startedAt = performance.now();
      let loadedProjectsCount = 0;

      try {
        // Parallel fetch for profile and projects
        const [profileRes, projectsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('credits, plan, avatar_url, display_name')
            .eq('id', userId)
            .single(),
          supabase
            .from('projects')
            .select('*')
            .order('last_modified', { ascending: false })
        ]);

        // Handle Profile Data
        if (!profileRes.error && profileRes.data) {
          const profile = profileRes.data as Pick<ProfileRow, "credits" | "avatar_url" | "display_name">;
          setUserProfile((prev: UserProfile) => ({
            ...prev,
            credits: profile.credits ?? 0,
            avatarUrl: profile.avatar_url || prev.avatarUrl,
            name: profile.display_name || prev.name
          }));
        }

        // Handle Projects Data
        if (projectsRes.error) throw projectsRes.error;

        if (!projectsRes.data || projectsRes.data.length === 0) {
          await createNewSession();
          setAppLoading(false);
          return;
        }

        const projects = projectsRes.data as ProjectRow[];
        loadedProjectsCount = projects.length;
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
          if (found) startId = found.id;
        }

        setCurrentSessionId(startId);

        // Optimization: Start loading messages for the initial session immediately
        // without waiting for the next render cycle of currentSessionId
        loadMessagesForProject(startId, 'initial');

      } catch (err) {
        console.error("Workspace initialization failed:", err);
        reportClientMetric({
          name: 'workspace_bootstrap_failed',
          value: Number((performance.now() - startedAt).toFixed(2)),
          unit: 'ms',
          level: 'warn'
        });
      } finally {
        setAppLoading(false);
        reportClientMetric({
          name: 'workspace_bootstrap_duration',
          value: Number((performance.now() - startedAt).toFixed(2)),
          unit: 'ms',
          tags: {
            projects: loadedProjectsCount
          }
        });
      }
    };

    initWorkspace();

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
    if (!currentSessionId) return;
    const target = sessions.find((s) => s.id === currentSessionId);
    if (target && !target.isLoaded) {
      loadMessagesForProject(currentSessionId, 'switch');
    }
  }, [currentSessionId, sessions, loadMessagesForProject]);

  useEffect(() => {
    if (appLoading || shellReadyReportedRef.current) return;
    shellReadyReportedRef.current = true;
    reportClientMetric({
      name: 'workspace_shell_ready_duration',
      value: Number((performance.now() - workspaceMountedAtRef.current).toFixed(2)),
      unit: 'ms',
      tags: {
        sessions: sessions.length
      }
    });
  }, [appLoading, sessions.length]);

  useEffect(() => {
    if (!currentSessionId || sessions.length < 2) return;
    const candidates = sessions
      .filter((session) => session.id !== currentSessionId && !session.isLoaded)
      .slice(0, 2);

    if (!candidates.length) return;

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;

    const prefetch = () => {
      if (cancelled) return;
      for (const candidate of candidates) {
        void loadMessagesForProject(candidate.id, 'prefetch');
      }
    };

    const requestIdle = (window as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    }).requestIdleCallback;
    const cancelIdle = (window as Window & {
      cancelIdleCallback?: (handle: number) => void;
    }).cancelIdleCallback;

    if (typeof requestIdle === 'function') {
      idleCallbackId = requestIdle(prefetch, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(prefetch, 360);
    }

    return () => {
      cancelled = true;
      if (idleCallbackId !== null && typeof cancelIdle === 'function') {
        cancelIdle(idleCallbackId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [currentSessionId, sessions, loadMessagesForProject]);

  const handlePrefetchSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    if (target && !target.isLoaded) {
      loadMessagesForProject(id, 'prefetch');
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

  const handleDeleteMessage = useCallback((messageId: string, anchor?: { x: number; y: number }) => {
    const fallbackX = typeof window !== 'undefined' ? window.innerWidth / 2 : 360;
    const fallbackY = typeof window !== 'undefined' ? window.innerHeight / 2 : 260;
    const x = anchor?.x ?? fallbackX;
    const y = anchor?.y ?? fallbackY;
    setPendingDelete({ messageId, x, y });
  }, []);

  const confirmDeleteMessage = useCallback(async () => {
    if (!pendingDelete?.messageId) return;
    const targetId = pendingDelete.messageId;
    setPendingDelete(null);

    try {
      await supabase.from('messages').delete().eq('id', targetId);
      await touchProject(currentSessionId);
      setSessions((prevSessions: WorkspaceSession[]) => prevSessions.map((s: WorkspaceSession) => {
        if (s.id !== currentSessionId) return s;
        return {
          ...s,
          messages: s.messages.filter((m: Message) => m.id !== targetId),
          lastModified: Date.now()
        };
      }));
    } catch (error) {
      console.error('Delete message failed:', error);
    }
  }, [pendingDelete, supabase, touchProject, currentSessionId, setSessions]);

  useEffect(() => {
    setPendingDelete(null);
  }, [currentSessionId]);

  const findNearestAncestorImage = useCallback((startParentId?: string) => {
    if (!startParentId) return undefined;

    const byId = new Map(currentSession.messages.map((m) => [m.id, m]));
    let cursor: string | undefined = startParentId;
    let guard = 0;

    while (cursor && guard < 40) {
      const node = byId.get(cursor);
      if (!node) break;
      if (node.imageUrl) return node.imageUrl;
      cursor = node.parentId;
      guard += 1;
    }

    return undefined;
  }, [currentSession.messages]);

  const handleRegenerateMessage = useCallback((message: Message) => {
    let promptText = "";
    let sourceImage: string | undefined = undefined;
    let parentId = "";
    let userMessageId = "";
    let targetModelId = "";
    let targetModelPos: { x: number; y: number } | undefined = undefined;

    if (message.role === 'model') {
      const parent = currentSession.messages.find(m => m.id === message.parentId && m.role === 'user');
      if (!parent) return;

      promptText = parent.text;
      sourceImage = parent.imageUrl || findNearestAncestorImage(parent.parentId);
      parentId = parent.parentId || "";
      userMessageId = parent.id;
      targetModelId = message.id;
      targetModelPos = message.position;
    } else {
      const latestModelChild = [...currentSession.messages]
        .reverse()
        .find((m) => m.role === 'model' && m.parentId === message.id);

      promptText = message.text;
      sourceImage = message.imageUrl || findNearestAncestorImage(message.parentId);
      parentId = message.parentId || "";
      userMessageId = message.id;
      targetModelId = latestModelChild?.id || "";
      targetModelPos = latestModelChild?.position;
    }

    if (!promptText) return;

    const sourceImagePayload = parseImageDataUrl(sourceImage);

    if (targetModelId && userMessageId) {
      handleSendMessage(promptText, sourceImagePayload?.base64, "1:1", parentId, true, sourceImagePayload?.mimeType, {
        replaceModelMessageId: targetModelId,
        fixedUserMessageId: userMessageId,
        fixedAiPosition: targetModelPos
      });
      return;
    }

    handleSendMessage(promptText, sourceImagePayload?.base64, "1:1", parentId, true, sourceImagePayload?.mimeType);
  }, [currentSession.messages, findNearestAncestorImage]);

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

  const buildPromptWithContext = useCallback((prompt: string, parentChainStartId?: string) => {
    const cleanPrompt = prompt.trim();
    if (!parentChainStartId) return cleanPrompt;

    const byId = new Map(currentSession.messages.map((m) => [m.id, m]));
    const chain: Message[] = [];
    let cursor: string | undefined = parentChainStartId;
    let guard = 0;

    while (cursor && guard < 40) {
      const node = byId.get(cursor);
      if (!node) break;
      chain.push(node);
      cursor = node.parentId;
      guard += 1;
    }

    const contextLines = chain
      .reverse()
      .filter((m) => Boolean((m.text || '').trim()))
      .slice(-6)
      .map((m) => {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const summary = (m.text || '').replace(/\s+/g, ' ').trim().slice(0, 180);
        return `${role}: ${summary}`;
      });

    if (!contextLines.length) return cleanPrompt;

    return [
      'Use prior context to keep output consistent.',
      'Context:',
      ...contextLines,
      'Current request:',
      cleanPrompt
    ].join('\n');
  }, [currentSession.messages]);

  const handleSendMessage = async (
    text: string,
    currentImageBase64?: string,
    aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16",
    parentId?: string,
    isContextImage: boolean = false,
    imageMimeType: ImageMimeType = "image/png",
    regenerateOptions?: {
      replaceModelMessageId?: string;
      fixedUserMessageId?: string;
      fixedAiPosition?: { x: number; y: number };
    }
  ) => {

    if (!currentSessionId) return;

    const replaceModelMessageId = regenerateOptions?.replaceModelMessageId;
    const fixedUserMessageId = regenerateOptions?.fixedUserMessageId;
    const isReplaceMode = Boolean(replaceModelMessageId && fixedUserMessageId);
    const effectiveParentId = parentId || (currentSession.messages.length > 0 ? currentSession.messages[currentSession.messages.length - 1].id : undefined);
    const userPos = calculateNodePosition(effectiveParentId, currentSession.messages);
    let userMsgId = fixedUserMessageId || "";
    let placeholderId = "";
    let aiPos = regenerateOptions?.fixedAiPosition || { x: userPos.x + 450, y: userPos.y };

    setIsProcessing(true);
    setStatusMessage(t('processing'));

    try {
      if (!isReplaceMode) {
        const { data: userRow, error: userError } = await supabase
          .from('messages')
          .insert({
            project_id: currentSessionId,
            author_role: 'user',
            content: text,
            image_url: currentImageBase64 && !isContextImage ? `data:${imageMimeType};base64,${currentImageBase64}` : null,
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
          imageUrl: (currentImageBase64 && !isContextImage) ? `data:${imageMimeType};base64,${currentImageBase64}` : undefined
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
        aiPos = { x: userPos.x + 450, y: userPos.y };
        placeholderId = `placeholder-${Date.now()}`;
        const placeholderMsg: Message = {
          id: placeholderId,
          role: 'model',
          text: statusMessage || t('processing'),
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
      } else {
        if (!userMsgId || !replaceModelMessageId) {
          throw new Error('Regenerate target is invalid.');
        }

        placeholderId = replaceModelMessageId;
        const existingTarget = currentSession.messages.find((m) => m.id === replaceModelMessageId);
        if (existingTarget?.position) {
          aiPos = existingTarget.position;
        }

        const placeholderMsg: Message = {
          id: placeholderId,
          role: 'model',
          text: statusMessage || t('processing'),
          timestamp: Date.now(),
          parentId: userMsgId,
          position: aiPos,
          isPlaceholder: true
        };

        setSessions((prevSessions: WorkspaceSession[]) =>
          prevSessions.map((s: WorkspaceSession) => {
            if (s.id !== currentSessionId) return s;
            let replaced = false;
            const nextMessages = s.messages.map((m: Message) => {
              if (m.id !== placeholderId) return m;
              replaced = true;
              return {
                ...placeholderMsg,
                position: m.position || aiPos,
                parentId: m.parentId || userMsgId
              };
            });
            return {
              ...s,
              messages: replaced ? nextMessages : [...nextMessages, placeholderMsg],
              lastModified: Date.now()
            };
          })
        );
      }

      const contextualPrompt = buildPromptWithContext(text, effectiveParentId);
      const response = await generateOrEditImage({
        prompt: contextualPrompt,
        base64Image: currentImageBase64,
        imageMimeType,
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

      const aiContent = (response.text || '').trim() || (response.imageUrl ? '' : t('processedThat'));
      let aiMsg: Message;

      if (isReplaceMode && replaceModelMessageId) {
        const { data: updatedRow, error: updateError } = await supabase
          .from('messages')
          .update({
            content: aiContent,
            image_url: response.imageUrl || null,
            aspect_ratio: aspectRatio || null,
            parent_id: userMsgId || null,
            position_x: aiPos.x,
            position_y: aiPos.y
          } as any)
          .eq('id', replaceModelMessageId)
          .select()
          .single();

        if (updateError) throw updateError;

        const row = updatedRow as MessageRow;
        aiMsg = {
          id: row?.id || replaceModelMessageId,
          role: 'model',
          text: aiContent,
          imageUrl: response.imageUrl,
          timestamp: row?.created_at ? new Date(row.created_at).getTime() : Date.now(),
          parentId: row?.parent_id || userMsgId,
          position: {
            x: Number(row?.position_x ?? aiPos.x),
            y: Number(row?.position_y ?? aiPos.y)
          }
        };
      } else {
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

        aiMsg = {
          id: aiMessageRow?.id || Date.now().toString(),
          role: 'model',
          text: aiContent,
          imageUrl: response.imageUrl,
          timestamp: aiMessageRow?.created_at ? new Date(aiMessageRow.created_at).getTime() : Date.now(),
          parentId: userMsgId,
          position: aiPos
        };
      }

      // Replace the placeholder with the real AI message
      setSessions((prevSessions: WorkspaceSession[]) =>
        prevSessions.map((s: WorkspaceSession) => {
          if (s.id !== currentSessionId) return s;
          let replaced = false;
          const nextMessages = s.messages.map((m: Message) => {
            if (m.id !== placeholderId) return m;
            replaced = true;
            return aiMsg;
          });
          return {
            ...s,
            messages: replaced ? nextMessages : [...nextMessages, aiMsg],
            lastModified: Date.now()
          };
        })
      );
      await touchProject(currentSessionId);

    } catch (error: any) {
      console.error("Generation error:", error);

      const errorMessageId = isReplaceMode && replaceModelMessageId
        ? replaceModelMessageId
        : Date.now().toString();

      const errorMsg: Message = {
        id: errorMessageId,
        role: 'model',
        text: t('errorPrefix') + (error.message || t('unexpectedError')),
        timestamp: Date.now(),
        parentId: userMsgId || effectiveParentId,
        position: aiPos
      };

      // Replace placeholder with error message (or append if no placeholder)
      setSessions((prevSessions: WorkspaceSession[]) =>
        prevSessions.map((s: WorkspaceSession) => {
          if (s.id !== currentSessionId) return s;
          const hasPlaceholder = s.messages.some((m: Message) => m.id === placeholderId);
          if (hasPlaceholder) {
            return {
              ...s,
              messages: s.messages.map((m: Message) => m.id === placeholderId ? errorMsg : m)
            };
          }

          if (isReplaceMode && replaceModelMessageId) {
            return {
              ...s,
              messages: s.messages.map((m: Message) => m.id === replaceModelMessageId ? errorMsg : m)
            };
          }

          return {
            ...s,
            messages: [...s.messages, errorMsg]
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
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-muted-foreground font-medium animate-pulse">{t('loadingWorkspace')}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
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
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-[80] w-[240px] md:w-[260px]"
            style={{
              left: `${Math.min(Math.max(8, pendingDelete.x + 10), (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280)}px`,
              top: `${Math.min(Math.max(8, pendingDelete.y + 10), (typeof window !== 'undefined' ? window.innerHeight : 800) - 120)}px`
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="确认删除"
              className="rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-xl p-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  请确认是否删除？
                </p>
              </div>
              <div className="mt-2.5 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors"
                >
                  {tSecurity('cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteMessage}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  {t('delete')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
