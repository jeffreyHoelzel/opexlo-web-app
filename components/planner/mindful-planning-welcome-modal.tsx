"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { CalendarClock, Flag, ListChecks, Sunrise, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBodyScrollLock } from "@/components/ui/use-body-scroll-lock";
import { saveMindfulPlanningWelcomeAction } from "@/lib/planner/actions";
import type {
  MindfulPlanningTaskInput,
  MindfulPlanningWelcomeBootstrap,
} from "@/lib/planner/types";
import type { TaskListItem } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type TaskPlanningState = {
  estimatedMinutes: string;
  isTopPriority: boolean;
  plannedMinutes: string;
};

function parseMinutes(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function compactMeta(task: TaskListItem) {
  const items = [
    task.project_name ?? "Inbox",
    task.priority
      ? task.priority[0].toUpperCase() + task.priority.slice(1)
      : null,
    task.estimated_minutes ? `${task.estimated_minutes}m est` : null,
  ];

  return items.filter(Boolean).join(" | ");
}

function createTaskState(
  tasks: TaskListItem[],
  itemsByTaskId: Map<
    string,
    { is_top_priority: boolean; planned_minutes: number | null }
  >,
) {
  const state: Record<string, TaskPlanningState> = {};

  for (const task of tasks) {
    const existingItem = itemsByTaskId.get(task.id);
    state[task.id] = {
      estimatedMinutes: task.estimated_minutes
        ? String(task.estimated_minutes)
        : "",
      isTopPriority: existingItem?.is_top_priority ?? false,
      plannedMinutes: existingItem?.planned_minutes
        ? String(existingItem.planned_minutes)
        : "",
    };
  }

  return state;
}

function toTaskPayload(
  selectedTaskIds: string[],
  taskState: Record<string, TaskPlanningState>,
) {
  return selectedTaskIds.map(
    (taskId): MindfulPlanningTaskInput => ({
      estimatedMinutes: parseMinutes(taskState[taskId]?.estimatedMinutes ?? ""),
      isTopPriority: taskState[taskId]?.isTopPriority ?? false,
      plannedMinutes: parseMinutes(taskState[taskId]?.plannedMinutes ?? ""),
      taskId,
    }),
  );
}

function getAvailableMinutes(startTime: string, endTime: string) {
  if (!startTime || !endTime) {
    return null;
  }

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  if (end <= start) {
    return null;
  }

  return end - start;
}

const MODAL_STORAGE_KEY_PREFIX = "opexlo:mindful-plan-welcome:v1";
const MODAL_SESSION_COOKIE_PREFIX = "opexlo_mindful_plan_welcome_v1";

function getStorageKey(userId: string) {
  return `${MODAL_STORAGE_KEY_PREFIX}:${userId}`;
}

function getCookieName(userId: string) {
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${MODAL_SESSION_COOKIE_PREFIX}_${sanitizedUserId}`;
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const pairs = document.cookie ? document.cookie.split("; ") : [];

  for (const pair of pairs) {
    if (pair.startsWith(encodedName)) {
      return decodeURIComponent(pair.slice(encodedName.length));
    }
  }

  return null;
}

function setSessionCookie(name: string, value: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; samesite=lax`;
}

function hasSeenInSession(userId: string) {
  const cookieName = getCookieName(userId);

  if (getCookieValue(cookieName) === "1") {
    return true;
  }

  try {
    return window.sessionStorage.getItem(getStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

function markSeenInSession(userId: string) {
  const cookieName = getCookieName(userId);
  setSessionCookie(cookieName, "1");

  try {
    window.sessionStorage.setItem(getStorageKey(userId), "1");
  } catch {
    // Ignore storage write failures and rely on session cookie.
  }
}

export function MindfulPlanningWelcomeModal({
  bootstrap,
}: {
  bootstrap: MindfulPlanningWelcomeBootstrap;
}) {
  const hasMarkedSeenRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(bootstrap.dailyPlan.notes ?? "");
  const [plannedStartTime, setPlannedStartTime] = useState(
    bootstrap.dailyPlan.planned_start_time ?? "",
  );
  const [plannedEndTime, setPlannedEndTime] = useState(
    bootstrap.dailyPlan.planned_end_time ?? "",
  );
  const [reminderEnabled, setReminderEnabled] = useState(
    bootstrap.reminderDefaults.daily_planning_reminders_enabled,
  );
  const [reminderTime, setReminderTime] = useState(
    bootstrap.reminderDefaults.default_planning_reminder_time ?? "",
  );

  const existingItemsByTaskId = useMemo(
    () =>
      new Map(
        bootstrap.dailyPlan.items.map((item) => [
          item.task_id,
          {
            is_top_priority: item.is_top_priority,
            planned_minutes: item.planned_minutes,
          },
        ]),
      ),
    [bootstrap.dailyPlan.items],
  );

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
    bootstrap.candidateTasks
      .filter((task) => existingItemsByTaskId.has(task.id))
      .map((task) => task.id),
  );
  const [taskState, setTaskState] = useState<Record<string, TaskPlanningState>>(
    createTaskState(bootstrap.candidateTasks, existingItemsByTaskId),
  );

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (hasSeenInSession(bootstrap.userId)) {
      return;
    }

    setIsOpen(true);
  }, [bootstrap.userId]);

  useEffect(() => {
    if (!isOpen || hasMarkedSeenRef.current) {
      return;
    }

    try {
      markSeenInSession(bootstrap.userId);
      hasMarkedSeenRef.current = true;
    } catch {
      hasMarkedSeenRef.current = true;
      setIsOpen(true);
    }
  }, [bootstrap.userId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, isOpen]);

  const selectedTaskPayload = useMemo(
    () => toTaskPayload(selectedTaskIds, taskState),
    [selectedTaskIds, taskState],
  );
  const topPriorityCount = selectedTaskPayload.filter(
    (task) => task.isTopPriority,
  ).length;
  const plannedMinutes = selectedTaskPayload.reduce((total, task) => {
    const minutes = task.plannedMinutes ?? task.estimatedMinutes ?? 0;
    return total + minutes;
  }, 0);
  const availableMinutes = getAvailableMinutes(
    plannedStartTime,
    plannedEndTime,
  );
  const isOverloaded =
    availableMinutes !== null && plannedMinutes > availableMinutes;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        aria-modal="true"
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl sm:max-h-[92vh]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
              Mindful planning
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Welcome to your daily planning flow
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan only what fits for {bootstrap.todayDate} in{" "}
              {bootstrap.timezone}. Every field is optional.
            </p>
          </div>
          <Button
            aria-label="Close daily planning modal"
            onClick={closeModal}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {error ? (
            <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-md border border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))]/35 px-3 py-2 text-sm text-foreground">
              {message}
            </p>
          ) : null}

          {topPriorityCount > 3 ? (
            <p className="rounded-md border border-accent/70 bg-accent/25 px-3 py-2 text-sm text-accent-foreground">
              Keep top priorities to a small set so the day stays realistic.
            </p>
          ) : null}

          {isOverloaded ? (
            <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Planned work exceeds available time. Consider reducing scope.
            </p>
          ) : null}

          <section className="rounded-lg border border-border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="size-4 text-primary" />
              Available focus window
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. Add start and end times for a quick realism check.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="welcome-plan-start">Start time</Label>
                <Input
                  id="welcome-plan-start"
                  onChange={(event) => setPlannedStartTime(event.target.value)}
                  type="time"
                  value={plannedStartTime}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="welcome-plan-end">End time</Label>
                <Input
                  id="welcome-plan-end"
                  onChange={(event) => setPlannedEndTime(event.target.value)}
                  type="time"
                  value={plannedEndTime}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sunrise className="size-4 text-primary" />
              Daily intention
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional notes for how you want the day to feel or what matters
              most.
            </p>
            <Textarea
              className="mt-3"
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What would make today a solid day?"
              value={notes}
            />
          </section>

          <section className="rounded-lg border border-border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Flag className="size-4 text-primary" />
              Planning reminder (placeholder)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This stores your preference now. Reminder delivery will be enabled
              in a later feature.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={reminderEnabled}
                  onCheckedChange={(checked) =>
                    setReminderEnabled(checked === true)
                  }
                />
                Enable daily planning reminders
              </label>
              <div className="flex items-center gap-2">
                <Label className="text-sm" htmlFor="welcome-reminder-time">
                  Time
                </Label>
                <Input
                  className="w-36"
                  id="welcome-reminder-time"
                  onChange={(event) => setReminderTime(event.target.value)}
                  type="time"
                  value={reminderTime}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ListChecks className="size-4 text-primary" />
              Pick today&apos;s tasks
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. Select only what you can realistically finish.
            </p>

            {bootstrap.candidateTasks.length === 0 ? (
              <div className="mt-3 rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                No active tasks available yet.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {bootstrap.candidateTasks.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  const currentState = taskState[task.id] ?? {
                    estimatedMinutes: "",
                    isTopPriority: false,
                    plannedMinutes: "",
                  };

                  return (
                    <div
                      className={cn(
                        "rounded-lg border border-border bg-card p-3",
                        isSelected && "border-primary/35 bg-secondary/35",
                      )}
                      key={task.id}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          className="mt-0.5"
                          onCheckedChange={(checked) => {
                            setSelectedTaskIds((previous) => {
                              if (checked === true) {
                                if (previous.includes(task.id)) {
                                  return previous;
                                }

                                return [...previous, task.id];
                              }

                              return previous.filter(
                                (taskId) => taskId !== task.id,
                              );
                            });
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {compactMeta(task)}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label htmlFor={`welcome-estimate-${task.id}`}>
                              Estimate (min)
                            </Label>
                            <Input
                              id={`welcome-estimate-${task.id}`}
                              min={1}
                              onChange={(event) =>
                                setTaskState((previous) => ({
                                  ...previous,
                                  [task.id]: {
                                    ...currentState,
                                    estimatedMinutes: event.target.value,
                                  },
                                }))
                              }
                              type="number"
                              value={currentState.estimatedMinutes}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`welcome-planned-${task.id}`}>
                              Planned (min)
                            </Label>
                            <Input
                              id={`welcome-planned-${task.id}`}
                              min={1}
                              onChange={(event) =>
                                setTaskState((previous) => ({
                                  ...previous,
                                  [task.id]: {
                                    ...currentState,
                                    plannedMinutes: event.target.value,
                                  },
                                }))
                              }
                              type="number"
                              value={currentState.plannedMinutes}
                            />
                          </div>
                          <label className="inline-flex items-center gap-2 self-end pb-2 text-sm text-foreground">
                            <Checkbox
                              checked={currentState.isTopPriority}
                              onCheckedChange={(checked) =>
                                setTaskState((previous) => ({
                                  ...previous,
                                  [task.id]: {
                                    ...currentState,
                                    isTopPriority: checked === true,
                                  },
                                }))
                              }
                            />
                            Top priority
                          </label>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button onClick={closeModal} type="button" variant="ghost">
            Skip for now
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                setError(null);
                setMessage(null);

                const result = await saveMindfulPlanningWelcomeAction({
                  notes: notes.trim() || null,
                  plannedEndTime: plannedEndTime || null,
                  plannedStartTime: plannedStartTime || null,
                  reminderEnabled,
                  reminderTime: reminderTime || null,
                  selectedTasks: selectedTaskPayload,
                });

                if (result.status === "error") {
                  setError(result.message);
                  return;
                }

                setMessage(result.message);
                closeModal();
              });
            }}
            type="button"
          >
            {isPending ? "Saving..." : "Save daily plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
