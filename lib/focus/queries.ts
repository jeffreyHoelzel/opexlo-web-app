import type {
  FocusBootstrapData,
  FocusSessionRow,
  FocusSessionSnapshot,
  FocusSessionStatus,
  FocusSessionType,
  FocusTaskSummary,
} from "@/lib/focus/types";
import {
  DEFAULT_POMODORO_BREAK_SECONDS,
  MAX_POMODORO_BREAK_SECONDS,
} from "@/lib/focus/time";
import { getRecentActiveTasks, getTaskQueryContext } from "@/lib/tasks/queries";

type FocusQueryContext = Awaited<ReturnType<typeof getTaskQueryContext>>;

const DEFAULT_FOCUS_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = DEFAULT_POMODORO_BREAK_SECONDS / 60;

function toFocusSessionStatus(status: string): FocusSessionStatus {
  if (
    status === "active" ||
    status === "paused" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "cancelled";
}

function toFocusSessionType(sessionType: string): FocusSessionType {
  if (sessionType === "pomodoro" || sessionType === "deep_work") {
    return sessionType;
  }

  return "deep_work";
}

function clampBreakSeconds(value: number) {
  return Math.max(1, Math.min(MAX_POMODORO_BREAK_SECONDS, value));
}

function toTaskSummary(
  task: {
    estimated_minutes: number | null;
    id: string;
    planned_date?: string | null;
    priority: string;
    project_name?: string | null;
    status: string;
    title: string;
  } | null,
): FocusTaskSummary | null {
  if (!task) {
    return null;
  }

  return {
    estimated_minutes: task.estimated_minutes,
    id: task.id,
    planned_date: task.planned_date ?? null,
    priority: task.priority,
    project_name: task.project_name ?? null,
    status: task.status,
    title: task.title,
  };
}

async function getTaskSummaryById(
  context: FocusQueryContext,
  taskId: string | null,
) {
  if (!taskId) {
    return null;
  }

  const { data, error } = await context.supabase
    .from("tasks")
    .select("id,title,status,priority,estimated_minutes,planned_date")
    .eq("user_id", context.userId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return toTaskSummary(data ?? null);
}

export async function getFocusSessionSnapshot(
  row: FocusSessionRow,
  context: FocusQueryContext,
): Promise<FocusSessionSnapshot> {
  const task = await getTaskSummaryById(context, row.task_id);

  return {
    activeStartedAt: row.active_started_at,
    breakSeconds: row.break_seconds,
    elapsedSeconds: row.elapsed_seconds,
    endedAt: row.ended_at,
    id: row.id,
    plannedMinutes: row.planned_minutes,
    plannedSeconds: row.planned_seconds,
    sessionType: toFocusSessionType(row.session_type),
    startedAt: row.started_at,
    status: toFocusSessionStatus(row.status),
    task,
    taskId: row.task_id,
  };
}

export async function getOpenFocusSession(context?: FocusQueryContext) {
  const focusContext = context ?? (await getTaskQueryContext());
  const { data, error } = await focusContext.supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", focusContext.userId)
    .in("status", ["active", "paused"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return getFocusSessionSnapshot(data, focusContext);
}

export async function getFocusBootstrapData(): Promise<FocusBootstrapData> {
  const context = await getTaskQueryContext();
  const [activeSession, preferencesResult, recentTasks] = await Promise.all([
    getOpenFocusSession(context),
    context.supabase
      .from("user_preferences")
      .select("default_focus_minutes,default_break_minutes")
      .eq("user_id", context.userId)
      .maybeSingle(),
    getRecentActiveTasks(12, context),
  ]);

  if (preferencesResult.error) {
    throw new Error(preferencesResult.error.message);
  }

  return {
    activeSession,
    defaultBreakSeconds: clampBreakSeconds(
      (preferencesResult.data?.default_break_minutes ?? DEFAULT_BREAK_MINUTES) *
        60,
    ),
    defaultFocusSeconds:
      (preferencesResult.data?.default_focus_minutes ?? DEFAULT_FOCUS_MINUTES) *
      60,
    recentTasks: recentTasks.map((task) => ({
      estimated_minutes: task.estimated_minutes,
      id: task.id,
      planned_date: task.planned_date,
      priority: task.priority,
      project_name: task.project_name,
      status: task.status,
      title: task.title,
    })),
  };
}
