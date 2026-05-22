"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DEFAULT_POMODORO_BREAK_SECONDS,
  MAX_DEEP_WORK_DURATION_SECONDS,
  MAX_FOCUS_DURATION_SECONDS,
  MAX_POMODORO_BREAK_SECONDS,
  MAX_POMODORO_DURATION_SECONDS,
  getFocusSessionElapsedSeconds,
} from "@/lib/focus/time";
import type {
  FocusActionResult,
  FocusSessionRow,
  FocusSessionUpdate,
  StartFocusSessionInput,
} from "@/lib/focus/types";
import {
  getFocusBootstrapData,
  getFocusSessionSnapshot,
  getOpenFocusSession,
} from "@/lib/focus/queries";
import { getTaskQueryContext } from "@/lib/tasks/queries";

const focusSessionTypeSchema = z.enum(["pomodoro", "deep_work"]);

const startFocusSessionSchema = z.object({
  breakSeconds: z
    .number()
    .int()
    .min(1)
    .max(MAX_POMODORO_BREAK_SECONDS)
    .nullable()
    .optional(),
  plannedSeconds: z
    .number()
    .int()
    .min(1)
    .max(MAX_FOCUS_DURATION_SECONDS)
    .nullable()
    .optional(),
  sessionType: focusSessionTypeSchema.default("pomodoro"),
  taskId: z.string().uuid().nullable().optional(),
});

const FOCUS_REVALIDATE_PATHS = ["/app/focus", "/app/today", "/app/tasks"];

function revalidateFocusPaths(taskId?: string | null) {
  FOCUS_REVALIDATE_PATHS.forEach((path) => revalidatePath(path));

  if (taskId) {
    revalidatePath(`/app/tasks/${taskId}`);
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to update focus session.";
}

async function getOwnedOpenSessionOrThrow(
  context: Awaited<ReturnType<typeof getTaskQueryContext>>,
  sessionId: string,
) {
  const { data, error } = await context.supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", context.userId)
    .eq("id", sessionId)
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Focus session not found.");
  }

  return data;
}

async function getTaskIdOrThrow(
  context: Awaited<ReturnType<typeof getTaskQueryContext>>,
  taskId: string | null | undefined,
) {
  if (!taskId) {
    return null;
  }

  const { data, error } = await context.supabase
    .from("tasks")
    .select("id")
    .eq("user_id", context.userId)
    .eq("id", taskId)
    .is("archived_at", null)
    .neq("status", "archived")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Task not found.");
  }

  return data.id;
}

function getDurationMinutes(seconds: number) {
  return seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : null;
}

async function updateOpenSession(
  row: FocusSessionRow,
  values: FocusSessionUpdate,
) {
  const context = await getTaskQueryContext();
  const { data, error } = await context.supabase
    .from("focus_sessions")
    .update(values)
    .eq("user_id", context.userId)
    .eq("id", row.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidateFocusPaths(data.task_id);

  return getFocusSessionSnapshot(data, context);
}

export async function loadFocusBootstrapAction() {
  return getFocusBootstrapData();
}

export async function startFocusSessionAction(
  input: StartFocusSessionInput,
): Promise<FocusActionResult> {
  const parsed = startFocusSessionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: "Use a valid focus duration.",
      status: "error",
    };
  }

  try {
    const context = await getTaskQueryContext();
    const existingSession = await getOpenFocusSession(context);

    if (existingSession) {
      return {
        message: "A focus session is already running.",
        session: existingSession,
        status: "success",
      };
    }

    const values = parsed.data;
    const taskId = await getTaskIdOrThrow(context, values.taskId);
    const now = new Date().toISOString();
    const plannedSeconds = values.plannedSeconds;
    const breakSeconds =
      values.sessionType === "pomodoro"
        ? (values.breakSeconds ?? DEFAULT_POMODORO_BREAK_SECONDS)
        : null;

    if (!plannedSeconds) {
      return {
        message: "Choose a focus duration.",
        status: "error",
      };
    }

    if (
      values.sessionType === "pomodoro" &&
      plannedSeconds > MAX_POMODORO_DURATION_SECONDS
    ) {
      return {
        message: "Pomodoro sessions can be up to 00:55:00.",
        status: "error",
      };
    }

    if (
      values.sessionType === "deep_work" &&
      plannedSeconds > MAX_DEEP_WORK_DURATION_SECONDS
    ) {
      return {
        message: "Deep Work sessions can be up to 12:00:00.",
        status: "error",
      };
    }

    const { data, error } = await context.supabase
      .from("focus_sessions")
      .insert({
        active_started_at: now,
        break_seconds: breakSeconds,
        elapsed_seconds: 0,
        planned_minutes: getDurationMinutes(plannedSeconds),
        planned_seconds: plannedSeconds,
        session_type: values.sessionType,
        started_at: now,
        status: "active",
        task_id: taskId,
        user_id: context.userId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    revalidateFocusPaths(taskId);

    return {
      session: await getFocusSessionSnapshot(data, context),
      status: "success",
    };
  } catch (error) {
    return {
      message: getErrorMessage(error),
      status: "error",
    };
  }
}

export async function pauseFocusSessionAction(
  sessionId: string,
): Promise<FocusActionResult> {
  try {
    const context = await getTaskQueryContext();
    const row = await getOwnedOpenSessionOrThrow(context, sessionId);

    if (row.status !== "active") {
      return {
        session: await getFocusSessionSnapshot(row, context),
        status: "success",
      };
    }

    const elapsedSeconds = getFocusSessionElapsedSeconds(
      await getFocusSessionSnapshot(row, context),
    );

    return {
      session: await updateOpenSession(row, {
        active_started_at: null,
        elapsed_seconds: elapsedSeconds,
        status: "paused",
      }),
      status: "success",
    };
  } catch (error) {
    return {
      message: getErrorMessage(error),
      status: "error",
    };
  }
}

export async function resumeFocusSessionAction(
  sessionId: string,
): Promise<FocusActionResult> {
  try {
    const context = await getTaskQueryContext();
    const row = await getOwnedOpenSessionOrThrow(context, sessionId);

    if (row.status !== "paused") {
      return {
        session: await getFocusSessionSnapshot(row, context),
        status: "success",
      };
    }

    return {
      session: await updateOpenSession(row, {
        active_started_at: new Date().toISOString(),
        status: "active",
      }),
      status: "success",
    };
  } catch (error) {
    return {
      message: getErrorMessage(error),
      status: "error",
    };
  }
}

export async function completeFocusSessionAction(
  sessionId: string,
): Promise<FocusActionResult> {
  try {
    const context = await getTaskQueryContext();
    const row = await getOwnedOpenSessionOrThrow(context, sessionId);
    const snapshot = await getFocusSessionSnapshot(row, context);
    const elapsedSeconds = getFocusSessionElapsedSeconds(snapshot);

    await updateOpenSession(row, {
      active_started_at: null,
      duration_minutes: getDurationMinutes(elapsedSeconds),
      elapsed_seconds: elapsedSeconds,
      ended_at: new Date().toISOString(),
      status: "completed",
    });

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

export async function cancelFocusSessionAction(
  sessionId: string,
): Promise<FocusActionResult> {
  try {
    const context = await getTaskQueryContext();
    const row = await getOwnedOpenSessionOrThrow(context, sessionId);
    const snapshot = await getFocusSessionSnapshot(row, context);
    const elapsedSeconds = getFocusSessionElapsedSeconds(snapshot);

    await updateOpenSession(row, {
      active_started_at: null,
      duration_minutes: null,
      elapsed_seconds: elapsedSeconds,
      ended_at: new Date().toISOString(),
      status: "cancelled",
    });

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
