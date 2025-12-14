export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          credits: number | null;
          plan: string | null;
          creem_customer_id: string | null;
          creem_subscription_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          credits?: number | null;
          plan?: string | null;
          creem_customer_id?: string | null;
          creem_subscription_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          cover_image: string | null;
          last_modified: string | null;
          created_at: string | null;
          is_archived: boolean | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          cover_image?: string | null;
          last_modified?: string | null;
          created_at?: string | null;
          is_archived?: boolean | null;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          project_id: string;
          author_role: "user" | "model";
          content: string | null;
          image_url: string | null;
          aspect_ratio: string | null;
          parent_id: string | null;
          position_x: number | null;
          position_y: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          author_role: "user" | "model";
          content?: string | null;
          image_url?: string | null;
          aspect_ratio?: string | null;
          parent_id?: string | null;
          position_x?: number | null;
          position_y?: number | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          source: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          source: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["credit_transactions"]["Insert"]>;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
