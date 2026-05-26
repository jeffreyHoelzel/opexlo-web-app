import type { TaskFormOptions, TaskListItem, TaskRow } from "@/lib/tasks/types";
import { getDateInTimeZone } from "@/lib/tasks/date";
import {
  getTaskOptions,
  getTaskQueryContext,
  getUserTimezone,
} from "@/lib/tasks/queries";
import {
  getBlockDurationMinutes,
  getLocalDateTimeParts,
  getLocalDayRange,
  isValidIsoDate,
} from "@/lib/time-blocks/time";
import type {
  TimeBlockDayData,
  TimeBlockItem,
  TimeBlockTaskOption,
  TimeBlockTaskSummary,
} from "@/lib/time-blocks/types";

type TimeBlockQueryContext = Awaited<ReturnType<typeof getTaskQueryContext>>;

function mapOptions(rows: TaskFormOptions["areas"]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function withTaskLinks(
  tasks: TaskRow[],
  options: TaskFormOptions,
): TaskListItem[] {
  const areasById = mapOptions(options.areas);
  const goalsById = mapOptions(options.goals);
  const projectsById = mapOptions(options.projects);

  return tasks.map((task) => ({
    ...task,
    area_name: task.area_id
      ? (areasById.get(task.area_id)?.name ?? null)
      : null,
    goal_title: task.goal_id
      ? (goalsById.get(task.goal_id)?.name ?? null)
      : null,
    project_name: task.project_id
      ? (projectsById.get(task.project_id)?.name ?? null)
      : null,
  }));
}

function toTaskSummary(
  task: {
    estimated_minutes: number | null;
    id: string;
    planned_date: string | null;
    priority: string;
    project_id: string | null;
    status: string;
    title: string;
  },
  projectsById: Map<string, string>,
): TimeBlockTaskSummary {
  return {
    estimated_minutes: task.estimated_minutes,
    id: task.id,
    planned_date: task.planned_date,
    priority: task.priority,
    project_name: task.project_id
      ? (projectsById.get(task.project_id) ?? null)
      : null,
    status: task.status,
    title: task.title,
  };
}

async function getTasksForDate(
  context: TimeBlockQueryContext,
  options: TaskFormOptions,
  date: string,
) {
  const { data, error } = await context.supabase
    .from("tasks")
    .select("*")
    .eq("planned_date", date)
    .is("archived_at", null)
    .neq("status", "archived")
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return withTaskLinks(data ?? [], options);
}

async function getTaskOptionsForBlocks(
  context: TimeBlockQueryContext,
  options: TaskFormOptions,
) {
  const { data, error } = await context.supabase
    .from("tasks")
    .select(
      "id,title,status,priority,estimated_minutes,planned_date,project_id",
    )
    .eq("user_id", context.userId)
    .is("archived_at", null)
    .neq("status", "archived")
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const projectsById = new Map(
    options.projects.map((project) => [project.id, project.name]),
  );

  return (data ?? []).map((task) => toTaskSummary(task, projectsById));
}

async function getActualMinutesByTaskId(
  context: TimeBlockQueryContext,
  startAt: string,
  endAt: string,
) {
  const { data, error } = await context.supabase
    .from("focus_sessions")
    .select("task_id,duration_minutes,elapsed_seconds")
    .eq("user_id", context.userId)
    .eq("status", "completed")
    .not("task_id", "is", null)
    .gte("started_at", startAt)
    .lt("started_at", endAt);

  if (error) {
    throw new Error(error.message);
  }

  const minutesByTaskId = new Map<string, number>();

  for (const session of data ?? []) {
    if (!session.task_id) {
      continue;
    }

    const minutes =
      session.duration_minutes ?? Math.ceil(session.elapsed_seconds / 60);
    minutesByTaskId.set(
      session.task_id,
      (minutesByTaskId.get(session.task_id) ?? 0) + minutes,
    );
  }

  return minutesByTaskId;
}

function mapTimeBlocks({
  actualMinutesByTaskId,
  blocks,
  date,
  tasksById,
  timezone,
}: {
  actualMinutesByTaskId: Map<string, number>;
  blocks: Array<{
    created_at: string;
    daily_plan_id: string | null;
    end_at: string;
    id: string;
    start_at: string;
    task_id: string | null;
    title: string;
    updated_at: string;
    user_id: string;
  }>;
  date: string;
  tasksById: Map<string, TimeBlockTaskOption>;
  timezone: string;
}): TimeBlockItem[] {
  return blocks.map((block) => {
    const start = getLocalDateTimeParts(block.start_at, timezone);
    const end = getLocalDateTimeParts(block.end_at, timezone);
    const task = block.task_id ? (tasksById.get(block.task_id) ?? null) : null;

    return {
      ...block,
      actual_minutes: block.task_id
        ? (actualMinutesByTaskId.get(block.task_id) ?? 0)
        : null,
      duration_minutes: getBlockDurationMinutes(block.start_at, block.end_at),
      end_minutes:
        end.date > date ? 24 * 60 : end.date < date ? 0 : end.minutes,
      end_time: end.time,
      local_date: date,
      start_minutes:
        start.date < date ? 0 : start.date > date ? 24 * 60 : start.minutes,
      start_time: start.time,
      task,
    };
  });
}

export async function getTimeBlockDayData({
  context,
  date,
}: {
  context?: TimeBlockQueryContext;
  date?: string;
} = {}): Promise<TimeBlockDayData> {
  const timeBlockContext = context ?? (await getTaskQueryContext());
  const [options, timezone] = await Promise.all([
    getTaskOptions(timeBlockContext),
    getUserTimezone(timeBlockContext),
  ]);
  const todayDate = getDateInTimeZone(new Date(), timezone);
  const resolvedDate = date && isValidIsoDate(date) ? date : todayDate;
  const dayRange = getLocalDayRange(resolvedDate, timezone);

  if (!dayRange) {
    throw new Error("Use a valid schedule date.");
  }

  const [tasks, blocksResult, taskOptions, actualMinutesByTaskId] =
    await Promise.all([
      getTasksForDate(timeBlockContext, options, resolvedDate),
      timeBlockContext.supabase
        .from("time_blocks")
        .select("*")
        .eq("user_id", timeBlockContext.userId)
        .lt("start_at", dayRange.endAt)
        .gt("end_at", dayRange.startAt)
        .order("start_at", { ascending: true }),
      getTaskOptionsForBlocks(timeBlockContext, options),
      getActualMinutesByTaskId(
        timeBlockContext,
        dayRange.startAt,
        dayRange.endAt,
      ),
    ]);

  if (blocksResult.error) {
    throw new Error(blocksResult.error.message);
  }

  const taskOptionsById = new Map(taskOptions.map((task) => [task.id, task]));
  const blocks = mapTimeBlocks({
    actualMinutesByTaskId,
    blocks: blocksResult.data ?? [],
    date: resolvedDate,
    tasksById: taskOptionsById,
    timezone,
  });
  const blockedTaskIds = new Set(
    blocks
      .map((block) => block.task_id)
      .filter((taskId): taskId is string => Boolean(taskId)),
  );

  return {
    blocks,
    date: resolvedDate,
    taskOptions,
    tasks,
    timezone,
    unblockedTasks: tasks.filter((task) => !blockedTaskIds.has(task.id)),
  };
}

export async function getTaskTimeBlockDayData(taskId: string) {
  const context = await getTaskQueryContext();
  const timezone = await getUserTimezone(context);
  const todayDate = getDateInTimeZone(new Date(), timezone);
  const { data, error } = await context.supabase
    .from("tasks")
    .select("id,planned_date")
    .eq("user_id", context.userId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return getTimeBlockDayData({
    context,
    date: data.planned_date ?? todayDate,
  });
}
