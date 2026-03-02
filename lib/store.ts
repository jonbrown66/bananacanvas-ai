import { create } from 'zustand';
import { Session as WorkspaceSession, UserProfile, Message } from '../types';

interface WorkspaceStore {
    // Global View State
    sidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;

    // User
    userProfile: UserProfile;
    setUserProfile: (profile: Partial<UserProfile> | ((prev: UserProfile) => Partial<UserProfile>)) => void;

    // Sessions Data
    sessions: WorkspaceSession[];
    setSessions: (sessions: WorkspaceSession[] | ((prev: WorkspaceSession[]) => WorkspaceSession[])) => void;
    currentSessionId: string;
    setCurrentSessionId: (id: string) => void;

    // Actions
    updateNodePosition: (sessionId: string, nodeId: string, newPosition: { x: number; y: number }) => void;
    updateMessages: (sessionId: string, messages: Message[]) => void;
    setSessionLoaded: (sessionId: string, isLoaded: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
    sidebarOpen: true,
    setSidebarOpen: (action) => set((state) => ({
        sidebarOpen: typeof action === 'function' ? action(state.sidebarOpen) : action
    })),

    userProfile: {
        name: '',
        email: '',
        credits: 0,
        avatarUrl: ''
    },
    setUserProfile: (action) => set((state) => ({
        userProfile: {
            ...state.userProfile,
            ...(typeof action === 'function' ? action(state.userProfile) : action)
        }
    })),

    sessions: [],
    setSessions: (action) => set((state) => ({
        sessions: typeof action === 'function' ? action(state.sessions) : action
    })),

    currentSessionId: '',
    setCurrentSessionId: (id) => set({ currentSessionId: id }),

    // Performance optimized updates that don't recreate the entire session array if only node coordinates change
    updateNodePosition: (sessionId, nodeId, newPosition) => set((state) => ({
        sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                messages: s.messages.map((m) =>
                    m.id === nodeId ? { ...m, position: newPosition } : m
                ),
            };
        }),
    })),

    updateMessages: (sessionId, messages) => set((state) => ({
        sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                messages,
                isLoaded: true
            };
        }),
    })),

    setSessionLoaded: (sessionId, isLoaded) => set((state) => ({
        sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                isLoaded
            };
        }),
    })),
}));
