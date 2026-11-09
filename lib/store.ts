import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Session as WorkspaceSession, UserProfile, Message } from "../types";

// Fast selector hooks for optimized subscriptions - components only re-render when their specific data changes
export const useSidebarOpen = () =>
  useWorkspaceStore((state) => state.sidebarOpen);

export const useUserProfile = () =>
  useWorkspaceStore((state) => state.userProfile);

export const useSessions = () => useWorkspaceStore((state) => state.sessions);

export const useCurrentSessionId = () =>
  useWorkspaceStore((state) => state.currentSessionId);

// Selector for a specific session by id - only re-renders when that session changes
export const useSessionById = (sessionId: string) =>
  useWorkspaceStore((state) => state.sessions.find((s) => s.id === sessionId));

interface WorkspaceStore {
  // Global View State
  sidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;

  // User
  userProfile: UserProfile;
  setUserProfile: (
    profile:
      | Partial<UserProfile>
      | ((prev: UserProfile) => Partial<UserProfile>),
  ) => void;

  // Sessions Data
  sessions: WorkspaceSession[];
  setSessions: (
    sessions:
      | WorkspaceSession[]
      | ((prev: WorkspaceSession[]) => WorkspaceSession[]),
  ) => void;
  currentSessionId: string;
  setCurrentSessionId: (id: string) => void;

  // Actions
  updateNodePosition: (
    sessionId: string,
    nodeId: string,
    newPosition: { x: number; y: number },
  ) => void;
  updateMessages: (sessionId: string, messages: Message[]) => void;
  setSessionLoaded: (sessionId: string, isLoaded: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (action) =>
        set((state) => ({
          sidebarOpen:
            typeof action === "function" ? action(state.sidebarOpen) : action,
        })),

      userProfile: {
        name: "",
        email: "",
        credits: 0,
        avatarUrl: "",
      },
      setUserProfile: (action) =>
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            ...(typeof action === "function" ? action(state.userProfile) : action),
          },
        })),

      sessions: [],
      setSessions: (action) =>
        set((state) => ({
          sessions: typeof action === "function" ? action(state.sessions) : action,
        })),

      currentSessionId: "",
      setCurrentSessionId: (id) => set({ currentSessionId: id }),

      updateNodePosition: (sessionId, nodeId, newPosition) =>
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;

          const session = state.sessions[sessionIndex];
          const messageIndex = session.messages.findIndex((m) => m.id === nodeId);
          if (messageIndex === -1) return state;

          const newMessages = [...session.messages];
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            position: newPosition,
          };

          const newSessions = [...state.sessions];
          newSessions[sessionIndex] = {
            ...session,
            messages: newMessages,
          };

          return { sessions: newSessions };
        }),

      updateMessages: (sessionId, messages) =>
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;

          const newSessions = [...state.sessions];
          newSessions[sessionIndex] = {
            ...state.sessions[sessionIndex],
            messages,
            isLoaded: true,
          };

          return { sessions: newSessions };
        }),

      setSessionLoaded: (sessionId, isLoaded) =>
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;

          const newSessions = [...state.sessions];
          newSessions[sessionIndex] = {
            ...state.sessions[sessionIndex],
            isLoaded,
          };

          return { sessions: newSessions };
        }),
    }),
    {
      name: "bananacanvas-workspace-cache",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      skipHydration: true,
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        userProfile: state.userProfile,
        currentSessionId: state.currentSessionId,
        sessions: state.sessions.slice(0, 15).map((s) => ({
          id: s.id,
          title: s.title,
          lastModified: s.lastModified,
          // Strip inline base64 images: a single data URL is 1-3MB and a
          // handful of them blows the ~5MB localStorage quota, which makes
          // zustand persist silently fail for the whole workspace cache.
          // https URLs stay — they are just strings and rehydrate instantly.
          messages: s.messages.slice(-10).map((m) => ({
            ...m,
            imageUrl: m.imageUrl && !m.imageUrl.startsWith("data:") ? m.imageUrl : undefined,
          })),
          isLoaded: s.isLoaded,
        })),
      }),
    }
  )
);

export const rehydrateWorkspaceStore = () => {
  if (typeof window !== "undefined") {
    void useWorkspaceStore.persist.rehydrate();
  }
};
