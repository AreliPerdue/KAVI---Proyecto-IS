/**
 * Tipos de la base de datos, derivados del esquema de `supabase/migrations/`.
 * NO editar a mano: se regenera con `pnpm db:types` (o con el script equivalente
 * cuando no hay Docker). Los services mapean estas filas a `types/domain.ts`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          theme_id: string | null;
          dimension: Database["public"]["Enums"]["dimension"] | null;
          color: string | null;
          icon: string | null;
          start_at: string;
          end_at: string;
          all_day: boolean;
          recurrence_rule: string | null;
          recurrence_parent_id: string | null;
          is_gym: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          theme_id?: string | null;
          dimension?: Database["public"]["Enums"]["dimension"] | null;
          color?: string | null;
          icon?: string | null;
          start_at: string;
          end_at: string;
          all_day?: boolean;
          recurrence_rule?: string | null;
          recurrence_parent_id?: string | null;
          is_gym?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          theme_id?: string | null;
          dimension?: Database["public"]["Enums"]["dimension"] | null;
          color?: string | null;
          icon?: string | null;
          start_at?: string;
          end_at?: string;
          all_day?: boolean;
          recurrence_rule?: string | null;
          recurrence_parent_id?: string | null;
          is_gym?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_shares: {
        Row: {
          id: string;
          activity_id: string;
          shared_with_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          shared_with_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          shared_with_id?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      calendar_shares: {
        Row: {
          id: string;
          owner_id: string;
          shared_with_id: string;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          shared_with_id: string;
          visibility?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          shared_with_id?: string;
          visibility?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      connections: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: string;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: string;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: string;
          created_at?: string;
          responded_at?: string | null;
        };
        Relationships: [];
      };
      contact_colors: {
        Row: {
          owner_id: string;
          contact_id: string;
          color: string;
        };
        Insert: {
          owner_id: string;
          contact_id: string;
          color: string;
        };
        Update: {
          owner_id?: string;
          contact_id?: string;
          color?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          birthday: string | null;
          created_at: string;
          role: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          created_at?: string;
          role?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          created_at?: string;
          role?: string;
        };
        Relationships: [];
      };
      reminder_recipients: {
        Row: {
          id: string;
          reminder_id: string;
          user_id: string;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          reminder_id: string;
          user_id: string;
          enabled?: boolean;
        };
        Update: {
          id?: string;
          reminder_id?: string;
          user_id?: string;
          enabled?: boolean;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          activity_id: string;
          offset_minutes: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          offset_minutes: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          offset_minutes?: number;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      themes: {
        Row: {
          id: string;
          name: string;
          dimension: Database["public"]["Enums"]["dimension"];
          color: string;
          icon: string;
          is_system: boolean;
          owner_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          dimension: Database["public"]["Enums"]["dimension"];
          color: string;
          icon: string;
          is_system?: boolean;
          owner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          dimension?: Database["public"]["Enums"]["dimension"];
          color?: string;
          icon?: string;
          is_system?: boolean;
          owner_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          position: number;
          name: string;
          sets: number | null;
          reps: string | null;
          weight: string | null;
          duration_minutes: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          workout_id: string;
          position?: number;
          name: string;
          sets?: number | null;
          reps?: string | null;
          weight?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          workout_id?: string;
          position?: number;
          name?: string;
          sets?: number | null;
          reps?: string | null;
          weight?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          activity_id: string | null;
          owner_id: string;
          title: string | null;
          performed_at: string;
          duration_minutes: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id?: string | null;
          owner_id: string;
          title?: string | null;
          performed_at?: string;
          duration_minutes?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string | null;
          owner_id?: string;
          title?: string | null;
          performed_at?: string;
          duration_minutes?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      add_reminder_recipients: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      admin_accounts: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      admin_stats: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      are_connected: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_availability: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      is_activity_shared_with: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      is_admin: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      is_username_available: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      owns_activity: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      search_profile_by_email: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      shares_calendar_details: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      dimension: "fisica" | "emocional" | "social" | "intelectual" | "espiritual" | "financiera" | "ocupacional";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
