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
import {
  getRecentActiveTasks,
  getTaskOptions,
  getTaskQueryContext,
} from "@/lib/tasks/queries";

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

async function getTaskSummariesByIds(
  context: FocusQueryContext,
  taskIds: string[],
) {
  if (taskIds.length === 0) {
    return [];
  }

  const [options, tasksResult] = await Promise.all([
    getTaskOptions(context),
    context.supabase
      .from("tasks")
      .select(
        "id,title,status,priority,estimated_minutes,planned_date,project_id",
      )
      .eq("user_id", context.userId)
      .in("id", taskIds),
  ]);

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const projectsById = new Map(
    options.projects.map((project) => [project.id, project.name]),
  );
  const tasksById = new Map(
    (tasksResult.data ?? []).map((task) => [
      task.id,
      toTaskSummary({
        ...task,
        project_name: task.project_id
          ? (projectsById.get(task.project_id) ?? null)
          : null,
      }),
    ]),
  );

  return taskIds
    .map((taskId) => tasksById.get(taskId) ?? null)
    .filter((task): task is FocusTaskSummary => task !== null);
}

async function getFocusSessionTaskIds(
  context: FocusQueryContext,
  sessionId: string,
) {
  const { data, error } = await context.supabase
    .from("focus_session_tasks")
    .select("task_id")
    .eq("user_id", context.userId)
    .eq("focus_session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((link) => link.task_id);
}

async function getFocusSessionTasks(
  context: FocusQueryContext,
  row: FocusSessionRow,
) {
  const linkedTaskIds = await getFocusSessionTaskIds(context, row.id);
  const taskIds = linkedTaskIds.length > 0 ? linkedTaskIds : [];

  if (taskIds.length === 0 && row.task_id) {
    taskIds.push(row.task_id);
  }

  return getTaskSummariesByIds(context, taskIds);
}

export async function getFocusSessionSnapshot(
  row: FocusSessionRow,
  context: FocusQueryContext,
): Promise<FocusSessionSnapshot> {
  const tasks = await getFocusSessionTasks(context, row);
  const task = tasks[0] ?? null;

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
    taskId: row.task_id ?? task?.id ?? null,
    tasks,
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
