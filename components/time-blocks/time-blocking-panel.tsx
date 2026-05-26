"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CalendarPlus,
  Clock3,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  adjustTimeBlockAction,
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
import type { TaskListItem } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
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
const DEFAULT_FORM_END = "09:30";
const TIMELINE_MINUTE_HEIGHT = 1.1;

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

function createInitialForm(
  date: string,
  lockedTaskId?: string,
): TimeBlockFormState {
  return {
    blockDate: date,
    blockId: null,
    endTime: DEFAULT_FORM_END,
    startTime: DEFAULT_FORM_START,
    taskId: lockedTaskId ?? "",
    title: "",
  };
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
    createInitialForm(date, lockedTaskId),
  );
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

  function resetForm() {
    setFormState(createInitialForm(date, lockedTaskId));
  }

  function runAction(
    action: () => Promise<{ message?: string; status: string }>,
  ) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await action();

      if (result.status === "error") {
        setError(result.message ?? "Unable to update time blocks.");
        return;
      }

      setMessage(result.message ?? "Time blocks updated.");
      router.refresh();
    });
  }

  function editBlock(block: TimeBlockItem) {
    setError(null);
    setMessage(null);
    setFormState({
      blockDate: block.local_date,
      blockId: block.id,
      endTime: block.end_time,
      startTime: block.start_time,
      taskId: block.task_id ?? lockedTaskId ?? "",
      title: block.title,
    });
  }

  function blockTask(task: TaskListItem) {
    const startTime = formState.startTime || DEFAULT_FORM_START;
    setError(null);
    setMessage(null);
    setFormState({
      blockDate: date,
      blockId: null,
      endTime: getDefaultEndTime(startTime, task.estimated_minutes),
      startTime,
      taskId: task.id,
      title: task.title,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarClock className="size-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>
          {description} Times are shown in {timezone}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section
          aria-label="Time block timeline"
          className="rounded-lg border border-border bg-background p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{date}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Blocks can be edited from the schedule list.
              </p>
            </div>
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              {blocks.length} scheduled
            </span>
          </div>

          <div
            className="relative mt-4 min-h-[36rem]"
            style={{ height: `${Math.max(576, timelineHeight)}px` }}
          >
            {timelineHours.map((minutes) => (
              <div
                className="absolute left-0 right-0 grid grid-cols-[4.5rem_1fr] items-center gap-3"
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

            <div className="absolute bottom-0 left-[4.5rem] right-0 top-0 rounded-lg border border-border/80 bg-card/75">
              {blocks.length === 0 ? (
                <div className="flex h-full min-h-60 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                  No time blocks scheduled for this day.
                </div>
              ) : null}

              {blocks.map((block) => {
                const top =
                  (block.start_minutes - visibleRange.start) *
                  TIMELINE_MINUTE_HEIGHT;
                const height = Math.max(
                  28,
                  (block.end_minutes - block.start_minutes) *
                    TIMELINE_MINUTE_HEIGHT,
                );

                return (
                  <button
                    aria-label={`Edit ${block.title}`}
                    className={cn(
                      "absolute left-2 right-2 overflow-hidden rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-left shadow-sm transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      formState.blockId === block.id &&
                        "border-primary bg-primary/15",
                    )}
                    key={block.id}
                    onClick={() => editBlock(block)}
                    style={{
                      height: `${height}px`,
                      top: `${top}px`,
                    }}
                    type="button"
                  >
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {block.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {block.start_time}-{block.end_time}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 className="size-4 text-primary" />
              {formState.blockId ? "Edit block" : "Create block"}
            </h3>

            {error ? (
              <p className="mt-3 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {message ? (
              <p className="mt-3 rounded-md border border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))]/35 px-3 py-2 text-sm text-foreground">
                {message}
              </p>
            ) : null}

            <form
              className="mt-4 space-y-3"
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
              {lockedTaskId ? (
                <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
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

              <div className="flex flex-wrap gap-2 pt-1">
                <Button disabled={isPending} type="submit">
                  <CalendarPlus />
                  {isPending
                    ? "Saving..."
                    : formState.blockId
                      ? "Save block"
                      : "Create block"}
                </Button>
                <Button
                  disabled={isPending}
                  onClick={resetForm}
                  type="button"
                  variant="outline"
                >
                  Clear
                </Button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-border bg-background p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Scheduled blocks
            </h3>
            <div className="mt-3 space-y-3">
              {blocks.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  Add a block to structure the day.
                </p>
              ) : (
                blocks.map((block) => (
                  <article
                    className="rounded-lg border border-border bg-card p-3"
                    key={block.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {block.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {block.start_time}-{block.end_time} |{" "}
                          {formatMinutes(block.duration_minutes)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {taskMeta(block.task)}
                        </p>
                        {block.task ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Actual {formatMinutes(block.actual_minutes)} / est{" "}
                            {formatMinutes(block.task.estimated_minutes)}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        aria-label={`Edit ${block.title}`}
                        disabled={isPending}
                        onClick={() => editBlock(block)}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <Pencil />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          runAction(() =>
                            adjustTimeBlockAction({
                              blockId: block.id,
                              endDeltaMinutes: -TIME_BLOCK_STEP_MINUTES,
                              startDeltaMinutes: -TIME_BLOCK_STEP_MINUTES,
                            }),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ArrowUp />
                        Earlier
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          runAction(() =>
                            adjustTimeBlockAction({
                              blockId: block.id,
                              endDeltaMinutes: TIME_BLOCK_STEP_MINUTES,
                              startDeltaMinutes: TIME_BLOCK_STEP_MINUTES,
                            }),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ArrowDown />
                        Later
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          runAction(() =>
                            adjustTimeBlockAction({
                              blockId: block.id,
                              endDeltaMinutes: -TIME_BLOCK_STEP_MINUTES,
                              startDeltaMinutes: 0,
                            }),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Minus />
                        Shorten
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          runAction(() =>
                            adjustTimeBlockAction({
                              blockId: block.id,
                              endDeltaMinutes: TIME_BLOCK_STEP_MINUTES,
                              startDeltaMinutes: 0,
                            }),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Plus />
                        Extend
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          runAction(() => deleteTimeBlockAction(block.id))
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 />
                        Delete
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {showUnblockedTasks ? (
            <section className="rounded-lg border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Unblocked tasks
              </h3>
              <div className="mt-3 space-y-3">
                {unblockedTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
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
                        onClick={() => blockTask(task)}
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
        </div>
      </CardContent>
    </Card>
  );
}
