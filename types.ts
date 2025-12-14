
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  timestamp: number;
  // Canvas specific properties
  parentId?: string;
  position?: { x: number; y: number };
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  lastModified: number;
}

export type ViewMode = 'chat' | 'canvas' | 'settings';

export interface UserProfile {
  name: string;
  email: string;
  credits: number;
  avatarUrl: string;
}

export interface PromptSuggestion {
  id: string;
  label: string;
  prompt: string;
}
