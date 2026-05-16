"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { TaskActionState } from "@/lib/tasks/action-state";
import { getDateInTimeZone } from "@/lib/tasks/date";
import {
  getFirstIssueMessage,
  getRequiredTaskId,
  parseTaskFormData,
  type TaskFormValues,
} from "@/lib/tasks/form";
import {
  getTaskModalData,
  getTaskQueryContext,
  getUserTimezone,
} from "@/lib/tasks/queries";
import type { TaskModalData, TaskRow } from "@/lib/tasks/types";

const TASK_REVALIDATE_PATHS = [
  "/app/today",
  "/app/inbox",
  "/app/tasks",
  "/app/planner",
];

function successState(message: string, taskId?: string): TaskActionState {
  return {
    message,
    status: "success",
    taskId,
  };
}

function errorState(message: string): TaskActionState {
  return {
    message,
    status: "error",
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Try again.";
}

function getStatusForTask(values: TaskFormValues, currentTask?: TaskRow) {
  if (currentTask?.status === "completed") {
    return "completed";
  }

  return values.planned_date ? "planned" : "inbox";
}

function revalidateTaskPaths(taskId?: string) {
  TASK_REVALIDATE_PATHS.forEach((path) => revalidatePath(path));

  if (taskId) {
    revalidatePath(`/app/tasks/${taskId}`);
  }
}

async function recordTaskEvent(
  context: Awaited<ReturnType<typeof getTaskQueryContext>>,
  taskId: string | null,
  eventType: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  const { error } = await context.supabase.from("task_events").insert({
    event_type: eventType,
    metadata: metadata ?? null,
    task_id: taskId,
    user_id: context.userId,
  });

  if (error) {
    console.error(`Failed to record task event: ${error.message}`);
  }
}

async function getTaskOrThrow(
  context: Awaited<ReturnType<typeof getTaskQueryContext>>,
  taskId: string,
) {
  const { data, error } = await context.supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Task not found.");
  }

  return data;
}

async function createTask(values: TaskFormValues) {
  const context = await getTaskQueryContext();
  const status = getStatusForTask(values);
  const { data, error } = await context.supabase
    .from("tasks")
    .insert({
      ...values,
      status,
      user_id: context.userId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await recordTaskEvent(context, data.id, "created", {
    planned_date: values.planned_date,
    status,
  });

  if (values.planned_date) {
    await recordTaskEvent(context, data.id, "planned", {
      planned_date: values.planned_date,
    });
  }

  revalidateTaskPaths(data.id);

  return data.id;
}

async function updateTask(taskId: string, values: TaskFormValues) {
  const context = await getTaskQueryContext();
  const currentTask = await getTaskOrThrow(context, taskId);
  const status = getStatusForTask(values, currentTask);
  const { error } = await context.supabase
    .from("tasks")
    .update({
      ...values,
      status,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  const eventType =
    currentTask.planned_date !== values.planned_date
      ? "rescheduled"
      : "updated";

  await recordTaskEvent(context, taskId, eventType, {
    planned_date: values.planned_date,
    status,
  });

  revalidateTaskPaths(taskId);
}

async function toggleTaskCompletion(taskId: string) {
  const context = await getTaskQueryContext();
  const currentTask = await getTaskOrThrow(context, taskId);
  const isCompleted = currentTask.status === "completed";
  const nextStatus = isCompleted
    ? currentTask.planned_date
      ? "planned"
      : "inbox"
    : "completed";
  const completedAt = isCompleted ? null : new Date().toISOString();
  const { error } = await context.supabase
    .from("tasks")
    .update({
      completed_at: completedAt,
      status: nextStatus,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await recordTaskEvent(
    context,
    taskId,
    isCompleted ? "updated" : "completed",
    {
      status: nextStatus,
    },
  );
  revalidateTaskPaths(taskId);
}

async function planTaskForToday(taskId: string) {
  const context = await getTaskQueryContext();
  const [currentTask, timezone] = await Promise.all([
    getTaskOrThrow(context, taskId),
    getUserTimezone(context),
  ]);
  const todayDate = getDateInTimeZone(new Date(), timezone);
  const nextStatus =
    currentTask.status === "completed" ? "completed" : "planned";
  const { error } = await context.supabase
    .from("tasks")
    .update({
      planned_date: todayDate,
      status: nextStatus,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await recordTaskEvent(
    context,
    taskId,
    currentTask.planned_date ? "rescheduled" : "planned",
    {
      planned_date: todayDate,
      status: nextStatus,
    },
  );
  revalidateTaskPaths(taskId);
}

async function unplanTask(taskId: string) {
  const context = await getTaskQueryContext();
  const currentTask = await getTaskOrThrow(context, taskId);
  const nextStatus = currentTask.status === "completed" ? "completed" : "inbox";
  const { error } = await context.supabase
    .from("tasks")
    .update({
      planned_date: null,
      status: nextStatus,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await recordTaskEvent(context, taskId, "rescheduled", {
    planned_date: null,
    status: nextStatus,
  });
  revalidateTaskPaths(taskId);
}

async function archiveTask(taskId: string) {
  const context = await getTaskQueryContext();
  await getTaskOrThrow(context, taskId);
  const { error } = await context.supabase
    .from("tasks")
    .update({
      archived_at: new Date().toISOString(),
      status: "archived",
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await recordTaskEvent(context, taskId, "archived", {
    status: "archived",
  });
  revalidateTaskPaths(taskId);
}

async function deleteTask(taskId: string) {
  const context = await getTaskQueryContext();
  await getTaskOrThrow(context, taskId);
  await recordTaskEvent(context, taskId, "deleted");
  const { error } = await context.supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateTaskPaths(taskId);
}

export async function loadTaskModalDataAction(): Promise<TaskModalData> {
  return getTaskModalData();
}

export async function createTaskAction(
  _previousState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = parseTaskFormData(formData);

  if (!parsed.success) {
    return errorState(getFirstIssueMessage(parsed.error));
  }

  try {
    const taskId = await createTask(parsed.data);
    return successState("Task created.", taskId);
  } catch (error) {
    return errorState(getErrorMessage(error));
  }
}

export async function updateTaskAction(
  _previousState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const taskId = getRequiredTaskId(formData);

  if (!taskId) {
    return errorState("Task not found.");
  }

  const parsed = parseTaskFormData(formData);

  if (!parsed.success) {
    return errorState(getFirstIssueMessage(parsed.error));
  }

  try {
    await updateTask(taskId, parsed.data);
    return successState("Task updated.", taskId);
  } catch (error) {
    return errorState(getErrorMessage(error));
  }
}

export async function toggleTaskCompletionAction(formData: FormData) {
  const taskId = getRequiredTaskId(formData);

  if (!taskId) {
    throw new Error("Task not found.");
  }

  await toggleTaskCompletion(taskId);
}

export async function planTaskForTodayAction(formData: FormData) {
  const taskId = getRequiredTaskId(formData);

  if (!taskId) {
    throw new Error("Task not found.");
  }

  await planTaskForToday(taskId);
}

export async function unplanTaskAction(formData: FormData) {
  const taskId = getRequiredTaskId(formData);

  if (!taskId) {
    throw new Error("Task not found.");
  }

  await unplanTask(taskId);
}

export async function archiveTaskAction(formData: FormData) {
  const taskId = getRequiredTaskId(formData);

  if (!taskId) {
    throw new Error("Task not found.");
  }

  await archiveTask(taskId);
}

export async function deleteTaskAction(formData: FormData) {
  const taskId = getRequiredTaskId(formData);

  if (!taskId) {
    throw new Error("Task not found.");
  }

  await deleteTask(taskId);
}

export async function deleteTaskAndRedirectAction(formData: FormData) {
  await deleteTaskAction(formData);
  redirect("/app/tasks");
}
