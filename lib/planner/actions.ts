"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { MindfulPlanningWelcomeInput } from "@/lib/planner/types";
import { getDateInTimeZone } from "@/lib/tasks/date";
import { getTaskQueryContext, getUserTimezone } from "@/lib/tasks/queries";
import { isValidTimezone } from "@/lib/timezone";

const REVALIDATE_PATHS = [
  "/app/today",
  "/app/planner",
  "/app/tasks",
  "/app/inbox",
];

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableMinutes(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? Number(trimmed) : null;
}

function getTimeValueWithSeconds(value: string | null) {
  if (!value) {
    return null;
  }

  return `${value}:00`;
}

function getStatusForPlannedTask(currentStatus: string) {
  return currentStatus === "completed" ? "completed" : "planned";
}

const optionalTimeSchema = z.preprocess(
  normalizeNullableText,
  z.string().regex(timePattern, "Use a valid time.").nullable(),
);

const optionalMinutesSchema = z.preprocess(
  normalizeNullableMinutes,
  z
    .number()
    .int("Use a whole number of minutes.")
    .min(1, "Minutes must be at least 1.")
    .max(1440, "Minutes must be 24 hours or less.")
    .nullable(),
);

const plannerTaskSchema = z.object({
  estimatedMinutes: optionalMinutesSchema.optional(),
  isTopPriority: z.boolean().optional(),
  plannedMinutes: optionalMinutesSchema.optional(),
  taskId: z.string().uuid("Select valid tasks."),
});

const plannerPayloadSchema = z.object({
  notes: z.preprocess(
    normalizeNullableText,
    z.string().max(2000, "Keep notes under 2000 characters.").nullable(),
  ),
  plannedEndTime: optionalTimeSchema.optional(),
  plannedStartTime: optionalTimeSchema.optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: optionalTimeSchema.optional(),
  selectedTasks: z.array(plannerTaskSchema).optional(),
});

function getFirstErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Unable to save planning changes.";
}

function revalidatePlannerPaths() {
  REVALIDATE_PATHS.forEach((path) => revalidatePath(path));
}

export async function saveMindfulPlanningWelcomeAction(
  input: MindfulPlanningWelcomeInput,
) {
  const parsed = plannerPayloadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: getFirstErrorMessage(parsed.error),
      status: "error" as const,
    };
  }

  const values = parsed.data;
  const context = await getTaskQueryContext();
  const timezone = await getUserTimezone(context);
  const todayDate = getDateInTimeZone(new Date(), timezone);
  const selectedTasks = Array.from(
    new Map(
      (values.selectedTasks ?? []).map((task) => [task.taskId, task]),
    ).values(),
  );

  if (
    values.plannedStartTime &&
    values.plannedEndTime &&
    values.plannedStartTime >= values.plannedEndTime
  ) {
    return {
      message: "End time must be after start time.",
      status: "error" as const,
    };
  }

  try {
    let dailyPlanId: string | null = null;
    const needsDailyPlan =
      selectedTasks.length > 0 ||
      values.notes !== null ||
      Boolean(values.plannedStartTime) ||
      Boolean(values.plannedEndTime);

    if (needsDailyPlan) {
      const { data: existingPlan, error: existingPlanError } =
        await context.supabase
          .from("daily_plans")
          .select("id")
          .eq("user_id", context.userId)
          .eq("plan_date", todayDate)
          .maybeSingle();

      if (existingPlanError) {
        throw new Error(existingPlanError.message);
      }

      if (existingPlan?.id) {
        const { error } = await context.supabase
          .from("daily_plans")
          .update({
            notes: values.notes,
            planned_end_time: getTimeValueWithSeconds(
              values.plannedEndTime ?? null,
            ),
            planned_start_time: getTimeValueWithSeconds(
              values.plannedStartTime ?? null,
            ),
          })
          .eq("id", existingPlan.id);

        if (error) {
          throw new Error(error.message);
        }

        dailyPlanId = existingPlan.id;
      } else {
        const { data, error } = await context.supabase
          .from("daily_plans")
          .insert({
            notes: values.notes,
            plan_date: todayDate,
            planned_end_time: getTimeValueWithSeconds(
              values.plannedEndTime ?? null,
            ),
            planned_start_time: getTimeValueWithSeconds(
              values.plannedStartTime ?? null,
            ),
            user_id: context.userId,
          })
          .select("id")
          .single();

        if (error) {
          throw new Error(error.message);
        }

        dailyPlanId = data.id;
      }
    }

    if (selectedTasks.length > 0) {
      const taskIds = Array.from(
        new Set(selectedTasks.map((task) => task.taskId)),
      );
      const { data: taskRows, error: taskRowsError } = await context.supabase
        .from("tasks")
        .select("id,status")
        .in("id", taskIds)
        .eq("user_id", context.userId)
        .is("archived_at", null);

      if (taskRowsError) {
        throw new Error(taskRowsError.message);
      }

      const taskStatusById = new Map(
        (taskRows ?? []).map((task) => [task.id, task.status]),
      );

      if (taskStatusById.size !== taskIds.length) {
        throw new Error("One or more selected tasks are unavailable.");
      }

      const updatePayload = selectedTasks.map((task) => ({
        estimated_minutes: task.estimatedMinutes ?? null,
        planned_date: todayDate,
        status: getStatusForPlannedTask(
          taskStatusById.get(task.taskId) ?? "inbox",
        ),
      }));

      for (let index = 0; index < selectedTasks.length; index += 1) {
        const task = selectedTasks[index];
        const { error } = await context.supabase
          .from("tasks")
          .update(updatePayload[index])
          .eq("id", task.taskId);

        if (error) {
          throw new Error(error.message);
        }
      }

      if (!dailyPlanId) {
        throw new Error("Could not determine today's plan.");
      }

      const { error: clearItemsError } = await context.supabase
        .from("daily_plan_items")
        .delete()
        .eq("daily_plan_id", dailyPlanId);

      if (clearItemsError) {
        throw new Error(clearItemsError.message);
      }

      const planItems = selectedTasks.map((task, index) => ({
        daily_plan_id: dailyPlanId,
        is_top_priority: task.isTopPriority ?? false,
        planned_minutes: task.plannedMinutes ?? null,
        sort_order: index,
        task_id: task.taskId,
      }));

      const { error: insertItemsError } = await context.supabase
        .from("daily_plan_items")
        .insert(planItems);

      if (insertItemsError) {
        throw new Error(insertItemsError.message);
      }
    }

    if (typeof values.reminderEnabled === "boolean" || values.reminderTime) {
      const { error } = await context.supabase
        .from("user_preferences")
        .update({
          daily_planning_reminders_enabled: values.reminderEnabled ?? false,
          default_planning_reminder_time: getTimeValueWithSeconds(
            values.reminderTime ?? null,
          ),
        })
        .eq("user_id", context.userId);

      if (error) {
        throw new Error(error.message);
      }
    }

    revalidatePlannerPaths();

    return {
      message: "Daily planning saved.",
      status: "success" as const,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Unable to save planning changes.",
      status: "error" as const,
    };
  }
}

export async function syncProfileTimezoneAction(timezone: string | null) {
  if (!isValidTimezone(timezone)) {
    return {
      status: "ignored" as const,
    };
  }

  const context = await getTaskQueryContext();
  const { data: currentProfile, error: currentProfileError } =
    await context.supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", context.userId)
      .maybeSingle();

  if (currentProfileError) {
    return {
      message: currentProfileError.message,
      status: "error" as const,
    };
  }

  if (currentProfile?.timezone === timezone) {
    return {
      status: "ignored" as const,
    };
  }

  const { error } = await context.supabase
    .from("profiles")
    .update({
      timezone,
    })
    .eq("user_id", context.userId);

  if (error) {
    return {
      message: error.message,
      status: "error" as const,
    };
  }

  revalidatePath("/app/today");
  revalidatePath("/app/planner");

  return {
    status: "success" as const,
  };
}
