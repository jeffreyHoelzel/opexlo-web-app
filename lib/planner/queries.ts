import type {
  DailyPlanSnapshotItem,
  PlannerCalendarData,
  PlannerCalendarRangeBlock,
  MindfulPlanningWelcomeBootstrap,
  PlannerCalendarView,
} from "@/lib/planner/types";
import {
  getDateRangeForPlannerView,
  normalizePlannerCalendarView,
} from "@/lib/planner/calendar";
import { getDateInTimeZone } from "@/lib/tasks/date";
import {
  getRecentActiveTasks,
  getTaskQueryContext,
  getUserTimezone,
} from "@/lib/tasks/queries";
import { getTimeBlockDayData } from "@/lib/time-blocks/queries";
import {
  getBlockDurationMinutes,
  getLocalDateTimeParts,
  localDateTimeToUtcIso,
} from "@/lib/time-blocks/time";
import type { TimeBlockRow } from "@/lib/time-blocks/types";
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

function mapPlannerRangeBlock(
  block: TimeBlockRow,
  timezone: string,
  tasksById: Map<string, PlannerCalendarRangeBlock["task"]>,
): PlannerCalendarRangeBlock {
  const start = getLocalDateTimeParts(block.start_at, timezone);
  const end = getLocalDateTimeParts(block.end_at, timezone);

  return {
    duration_minutes: getBlockDurationMinutes(block.start_at, block.end_at),
    end_at: block.end_at,
    end_local_date: end.date,
    end_minutes: end.minutes,
    end_time: end.time,
    id: block.id,
    start_at: block.start_at,
    start_local_date: start.date,
    start_minutes: start.minutes,
    start_time: start.time,
    task: block.task_id ? (tasksById.get(block.task_id) ?? null) : null,
    task_id: block.task_id,
    title: block.title,
  };
}

export async function getPlannerCalendarData({
  date,
  view,
}: {
  date?: string;
  view?: string | null;
} = {}): Promise<PlannerCalendarData> {
  const resolvedView: PlannerCalendarView = normalizePlannerCalendarView(view);
  const context = await getTaskQueryContext();
  const selectedDay = await getTimeBlockDayData({ context, date });
  const timezone = selectedDay.timezone;
  const todayDate = getDateInTimeZone(new Date(), timezone);
  const range = getDateRangeForPlannerView(resolvedView, selectedDay.date);
  const startAt = localDateTimeToUtcIso(range.startDate, "00:00", timezone);
  const endAt = localDateTimeToUtcIso(
    range.endDateExclusive,
    "00:00",
    timezone,
  );

  if (!startAt || !endAt) {
    throw new Error("Use a valid calendar range.");
  }

  const { data, error } = await context.supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", context.userId)
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const tasksById = new Map(
    selectedDay.taskOptions.map((task) => [task.id, task]),
  );

  return {
    date: selectedDay.date,
    range,
    rangeBlocks: (data ?? []).map((block) =>
      mapPlannerRangeBlock(block, timezone, tasksById),
    ),
    selectedDay,
    timezone,
    todayDate,
    view: resolvedView,
  };
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
