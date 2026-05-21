import type { Tables, TablesUpdate } from "@/types/database";

export const FOCUS_SESSION_STATUSES = [
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;

export const FOCUS_SESSION_TYPES = [
  "pomodoro",
  "custom",
  "open_focus",
] as const;

export type FocusSessionStatus = (typeof FOCUS_SESSION_STATUSES)[number];
export type FocusSessionType = (typeof FOCUS_SESSION_TYPES)[number];
export type FocusSessionRow = Tables<"focus_sessions">;
export type FocusSessionUpdate = TablesUpdate<"focus_sessions">;

export type FocusTaskSummary = {
  estimated_minutes: number | null;
  id: string;
  planned_date?: string | null;
  priority: string;
  project_name?: string | null;
  status: string;
  title: string;
};

export type FocusSessionSnapshot = {
  activeStartedAt: string | null;
  elapsedSeconds: number;
  endedAt: string | null;
  id: string;
  plannedMinutes: number | null;
  plannedSeconds: number | null;
  sessionType: FocusSessionType;
  startedAt: string;
  status: FocusSessionStatus;
  task: FocusTaskSummary | null;
  taskId: string | null;
};

export type FocusBootstrapData = {
  activeSession: FocusSessionSnapshot | null;
  defaultBreakSeconds: number;
  defaultFocusSeconds: number;
  recentTasks: FocusTaskSummary[];
};

export type StartFocusSessionInput = {
  plannedSeconds?: number | null;
  sessionType?: FocusSessionType;
  taskId?: string | null;
};

export type FocusActionResult =
  | {
      message?: string;
      session: FocusSessionSnapshot | null;
      status: "success";
    }
  | {
      message: string;
      status: "error";
    };
