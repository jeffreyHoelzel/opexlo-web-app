import type { Tables } from "@/types/database";

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_STATUSES = [
  "inbox",
  "planned",
  "in_progress",
  "completed",
  "archived",
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskRow = Tables<"tasks">;

export type TaskOption = {
  color?: string | null;
  id: string;
  name: string;
};

export type TaskFormOptions = {
  areas: TaskOption[];
  goals: TaskOption[];
  projects: TaskOption[];
};

export type TaskListItem = TaskRow & {
  area_name: string | null;
  goal_title: string | null;
  project_name: string | null;
};

export type TaskModalData = {
  options: TaskFormOptions;
  recentTasks: TaskListItem[];
};
