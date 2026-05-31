"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getLocalDateTimeParts,
  localDateTimeToUtcIso,
  minutesToTimeInput,
  parseTimeToMinutes,
  TIME_BLOCK_STEP_MINUTES,
} from "@/lib/time-blocks/time";
import type {
  TimeBlockActionResult,
  TimeBlockAdjustInput,
  TimeBlockUpsertInput,
} from "@/lib/time-blocks/types";
import { getTaskQueryContext, getUserTimezone } from "@/lib/tasks/queries";

type TimeBlockActionContext = Awaited<ReturnType<typeof getTaskQueryContext>>;

const REVALIDATE_PATHS = ["/app/today", "/app/planner", "/app/tasks"];

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const nullableUuidSchema = z.preprocess(
  normalizeNullableText,
  z.string().uuid("Choose a valid task.").nullable(),
);

const timeBlockSchema = z.object({
  blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid block date."),
  blockId: z.preprocess(
    normalizeNullableText,
    z.string().uuid("Choose a valid time block.").nullable(),
  ),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use a valid end time."),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use a valid start time."),
  taskId: nullableUuidSchema,
  title: z.preprocess(
    normalizeNullableText,
    z.string().max(180, "Keep block titles under 180 characters.").nullable(),
  ),
});

const adjustSchema = z.object({
  blockId: z.string().uuid("Choose a valid time block."),
  endDeltaMinutes: z.number().int().min(-1440).max(1440),
  startDeltaMinutes: z.number().int().min(-1440).max(1440),
});

function successResult(message: string): TimeBlockActionResult {
  return { message, status: "success" };
}

function errorResult(message: string): TimeBlockActionResult {
  return { message, status: "error" };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to update time blocks.";
}

function revalidateTimeBlockPaths(taskIds?: Array<string | null | undefined>) {
  REVALIDATE_PATHS.forEach((path) => revalidatePath(path));

  new Set(
    (taskIds ?? []).filter((taskId): taskId is string => Boolean(taskId)),
  ).forEach((taskId) => revalidatePath(`/app/tasks/${taskId}`));
}

async function recordTaskEvent(
  context: TimeBlockActionContext,
  taskId: string | null,
  eventType: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  if (!taskId) {
    return;
  }

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

async function getTaskForBlock(
  context: TimeBlockActionContext,
  taskId: string | null,
) {
  if (!taskId) {
    return null;
  }

  const { data, error } = await context.supabase
    .from("tasks")
    .select("id,title,status")
    .eq("user_id", context.userId)
    .eq("id", taskId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Task not found.");
  }

  return data;
}

async function getTimeBlockOrThrow(
  context: TimeBlockActionContext,
  blockId: string,
) {
  const { data, error } = await context.supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", context.userId)
    .eq("id", blockId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Time block not found.");
  }

  return data;
}

async function planTaskForBlockDate(
  context: TimeBlockActionContext,
  task: { id: string; status: string } | null,
  blockDate: string,
) {
  if (!task || task.status === "completed") {
    return;
  }

  const { error } = await context.supabase
    .from("tasks")
    .update({
      planned_date: blockDate,
      status: "planned",
    })
    .eq("user_id", context.userId)
    .eq("id", task.id);

  if (error) {
    throw new Error(error.message);
  }

  await recordTaskEvent(context, task.id, "planned", {
    planned_date: blockDate,
    source: "time_block",
    status: "planned",
  });
}

async function saveTimeBlock(
  context: TimeBlockActionContext,
  input: TimeBlockUpsertInput,
) {
  const parsed = timeBlockSchema.safeParse({
    blockDate: input.blockDate,
    blockId: input.blockId ?? null,
    endTime: input.endTime,
    startTime: input.startTime,
    taskId: input.taskId ?? null,
    title: input.title ?? null,
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Use a valid time block.",
    );
  }

  const values = parsed.data;
  const startMinutes = parseTimeToMinutes(values.startTime);
  const endMinutes = parseTimeToMinutes(values.endTime);

  if (startMinutes === null || endMinutes === null) {
    throw new Error("Use valid start and end times.");
  }

  if (endMinutes - startMinutes < TIME_BLOCK_STEP_MINUTES) {
    throw new Error("Time blocks must be at least 15 minutes.");
  }

  const timezone = await getUserTimezone(context);
  const startAt = localDateTimeToUtcIso(
    values.blockDate,
    values.startTime,
    timezone,
  );
  const endAt = localDateTimeToUtcIso(
    values.blockDate,
    values.endTime,
    timezone,
  );

  if (!startAt || !endAt) {
    throw new Error("Use a valid schedule date and time.");
  }

  const task = await getTaskForBlock(context, values.taskId);
  const title = values.title ?? task?.title ?? null;

  if (!title) {
    throw new Error("Add a title or choose a task.");
  }

  if (values.blockId) {
    const currentBlock = await getTimeBlockOrThrow(context, values.blockId);
    const { error } = await context.supabase
      .from("time_blocks")
      .update({
        end_at: endAt,
        start_at: startAt,
        task_id: task?.id ?? null,
        title,
      })
      .eq("user_id", context.userId)
      .eq("id", values.blockId);

    if (error) {
      throw new Error(error.message);
    }

    await planTaskForBlockDate(context, task, values.blockDate);
    revalidateTimeBlockPaths([currentBlock.task_id, task?.id]);
    return "Time block updated.";
  }

  const { error } = await context.supabase.from("time_blocks").insert({
    end_at: endAt,
    start_at: startAt,
    task_id: task?.id ?? null,
    title,
    user_id: context.userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  await planTaskForBlockDate(context, task, values.blockDate);
  revalidateTimeBlockPaths([task?.id]);
  return "Time block created.";
}

export async function upsertTimeBlockAction(
  input: TimeBlockUpsertInput,
): Promise<TimeBlockActionResult> {
  try {
    const context = await getTaskQueryContext();
    const message = await saveTimeBlock(context, input);

    return successResult(message);
  } catch (error) {
    return errorResult(getErrorMessage(error));
  }
}

export async function adjustTimeBlockAction(
  input: TimeBlockAdjustInput,
): Promise<TimeBlockActionResult> {
  const parsed = adjustSchema.safeParse(input);

  if (!parsed.success) {
    return errorResult(
      parsed.error.issues[0]?.message ?? "Use a valid time block.",
    );
  }

  try {
    const context = await getTaskQueryContext();
    const timezone = await getUserTimezone(context);
    const currentBlock = await getTimeBlockOrThrow(
      context,
      parsed.data.blockId,
    );
    const start = getLocalDateTimeParts(currentBlock.start_at, timezone);
    const end = getLocalDateTimeParts(currentBlock.end_at, timezone);
    const nextStartMinutes = start.minutes + parsed.data.startDeltaMinutes;
    const nextEndMinutes = end.minutes + parsed.data.endDeltaMinutes;

    if (start.date !== end.date) {
      throw new Error("Edit multi-day blocks with the form.");
    }

    if (nextStartMinutes < 0 || nextEndMinutes > 24 * 60) {
      throw new Error("Time blocks must stay inside the selected day.");
    }

    const message = await saveTimeBlock(context, {
      blockDate: start.date,
      blockId: currentBlock.id,
      endTime: minutesToTimeInput(nextEndMinutes),
      startTime: minutesToTimeInput(nextStartMinutes),
      taskId: currentBlock.task_id,
      title: currentBlock.title,
    });

    return successResult(message);
  } catch (error) {
    return errorResult(getErrorMessage(error));
  }
}

export async function deleteTimeBlockAction(
  blockId: string,
): Promise<TimeBlockActionResult> {
  const parsed = z
    .string()
    .uuid("Choose a valid time block.")
    .safeParse(blockId);

  if (!parsed.success) {
    return errorResult(parsed.error.issues[0]?.message ?? "Use a valid block.");
  }

  try {
    const context = await getTaskQueryContext();
    const currentBlock = await getTimeBlockOrThrow(context, parsed.data);
    const { error } = await context.supabase
      .from("time_blocks")
      .delete()
      .eq("user_id", context.userId)
      .eq("id", parsed.data);

    if (error) {
      throw new Error(error.message);
    }

    revalidateTimeBlockPaths([currentBlock.task_id]);

    return successResult("Time block deleted.");
  } catch (error) {
    return errorResult(getErrorMessage(error));
  }
}
