import type {
  DailyPlanSnapshotItem,
  MindfulPlanningWelcomeBootstrap,
} from "@/lib/planner/types";
import { getDateInTimeZone } from "@/lib/tasks/date";
import {
  getRecentActiveTasks,
  getTaskQueryContext,
  getUserTimezone,
} from "@/lib/tasks/queries";
import { isValidTimezone } from "@/lib/timezone";

const DEFAULT_REMINDER_VALUES = {
  daily_planning_reminders_enabled: false,
  default_planning_reminder_time: null,
};

function toTimeInputValue(value: string | null) {
  if (!value) {
    return null;
  }

  return value.slice(0, 5);
}

export async function getMindfulPlanningWelcomeData(): Promise<MindfulPlanningWelcomeBootstrap> {
  const context = await getTaskQueryContext();
  const [
    candidateTasks,
    timezone,
    reminderPreferencesResult,
    profileTimezoneResult,
  ] = await Promise.all([
    getRecentActiveTasks(12, context),
    getUserTimezone(context),
    context.supabase
      .from("user_preferences")
      .select("daily_planning_reminders_enabled,default_planning_reminder_time")
      .eq("user_id", context.userId)
      .maybeSingle(),
    context.supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", context.userId)
      .maybeSingle(),
  ]);

  if (reminderPreferencesResult.error) {
    throw new Error(reminderPreferencesResult.error.message);
  }

  if (profileTimezoneResult.error) {
    throw new Error(profileTimezoneResult.error.message);
  }

  const todayDate = getDateInTimeZone(new Date(), timezone);
  const { data: todayPlan, error: todayPlanError } = await context.supabase
    .from("daily_plans")
    .select("id,notes,planned_start_time,planned_end_time")
    .eq("user_id", context.userId)
    .eq("plan_date", todayDate)
    .maybeSingle();

  if (todayPlanError) {
    throw new Error(todayPlanError.message);
  }

  let todayPlanItems: DailyPlanSnapshotItem[] = [];

  if (todayPlan?.id) {
    const { data, error } = await context.supabase
      .from("daily_plan_items")
      .select("task_id,planned_minutes,is_top_priority,sort_order")
      .eq("daily_plan_id", todayPlan.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    todayPlanItems = data ?? [];
  }

  return {
    candidateTasks,
    dailyPlan: {
      id: todayPlan?.id ?? null,
      items: todayPlanItems,
      notes: todayPlan?.notes ?? null,
      planned_end_time: toTimeInputValue(todayPlan?.planned_end_time ?? null),
      planned_start_time: toTimeInputValue(
        todayPlan?.planned_start_time ?? null,
      ),
    },
    profileTimezone: isValidTimezone(profileTimezoneResult.data?.timezone)
      ? profileTimezoneResult.data.timezone
      : null,
    reminderDefaults: reminderPreferencesResult.data
      ? {
          daily_planning_reminders_enabled:
            reminderPreferencesResult.data.daily_planning_reminders_enabled,
          default_planning_reminder_time: toTimeInputValue(
            reminderPreferencesResult.data.default_planning_reminder_time,
          ),
        }
      : DEFAULT_REMINDER_VALUES,
    todayDate,
    timezone,
    userId: context.userId,
  };
}
