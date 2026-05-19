import type { TaskListItem } from "@/lib/tasks/types";

export type PlannerReminderDefaults = {
  daily_planning_reminders_enabled: boolean;
  default_planning_reminder_time: string | null;
};

export type DailyPlanSnapshotItem = {
  is_top_priority: boolean;
  planned_minutes: number | null;
  sort_order: number;
  task_id: string;
};

export type DailyPlanSnapshot = {
  id: string | null;
  items: DailyPlanSnapshotItem[];
  notes: string | null;
  planned_end_time: string | null;
  planned_start_time: string | null;
};

export type MindfulPlanningWelcomeBootstrap = {
  candidateTasks: TaskListItem[];
  dailyPlan: DailyPlanSnapshot;
  profileTimezone: string | null;
  reminderDefaults: PlannerReminderDefaults;
  todayDate: string;
  timezone: string;
  userId: string;
};

export type MindfulPlanningTaskInput = {
  estimatedMinutes?: number | null;
  isTopPriority?: boolean;
  plannedMinutes?: number | null;
  taskId: string;
};

export type MindfulPlanningWelcomeInput = {
  notes?: string | null;
  plannedEndTime?: string | null;
  plannedStartTime?: string | null;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
  selectedTasks?: MindfulPlanningTaskInput[];
};
