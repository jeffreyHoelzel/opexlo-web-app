import { z } from "zod";

import { TASK_PRIORITIES } from "@/lib/tasks/types";

function isValidDateParts(year: number, month: number, day: number) {
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (isValidDateParts(year, month, day)) {
      return toIsoDate(year, month, day);
    }

    return trimmed;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const [, monthText, dayText, yearText] = slashMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (isValidDateParts(year, month, day)) {
      return toIsoDate(year, month, day);
    }
  }

  return trimmed;
}

const nullableDateSchema = z.preprocess(
  normalizeDateInput,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
    .nullable(),
);

const nullableUuidSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().uuid("Choose a valid linked record.").nullable());

const nullableMinutesSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? Number(trimmed) : null;
}, z.number().int("Estimate must be a whole number of minutes.").min(1, "Estimate must be at least 1 minute.").max(1440, "Keep estimates at 24 hours or less.").nullable());

export const taskFormSchema = z.object({
  area_id: nullableUuidSchema,
  description: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || null : null),
    z
      .string()
      .max(2000, "Keep descriptions under 2,000 characters.")
      .nullable(),
  ),
  due_date: nullableDateSchema,
  estimated_minutes: nullableMinutesSchema,
  goal_id: nullableUuidSchema,
  planned_date: nullableDateSchema,
  priority: z.enum(TASK_PRIORITIES),
  project_id: nullableUuidSchema,
  title: z
    .string()
    .trim()
    .min(1, "Add a task title.")
    .max(180, "Keep task titles under 180 characters."),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export function parseTaskFormData(formData: FormData) {
  return taskFormSchema.safeParse({
    area_id: formData.get("area_id"),
    description: formData.get("description"),
    due_date: formData.get("due_date"),
    estimated_minutes: formData.get("estimated_minutes"),
    goal_id: formData.get("goal_id"),
    planned_date: formData.get("planned_date"),
    priority: formData.get("priority") ?? "medium",
    project_id: formData.get("project_id"),
    title: formData.get("title"),
  });
}

export function getFirstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the task details and try again.";
}

export function getRequiredTaskId(formData: FormData) {
  const value = formData.get("task_id");

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}
