'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Sidebar } from './Sidebar';
import { Session as WorkspaceSession, ViewMode, UserProfile, Message } from '../types';
import { Icons } from './Icons';
import { generateOrEditImage } from '../services/geminiService';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/types';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [appLoading, setAppLoading] = useState(true);

  // User Data
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: userName,
    email: userEmail,
    credits: 0, // Start with 0, fetch real value
    avatarUrl: avatarUrl || 'https://picsum.photos/200'
  });

  // Sync state with props (e.g. when session loads)
  useEffect(() => {
    setUserProfile(prev => ({
      ...prev,
      name: userName || prev.name,
      email: userEmail || prev.email,
      // Only update avatar if we are currently using the default placeholder or if the prop provides a specific value
      avatarUrl: (avatarUrl && (prev.avatarUrl === 'https://picsum.photos/200' || !prev.avatarUrl)) ? avatarUrl : prev.avatarUrl
    }));
  }, [userName, userEmail, avatarUrl]);

  // Sessions Data
  const [sessions, setSessions] = useState<WorkspaceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const loadMessagesForProject = async (projectId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .returns<Database['public']['Tables']['messages']['Row'][]>();

    if (error) {
      console.error("Failed to load messages", error);
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

    setSessions((prev) => prev.map((s) => (s.id === projectId ? { ...s, messages: mapped } : s)));
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
      messages: []
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(project.id);
    return project.id;
  };

  const touchProject = async (projectId: string) => {
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
        setUserProfile(prev => ({
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
          setUserProfile((prev) => ({
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
        messages: []
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

      setCurrentSessionId(startId);
      await loadMessagesForProject(startId);
      setAppLoading(false);
    };

    bootstrap();
  }, [supabase, userId]);

  useEffect(() => {
    if (!currentSessionId) return;
    const target = sessions.find((s) => s.id === currentSessionId);
    if (target && target.messages.length === 0) {
      loadMessagesForProject(currentSessionId);
    }
  }, [currentSessionId, sessions]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0] || { messages: [], id: 'temp', title: 'Loading', lastModified: 0 };

  // Find the latest image in the current WorkspaceSession for context
  const latestImage = [...(currentSession.messages || [])].reverse().find(m => m.imageUrl)?.imageUrl || null;

  const handleNewSession = async () => {
    await createNewSession();
  };

  const handleDeleteSession = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        createNewSession();
      } else if (currentSessionId === id) {
        setCurrentSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm(t('deleteMessageConfirm'))) return;
    await supabase.from('messages').delete().eq('id', messageId);
    await touchProject(currentSessionId);
    setSessions(prevSessions => prevSessions.map(s => {
      if (s.id !== currentSessionId) return s;
      return {
        ...s,
        messages: s.messages.filter(m => m.id !== messageId),
        lastModified: Date.now()
      };
    }));
  };

  const handleRegenerateMessage = (message: Message) => {
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
        isContext = !sourceImage;
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
      handleSendMessage(promptText, base64, "1:1", parentId, isContext);
    }
  };

  // 2. Canvas Optimization: Update Node Position
  const handleUpdateNodePosition = (nodeId: string, newPosition: { x: number; y: number }) => {
    setSessions(prevSessions => prevSessions.map(s => {
      if (s.id !== currentSessionId) return s;
      return {
        ...s,
        messages: s.messages.map(m => m.id === nodeId ? { ...m, position: newPosition } : m),
        lastModified: Date.now()
      };
    }));
    supabase.from('messages').update({ position_x: newPosition.x, position_y: newPosition.y } as any).eq('id', nodeId);
  };

  // Batch update positions (Auto Layout)
  const handleAutoLayout = (newPositions: Record<string, { x: number, y: number }>) => {
    setSessions(prevSessions => prevSessions.map(s => {
      if (s.id !== currentSessionId) return s;
      return {
        ...s,
        messages: s.messages.map(m => newPositions[m.id] ? { ...m, position: newPositions[m.id] } : m),
        lastModified: Date.now()
      };
    }));
    const updates = Object.entries(newPositions).map(([id, pos]) =>
      supabase.from('messages').update({ position_x: pos.x, position_y: pos.y } as any).eq('id', id)
    );
    Promise.all(updates).catch(console.error);
  };

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

      setSessions(prevSessions => prevSessions.map(s =>
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

      const response = await generateOrEditImage({
        prompt: text,
        base64Image: currentImageBase64,
        aspectRatio: aspectRatio,
        onStatusUpdate: (msg) => setStatusMessage(msg)
      });

      const aiPos = { x: userPos.x + 450, y: userPos.y };
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

      setSessions(prevSessions => prevSessions.map(s =>
        s.id === currentSessionId
          ? {
            ...s,
            messages: [...updatedMessages, aiMsg],
            lastModified: Date.now()
          }
          : s
      ));
      await touchProject(currentSessionId);
      const newCredits = Math.max(0, userProfile.credits - 5);
      setUserProfile(prev => ({ ...prev, credits: newCredits }));
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

      const aiPos = { x: userPos.x + 450, y: userPos.y };
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: t('errorPrefix') + (error.message || t('unexpectedError')),
        timestamp: Date.now(),
        parentId: userMsgId || effectiveParentId,
        position: aiPos
      };

      setSessions(prevSessions =>
        prevSessions.map(s => {
          if (s.id !== currentSessionId) return s;
          return { ...s, messages: [...s.messages, errorMsg] };
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
      />

      <div className="flex-1 flex flex-col relative min-w-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-50 p-2 bg-background/80 backdrop-blur border border-border rounded-lg text-muted-foreground hover:text-foreground shadow-sm transition-colors"
        >
          {sidebarOpen ? <Icons.SidebarClose size={20} /> : <Icons.SidebarOpen size={20} />}
        </button>

        <AnimatePresence mode="wait">
          {viewMode === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
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
            </motion.div>
          ) : viewMode === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <SettingsWorkspace onNavigate={(sessionId) => {
                setCurrentSessionId(sessionId);
                setViewMode('chat');
              }} />
            </motion.div>
          ) : (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
