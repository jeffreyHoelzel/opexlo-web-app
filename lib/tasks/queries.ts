import { redirect } from "next/navigation";

import { getDateInTimeZone } from "@/lib/tasks/date";
import type {
  TaskFormOptions,
  TaskListItem,
  TaskModalData,
  TaskOption,
  TaskRow,
} from "@/lib/tasks/types";
import { createClient } from "@/lib/supabase/server";

type TaskQueryContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

function mapOptions(rows: TaskOption[]) {
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

export async function getTaskQueryContext(): Promise<TaskQueryContext> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return {
    supabase,
    userId: data.user.id,
  };
}

export async function getUserTimezone(context?: TaskQueryContext) {
  const taskContext = context ?? (await getTaskQueryContext());
  const { data } = await taskContext.supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", taskContext.userId)
    .maybeSingle();

  return data?.timezone || "UTC";
}

export async function getTaskOptions(
  context?: TaskQueryContext,
): Promise<TaskFormOptions> {
  const taskContext = context ?? (await getTaskQueryContext());
  const { supabase } = taskContext;

  const [areasResult, projectsResult, goalsResult] = await Promise.all([
    supabase
      .from("areas")
      .select("id,name,color")
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id,name,color")
      .is("archived_at", null)
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("goals")
      .select("id,title")
      .eq("status", "active")
      .order("title", { ascending: true }),
  ]);

  if (areasResult.error) {
    throw new Error(areasResult.error.message);
  }

  if (projectsResult.error) {
    throw new Error(projectsResult.error.message);
  }

  if (goalsResult.error) {
    throw new Error(goalsResult.error.message);
  }

  return {
    areas: areasResult.data ?? [],
    goals:
      goalsResult.data?.map((goal) => ({
        id: goal.id,
        name: goal.title,
      })) ?? [],
    projects: projectsResult.data ?? [],
  };
}

export async function getRecentActiveTasks(
  limit = 8,
  context?: TaskQueryContext,
) {
  const taskContext = context ?? (await getTaskQueryContext());
  const options = await getTaskOptions(taskContext);
  const { data, error } = await taskContext.supabase
    .from("tasks")
    .select("*")
    .is("archived_at", null)
    .in("status", ["inbox", "planned", "in_progress"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return withTaskLinks(data ?? [], options);
}

export async function getTaskModalData(): Promise<TaskModalData> {
  const context = await getTaskQueryContext();
  const [options, recentTasks] = await Promise.all([
    getTaskOptions(context),
    getRecentActiveTasks(8, context),
  ]);

  return {
    options,
    recentTasks,
  };
}

export async function getInboxTasks() {
  const context = await getTaskQueryContext();
  const options = await getTaskOptions(context);
  const { data, error } = await context.supabase
    .from("tasks")
    .select("*")
    .eq("status", "inbox")
    .is("archived_at", null)
    .is("planned_date", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return withTaskLinks(data ?? [], options);
}

export async function getTaskLibrary() {
  const context = await getTaskQueryContext();
  const options = await getTaskOptions(context);
  const { data, error } = await context.supabase
    .from("tasks")
    .select("*")
    .is("archived_at", null)
    .neq("status", "archived")
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return withTaskLinks(data ?? [], options);
}

export async function getTodayTasks() {
  const context = await getTaskQueryContext();
  const [options, timezone] = await Promise.all([
    getTaskOptions(context),
    getUserTimezone(context),
  ]);
  const todayDate = getDateInTimeZone(new Date(), timezone);
  const { data, error } = await context.supabase
    .from("tasks")
    .select("*")
    .eq("planned_date", todayDate)
    .is("archived_at", null)
    .neq("status", "archived")
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    tasks: withTaskLinks(data ?? [], options),
    todayDate,
    timezone,
  };
}

export async function getTaskById(taskId: string) {
  const context = await getTaskQueryContext();
  const options = await getTaskOptions(context);
  const { data, error } = await context.supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    options,
    task: withTaskLinks([data], options)[0],
  };
}
