export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      areas: {
        Row: {
          archived_at: string | null;
          color: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_plan_items: {
        Row: {
          created_at: string;
          daily_plan_id: string;
          id: string;
          is_top_priority: boolean;
          planned_minutes: number | null;
          sort_order: number;
          task_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          daily_plan_id: string;
          id?: string;
          is_top_priority?: boolean;
          planned_minutes?: number | null;
          sort_order?: number;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          daily_plan_id?: string;
          id?: string;
          is_top_priority?: boolean;
          planned_minutes?: number | null;
          sort_order?: number;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_plans: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          plan_date: string;
          planned_end_time: string | null;
          planned_start_time: string | null;
          shutdown_completed_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          plan_date: string;
          planned_end_time?: string | null;
          planned_start_time?: string | null;
          shutdown_completed_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          plan_date?: string;
          planned_end_time?: string | null;
          planned_start_time?: string | null;
          shutdown_completed_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      focus_sessions: {
        Row: {
          active_started_at: string | null;
          break_seconds: number | null;
          created_at: string;
          duration_minutes: number | null;
          elapsed_seconds: number;
          ended_at: string | null;
          id: string;
          planned_minutes: number | null;
          planned_seconds: number | null;
          session_type: string;
          started_at: string;
          status: string;
          task_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_started_at?: string | null;
          break_seconds?: number | null;
          created_at?: string;
          duration_minutes?: number | null;
          elapsed_seconds?: number;
          ended_at?: string | null;
          id?: string;
          planned_minutes?: number | null;
          planned_seconds?: number | null;
          session_type?: string;
          started_at: string;
          status?: string;
          task_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_started_at?: string | null;
          break_seconds?: number | null;
          created_at?: string;
          duration_minutes?: number | null;
          elapsed_seconds?: number;
          ended_at?: string | null;
          id?: string;
          planned_minutes?: number | null;
          planned_seconds?: number | null;
          session_type?: string;
          started_at?: string;
          status?: string;
          task_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      focus_session_tasks: {
        Row: {
          created_at: string;
          focus_session_id: string;
          id: string;
          sort_order: number;
          task_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          focus_session_id: string;
          id?: string;
          sort_order?: number;
          task_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          focus_session_id?: string;
          id?: string;
          sort_order?: number;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          area_id: string | null;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          id: string;
          status: string;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          area_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          status?: string;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          area_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          status?: string;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id?: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          archived_at: string | null;
          area_id: string | null;
          color: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          area_id?: string | null;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          area_id?: string | null;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          area_id: string | null;
          archived_at: string | null;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          estimated_minutes: number | null;
          goal_id: string | null;
          id: string;
          planned_date: string | null;
          priority: string;
          project_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          area_id?: string | null;
          archived_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          estimated_minutes?: number | null;
          goal_id?: string | null;
          id?: string;
          planned_date?: string | null;
          priority?: string;
          project_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          area_id?: string | null;
          archived_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          estimated_minutes?: number | null;
          goal_id?: string | null;
          id?: string;
          planned_date?: string | null;
          priority?: string;
          project_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      time_blocks: {
        Row: {
          created_at: string;
          daily_plan_id: string | null;
          end_at: string;
          id: string;
          start_at: string;
          task_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_plan_id?: string | null;
          end_at: string;
          id?: string;
          start_at: string;
          task_id?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_plan_id?: string | null;
          end_at?: string;
          id?: string;
          start_at?: string;
          task_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      task_events: {
        Row: {
          created_at: string;
          event_timestamp: string;
          event_type: string;
          id: string;
          metadata: Json | null;
          task_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_timestamp?: string;
          event_type: string;
          id?: string;
          metadata?: Json | null;
          task_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_timestamp?: string;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
          task_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          created_at: string;
          daily_planning_reminders_enabled: boolean;
          default_break_minutes: number;
          default_focus_minutes: number;
          default_planning_reminder_time: string | null;
          default_shutdown_reminder_time: string | null;
          email_reminders_enabled: boolean;
          id: string;
          shutdown_reminders_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_planning_reminders_enabled?: boolean;
          default_break_minutes?: number;
          default_focus_minutes?: number;
          default_planning_reminder_time?: string | null;
          default_shutdown_reminder_time?: string | null;
          email_reminders_enabled?: boolean;
          id?: string;
          shutdown_reminders_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_planning_reminders_enabled?: boolean;
          default_break_minutes?: number;
          default_focus_minutes?: number;
          default_planning_reminder_time?: string | null;
          default_shutdown_reminder_time?: string | null;
          email_reminders_enabled?: boolean;
          id?: string;
          shutdown_reminders_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
