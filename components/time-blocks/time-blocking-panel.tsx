"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarPlus,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBodyScrollLock } from "@/components/ui/use-body-scroll-lock";
import type { TaskListItem } from "@/lib/tasks/types";
import {
  deleteTimeBlockAction,
  upsertTimeBlockAction,
} from "@/lib/time-blocks/actions";
import {
  DEFAULT_VISIBLE_END_MINUTES,
  DEFAULT_VISIBLE_START_MINUTES,
  minutesToTimeInput,
  parseTimeToMinutes,
  TIME_BLOCK_STEP_MINUTES,
} from "@/lib/time-blocks/time";
import type {
  TimeBlockItem,
  TimeBlockTaskOption,
} from "@/lib/time-blocks/types";
import { cn } from "@/lib/utils";

type TimeBlockFormState = {
  blockDate: string;
  blockId: string | null;
  endTime: string;
  startTime: string;
  taskId: string;
  title: string;
};

type TimeBlockingPanelProps = {
  blocks: TimeBlockItem[];
  date: string;
  description: string;
  lockedTaskId?: string;
  showUnblockedTasks?: boolean;
  taskOptions: TimeBlockTaskOption[];
  timezone: string;
  title: string;
  unblockedTasks?: TaskListItem[];
};

const DEFAULT_FORM_START = "09:00";
const DEFAULT_FORM_DURATION_MINUTES = 30;
const LATEST_MODAL_END_MINUTES = 23 * 60 + 45;
const TIMELINE_MINUTE_HEIGHT = 2;

function formatHour(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour} ${suffix}`;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) {
    return "None";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function taskMeta(task: TimeBlockTaskOption | TaskListItem | null) {
  if (!task) {
    return "Standalone";
  }

  return [
    "project_name" in task ? task.project_name : null,
    task.priority
      ? task.priority[0].toUpperCase() + task.priority.slice(1)
      : null,
    task.estimated_minutes ? `${task.estimated_minutes}m est` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function getVisibleRange(blocks: TimeBlockItem[]) {
  const firstBlockStart = Math.min(
    ...blocks.map((block) => block.start_minutes),
    DEFAULT_VISIBLE_START_MINUTES,
  );
  const lastBlockEnd = Math.max(
    ...blocks.map((block) => block.end_minutes),
    DEFAULT_VISIBLE_END_MINUTES,
  );
  const start = Math.max(0, Math.floor(firstBlockStart / 60) * 60);
  const end = Math.min(24 * 60, Math.ceil(lastBlockEnd / 60) * 60);

  return {
    end: Math.max(end, start + 60),
    start,
  };
}

function getTimelineHours(start: number, end: number) {
  const hours: number[] = [];

  for (let minutes = start; minutes <= end; minutes += 60) {
    hours.push(minutes);
  }

  return hours;
}

function addMinutesToTime(value: string, minutes: number) {
  const currentMinutes = parseTimeToMinutes(value);

  if (currentMinutes === null) {
    return value;
  }

  return minutesToTimeInput(currentMinutes + minutes);
}

function getDefaultEndTime(startTime: string, estimatedMinutes: number | null) {
  return addMinutesToTime(
    startTime,
    Math.max(TIME_BLOCK_STEP_MINUTES, estimatedMinutes ?? 30),
  );
}

function getInitialForm(
  date: string,
  lockedTaskId?: string,
): TimeBlockFormState {
  return {
    blockDate: date,
    blockId: null,
    endTime: addMinutesToTime(
      DEFAULT_FORM_START,
      DEFAULT_FORM_DURATION_MINUTES,
    ),
    startTime: DEFAULT_FORM_START,
    taskId: lockedTaskId ?? "",
    title: "",
  };
}

function snapToStep(minutes: number) {
  return (
    Math.floor(minutes / TIME_BLOCK_STEP_MINUTES) * TIME_BLOCK_STEP_MINUTES
  );
}

function getClickedStartMinute({
  clientY,
  timelineTop,
  visibleStart,
}: {
  clientY: number;
  timelineTop: number;
  visibleStart: number;
}) {
  const clickedMinutes =
    visibleStart + (clientY - timelineTop) / TIMELINE_MINUTE_HEIGHT;
  const snappedMinutes = snapToStep(clickedMinutes);

  return Math.max(
    0,
    Math.min(
      snappedMinutes,
      LATEST_MODAL_END_MINUTES - DEFAULT_FORM_DURATION_MINUTES,
    ),
  );
}

export function TimeBlockingPanel({
  blocks,
  date,
  description,
  lockedTaskId,
  showUnblockedTasks = false,
  taskOptions,
  timezone,
  title,
  unblockedTasks = [],
}: TimeBlockingPanelProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<TimeBlockFormState>(() =>
    getInitialForm(date, lockedTaskId),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTask = useMemo(
    () => taskOptions.find((task) => task.id === formState.taskId) ?? null,
    [formState.taskId, taskOptions],
  );
  const lockedTask = lockedTaskId
    ? (taskOptions.find((task) => task.id === lockedTaskId) ?? null)
    : null;
  const visibleRange = getVisibleRange(blocks);
  const timelineHours = getTimelineHours(visibleRange.start, visibleRange.end);
  const timelineHeight =
    (visibleRange.end - visibleRange.start) * TIMELINE_MINUTE_HEIGHT;
  const modalTitle = formState.blockId
    ? "Edit time block"
    : "Create time block";

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  function openModal(nextFormState: TimeBlockFormState) {
    setError(null);
    setMessage(null);
    setFormState(nextFormState);
    setIsModalOpen(true);
  }

  function openCreateModal(startMinutes: number, task?: TaskListItem) {
    const startTime = minutesToTimeInput(startMinutes);
    const taskId = task?.id ?? lockedTaskId ?? "";

    openModal({
      blockDate: date,
      blockId: null,
      endTime: task
        ? getDefaultEndTime(startTime, task.estimated_minutes)
        : minutesToTimeInput(startMinutes + DEFAULT_FORM_DURATION_MINUTES),
      startTime,
      taskId,
      title: task?.title ?? "",
    });
  }

  function openEditModal(block: TimeBlockItem) {
    openModal({
      blockDate: block.local_date,
      blockId: block.id,
      endTime: block.end_time,
      startTime: block.start_time,
      taskId: block.task_id ?? lockedTaskId ?? "",
      title: block.title,
    });
  }

  function runAction(
    action: () => Promise<{ message?: string; status: string }>,
    closeOnSuccess = true,
  ) {
    startTransition(async () => {
      setError(null);

      const result = await action();

      if (result.status === "error") {
        setError(result.message ?? "Unable to update time blocks.");
        return;
      }

      setMessage(result.message ?? "Time blocks updated.");
      if (closeOnSuccess) {
        setIsModalOpen(false);
      }
      router.refresh();
    });
  }

  function shiftModalTimes(startDeltaMinutes: number, endDeltaMinutes: number) {
    const startMinutes = parseTimeToMinutes(formState.startTime);
    const endMinutes = parseTimeToMinutes(formState.endTime);

    if (startMinutes === null || endMinutes === null) {
      setError("Use valid start and end times.");
      return;
    }

    const nextStartMinutes = startMinutes + startDeltaMinutes;
    const nextEndMinutes = endMinutes + endDeltaMinutes;

    if (nextStartMinutes < 0 || nextEndMinutes > LATEST_MODAL_END_MINUTES) {
      setError("Time blocks must stay inside the selected day.");
      return;
    }

    if (nextEndMinutes - nextStartMinutes < TIME_BLOCK_STEP_MINUTES) {
      setError("Time blocks must be at least 15 minutes.");
      return;
    }

    setError(null);
    setFormState((current) => ({
      ...current,
      endTime: minutesToTimeInput(nextEndMinutes),
      startTime: minutesToTimeInput(nextStartMinutes),
    }));
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarClock className="size-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>
            {description} Times are shown in {timezone}.
          </CardDescription>
          {message ? (
            <p className="rounded-md border border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))]/35 px-3 py-2 text-sm text-foreground">
              {message}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5">
          <section
            aria-label="Time block timeline"
            className="rounded-lg border border-border bg-background p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {date}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click an open time to create a block, or click a block to edit
                  it.
                </p>
              </div>
              <span className="w-fit rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                {blocks.length} scheduled
              </span>
            </div>

            <div
              className="relative mt-4 min-h-[48rem]"
              style={{ height: `${Math.max(768, timelineHeight)}px` }}
            >
              {timelineHours.map((minutes) => (
                <div
                  className="absolute left-0 right-0 grid grid-cols-[3.75rem_1fr] items-center gap-3 sm:grid-cols-[4.5rem_1fr]"
                  key={minutes}
                  style={{
                    top: `${(minutes - visibleRange.start) * TIMELINE_MINUTE_HEIGHT}px`,
                  }}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatHour(minutes)}
                  </span>
                  <span className="h-px bg-border" />
                </div>
              ))}

              <button
                aria-label="Create a time block from the calendar"
                className="absolute bottom-0 left-[3.75rem] right-0 top-0 rounded-lg border border-border/80 bg-card/75 text-left transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:left-[4.5rem]"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  openCreateModal(
                    getClickedStartMinute({
                      clientY: event.clientY,
                      timelineTop: rect.top,
                      visibleStart: visibleRange.start,
                    }),
                  );
                }}
                type="button"
              >
                {blocks.length === 0 ? (
                  <span className="flex h-full min-h-60 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    Click the calendar to create your first time block.
                  </span>
                ) : null}
              </button>

              <div className="pointer-events-none absolute bottom-0 left-[3.75rem] right-0 top-0 sm:left-[4.5rem]">
                {blocks.map((block) => {
                  const top =
                    (block.start_minutes - visibleRange.start) *
                    TIMELINE_MINUTE_HEIGHT;
                  const height = Math.max(
                    60,
                    (block.end_minutes - block.start_minutes) *
                      TIMELINE_MINUTE_HEIGHT,
                  );

                  return (
                    <button
                      aria-label={`Edit ${block.title}`}
                      className={cn(
                        "pointer-events-auto absolute left-2 right-2 overflow-hidden rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-left shadow-sm transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        formState.blockId === block.id &&
                          isModalOpen &&
                          "border-primary bg-primary/15",
                      )}
                      key={block.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(block);
                      }}
                      style={{
                        height: `${height}px`,
                        top: `${top}px`,
                      }}
                      type="button"
                    >
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {block.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {block.start_time}-{block.end_time} |{" "}
                        {formatMinutes(block.duration_minutes)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {taskMeta(block.task)}
                      </span>
                      {block.task ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          Actual {formatMinutes(block.actual_minutes)} / est{" "}
                          {formatMinutes(block.task.estimated_minutes)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {showUnblockedTasks ? (
            <section className="rounded-lg border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Unblocked tasks
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {unblockedTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    Every planned task has a time block.
                  </p>
                ) : (
                  unblockedTasks.map((task) => (
                    <article
                      className="rounded-lg border border-border bg-card p-3"
                      key={task.id}
                    >
                      <p className="text-sm font-medium text-foreground">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {taskMeta(task)}
                      </p>
                      <Button
                        className="mt-3 w-full"
                        onClick={() =>
                          openCreateModal(
                            parseTimeToMinutes(DEFAULT_FORM_START) ??
                              DEFAULT_VISIBLE_START_MINUTES,
                            task,
                          )
                        }
                        type="button"
                        variant="outline"
                      >
                        <CalendarPlus />
                        Block task
                      </Button>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            aria-modal="true"
            className="max-h-full w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
                  Time block
                </p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">
                  {modalTitle}
                </h2>
              </div>
              <Button
                aria-label="Close time block modal"
                disabled={isPending}
                onClick={() => setIsModalOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>

            <form
              className="max-h-[calc(100vh-9rem)] overflow-y-auto px-4 py-5 sm:px-6"
              onSubmit={(event) => {
                event.preventDefault();
                runAction(() =>
                  upsertTimeBlockAction({
                    blockDate: formState.blockDate,
                    blockId: formState.blockId,
                    endTime: formState.endTime,
                    startTime: formState.startTime,
                    taskId: lockedTaskId ?? (formState.taskId || null),
                    title: formState.title,
                  }),
                );
              }}
            >
              <div className="space-y-4">
                {error ? (
                  <p
                    aria-live="polite"
                    className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </p>
                ) : null}

                {lockedTaskId ? (
                  <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">
                      {lockedTask?.title ?? "Selected task"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Task selection is locked on this page.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="time-block-task">Task</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                      id="time-block-task"
                      onChange={(event) => {
                        const taskId = event.target.value;
                        const task =
                          taskOptions.find((option) => option.id === taskId) ??
                          null;
                        setFormState((current) => ({
                          ...current,
                          endTime: task
                            ? getDefaultEndTime(
                                current.startTime,
                                task.estimated_minutes,
                              )
                            : current.endTime,
                          taskId,
                          title:
                            task && current.title.trim().length === 0
                              ? task.title
                              : current.title,
                        }));
                      }}
                      value={formState.taskId}
                    >
                      <option value="">Standalone block</option>
                      {taskOptions.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="time-block-title">Title</Label>
                  <Input
                    id="time-block-title"
                    maxLength={180}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder={
                      selectedTask || lockedTask
                        ? "Optional custom title"
                        : "Block title"
                    }
                    value={formState.title}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="time-block-date">Date</Label>
                  <Input
                    id="time-block-date"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        blockDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={formState.blockDate}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="time-block-start">Start</Label>
                    <Input
                      id="time-block-start"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      step={TIME_BLOCK_STEP_MINUTES * 60}
                      type="time"
                      value={formState.startTime}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="time-block-end">End</Label>
                    <Input
                      id="time-block-end"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                      step={TIME_BLOCK_STEP_MINUTES * 60}
                      type="time"
                      value={formState.endTime}
                    />
                  </div>
                </div>

                {formState.blockId ? (
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        shiftModalTimes(
                          -TIME_BLOCK_STEP_MINUTES,
                          -TIME_BLOCK_STEP_MINUTES,
                        )
                      }
                      type="button"
                      variant="outline"
                    >
                      Earlier
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        shiftModalTimes(
                          TIME_BLOCK_STEP_MINUTES,
                          TIME_BLOCK_STEP_MINUTES,
                        )
                      }
                      type="button"
                      variant="outline"
                    >
                      Later
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        shiftModalTimes(0, -TIME_BLOCK_STEP_MINUTES)
                      }
                      type="button"
                      variant="outline"
                    >
                      <Minus />
                      Shorten
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        shiftModalTimes(0, TIME_BLOCK_STEP_MINUTES)
                      }
                      type="button"
                      variant="outline"
                    >
                      <Plus />
                      Extend
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
                <div>
                  {formState.blockId ? (
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        runAction(() =>
                          deleteTimeBlockAction(formState.blockId ?? ""),
                        )
                      }
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {!formState.blockId ? (
                    <Button
                      disabled={isPending}
                      onClick={() => {
                        setError(null);
                        setFormState(getInitialForm(date, lockedTaskId));
                      }}
                      type="button"
                      variant="ghost"
                    >
                      Clear
                    </Button>
                  ) : null}
                  <Button
                    disabled={isPending}
                    onClick={() => setIsModalOpen(false)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button disabled={isPending} type="submit">
                    <CalendarPlus />
                    {isPending ? "Saving..." : "Save block"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
