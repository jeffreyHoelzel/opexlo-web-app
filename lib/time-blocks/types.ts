import type { TaskListItem } from "@/lib/tasks/types";
import type { Tables } from "@/types/database";

export type TimeBlockRow = Tables<"time_blocks">;

export type TimeBlockTaskSummary = {
  estimated_minutes: number | null;
  id: string;
  planned_date: string | null;
  priority: string;
  project_name: string | null;
  status: string;
  title: string;
};

export type TimeBlockTaskOption = TimeBlockTaskSummary;

export type TimeBlockItem = TimeBlockRow & {
  actual_minutes: number | null;
  duration_minutes: number;
  end_minutes: number;
  end_time: string;
  local_date: string;
  start_minutes: number;
  start_time: string;
  task: TimeBlockTaskSummary | null;
};

export type TimeBlockDayData = {
  blocks: TimeBlockItem[];
  date: string;
  taskOptions: TimeBlockTaskOption[];
  tasks: TaskListItem[];
  timezone: string;
  unblockedTasks: TaskListItem[];
};

export type TimeBlockActionResult = {
  message?: string;
  status: "error" | "success";
};

export type TimeBlockUpsertInput = {
  blockDate: string;
  blockId?: string | null;
  endTime: string;
  startTime: string;
  taskId?: string | null;
  title?: string | null;
};

export type TimeBlockAdjustInput = {
  blockId: string;
  endDeltaMinutes: number;
  startDeltaMinutes: number;
};
