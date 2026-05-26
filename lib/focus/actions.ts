"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_FOCUS_DURATION_SECONDS } from "@/lib/focus/time";
import type {
  CompleteFocusSessionInput,
  FocusActionResult,
} from "@/lib/focus/types";
import { getFocusBootstrapData } from "@/lib/focus/queries";
import { getTaskQueryContext } from "@/lib/tasks/queries";

const focusSessionTypeSchema = z.enum(["pomodoro", "deep_work"]);

const completeFocusSessionSchema = z.object({
  breakSeconds: z
    .number()
    .int()
    .min(1)
    .max(MAX_FOCUS_DURATION_SECONDS)
    .nullable()
    .optional(),
  elapsedSeconds: z.number().int().min(1),
  endedAt: z.string().datetime(),
  plannedSeconds: z.number().int().min(1).max(MAX_FOCUS_DURATION_SECONDS),
  sessionType: focusSessionTypeSchema,
  startedAt: z.string().datetime(),
  taskIds: z.array(z.string().uuid()).max(12).optional(),
});

const FOCUS_REVALIDATE_PATHS = ["/app/focus", "/app/today", "/app/tasks"];

function revalidateFocusPaths(taskIds?: string[]) {
  FOCUS_REVALIDATE_PATHS.forEach((path) => revalidatePath(path));

  new Set(taskIds ?? []).forEach((taskId) => {
    revalidatePath(`/app/tasks/${taskId}`);
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to update focus session.";
}

async function getTaskIdsOrThrow(
  context: Awaited<ReturnType<typeof getTaskQueryContext>>,
  taskIds: string[],
) {
  const uniqueTaskIds = Array.from(new Set(taskIds));

  if (uniqueTaskIds.length === 0) {
    return [];
  }

  const { data, error } = await context.supabase
    .from("tasks")
    .select("id")
    .eq("user_id", context.userId)
    .is("archived_at", null)
    .in("status", ["inbox", "planned", "in_progress", "completed"])
    .in("id", uniqueTaskIds);

  if (error) {
    throw new Error(error.message);
  }

  const ownedTaskIds = new Set((data ?? []).map((task) => task.id));

  if (ownedTaskIds.size !== uniqueTaskIds.length) {
    throw new Error("One or more tasks could not be focused.");
  }

  return uniqueTaskIds;
}

function getDurationMinutes(seconds: number) {
  return seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : null;
}

export async function loadFocusBootstrapAction() {
  return getFocusBootstrapData();
}

export async function completeFocusSessionAction(
  input: CompleteFocusSessionInput,
): Promise<FocusActionResult> {
  const parsed = completeFocusSessionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: "Use a valid completed focus session.",
      status: "error",
    };
  }

  try {
    const context = await getTaskQueryContext();
    const values = parsed.data;
    const taskIds = await getTaskIdsOrThrow(context, values.taskIds ?? []);
    const primaryTaskId = taskIds[0] ?? null;

    const { data, error } = await context.supabase
      .from("focus_sessions")
      .insert({
        active_started_at: null,
        break_seconds:
          values.sessionType === "pomodoro"
            ? (values.breakSeconds ?? null)
            : null,
        duration_minutes: getDurationMinutes(values.elapsedSeconds),
        elapsed_seconds: values.elapsedSeconds,
        ended_at: values.endedAt,
        planned_minutes: getDurationMinutes(values.plannedSeconds),
        planned_seconds: values.plannedSeconds,
        session_type: values.sessionType,
        started_at: values.startedAt,
        status: "completed",
        task_id: primaryTaskId,
        user_id: context.userId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (taskIds.length > 0) {
      const { error: linkError } = await context.supabase
        .from("focus_session_tasks")
        .insert(
          taskIds.map((taskId, index) => ({
            focus_session_id: data.id,
            sort_order: index,
            task_id: taskId,
            user_id: context.userId,
          })),
        );

      if (linkError) {
        await context.supabase
          .from("focus_sessions")
          .delete()
          .eq("user_id", context.userId)
          .eq("id", data.id);

        throw new Error(linkError.message);
      }
    }

    revalidateFocusPaths(taskIds);

    return {
      session: null,
      status: "success",
    };
  } catch (error) {
    return {
      message: getErrorMessage(error),
      status: "error",
    };
  }
}
