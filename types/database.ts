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
          user_id: string;
          full_name: string | null;
          email: string;
          avatar_url: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          email: string;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          email?: string;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status:
            | "inbox"
            | "planned"
            | "in_progress"
            | "completed"
            | "archived";
          priority: "low" | "medium" | "high" | "urgent";
          due_date: string | null;
          planned_date: string | null;
          estimated_minutes: number | null;
          completed_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          status?:
            | "inbox"
            | "planned"
            | "in_progress"
            | "completed"
            | "archived";
          priority?: "low" | "medium" | "high" | "urgent";
          due_date?: string | null;
          planned_date?: string | null;
          estimated_minutes?: number | null;
          completed_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          status?:
            | "inbox"
            | "planned"
            | "in_progress"
            | "completed"
            | "archived";
          priority?: "low" | "medium" | "high" | "urgent";
          due_date?: string | null;
          planned_date?: string | null;
          estimated_minutes?: number | null;
          completed_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          default_planning_reminder_time: string | null;
          default_shutdown_reminder_time: string | null;
          email_reminders_enabled: boolean;
          daily_planning_reminders_enabled: boolean;
          shutdown_reminders_enabled: boolean;
          default_focus_minutes: number;
          default_break_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_planning_reminder_time?: string | null;
          default_shutdown_reminder_time?: string | null;
          email_reminders_enabled?: boolean;
          daily_planning_reminders_enabled?: boolean;
          shutdown_reminders_enabled?: boolean;
          default_focus_minutes?: number;
          default_break_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          default_planning_reminder_time?: string | null;
          default_shutdown_reminder_time?: string | null;
          email_reminders_enabled?: boolean;
          daily_planning_reminders_enabled?: boolean;
          shutdown_reminders_enabled?: boolean;
          default_focus_minutes?: number;
          default_break_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
