"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarPlus, Trash2, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  minutesToTimeInput,
  parseTimeToMinutes,
  TIME_BLOCK_STEP_MINUTES,
} from "@/lib/time-blocks/time";
import { computeOverlapLaneLayout } from "@/lib/time-blocks/layout";
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
  enableDragReposition?: boolean;
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
const TIMELINE_DAY_START_MINUTES = 0;
const TIMELINE_DAY_END_MINUTES = 24 * 60;
const TIMELINE_MINUTE_HEIGHT = 1;
const TIMELINE_TOP_PADDING = 16;
const TIMELINE_BOTTOM_PADDING = 24;
const TIMELINE_VIEWPORT_HEIGHT = "min(70vh, 38rem)";
const SUCCESS_MESSAGE_TIMEOUT_MS = 3000;
const ERROR_MESSAGE_TIMEOUT_MS = 2000;
const DRAG_CLICK_SUPPRESSION_MS = 250;
const DRAG_START_DISTANCE_PX = 4;
const LANE_GAP_PX = 6;

type DaySlotDragTarget = {
  date: string;
  startMinutes: number;
  type: "day-slot";
};

type TimeBlockDragData = {
  blockId: string;
  type: "time-block";
};

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

function getVisibleRange() {
  return {
    end: TIMELINE_DAY_END_MINUTES,
    start: TIMELINE_DAY_START_MINUTES,
  };
}

function getTimelineHours(start: number, end: number) {
  const hours: number[] = [];

  for (let minutes = start; minutes < end; minutes += 60) {
    hours.push(minutes);
  }

  return hours;
}

function getTimelineSlots(start: number, end: number) {
  const slots: number[] = [];

  for (
    let minutes = start;
    minutes <= end - TIME_BLOCK_STEP_MINUTES;
    minutes += TIME_BLOCK_STEP_MINUTES
  ) {
    slots.push(minutes);
  }

  return slots;
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

function getDaySlotTargetId(date: string, startMinutes: number) {
  return `day-slot:${date}:${startMinutes}`;
}

function parseDaySlotTargetId(id: string | null | undefined) {
  if (!id || !id.startsWith("day-slot:")) {
    return null;
  }

  const [, rawDate, rawMinutes] = id.split(":");

  if (!rawDate || !rawMinutes) {
    return null;
  }

  const startMinutes = Number(rawMinutes);

  if (!Number.isFinite(startMinutes)) {
    return null;
  }

  return { date: rawDate, startMinutes };
}

function getLaneStyle(lane: number, laneCount: number): CSSProperties {
  if (laneCount <= 1) {
    return {
      left: "0.25rem",
      right: "0.5rem",
    };
  }

  const clampedLaneCount = Math.max(1, laneCount);
  const widthPercent = 100 / clampedLaneCount;
  const leftPercent = lane * widthPercent;
  const totalGap = LANE_GAP_PX * (clampedLaneCount - 1);
  const widthAdjustment = totalGap / clampedLaneCount;
  const leftGapOffset = lane * LANE_GAP_PX;

  return {
    left: `calc(${leftPercent}% + ${leftGapOffset}px)`,
    width: `calc(${widthPercent}% - ${widthAdjustment}px)`,
  };
}

type TimelineDropSlotProps = {
  date: string;
  isDragging: boolean;
  slotStartMinutes: number;
  visibleStart: number;
};

function TimelineDropSlot({
  date,
  isDragging,
  slotStartMinutes,
  visibleStart,
}: TimelineDropSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    data: {
      date,
      startMinutes: slotStartMinutes,
      type: "day-slot",
    } satisfies DaySlotDragTarget,
    id: getDaySlotTargetId(date, slotStartMinutes),
  });

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute left-[3.25rem] right-0 border-l border-transparent transition-colors sm:left-[4rem]",
        isDragging ? "pointer-events-auto" : "pointer-events-none",
        isOver && "bg-secondary/40",
      )}
      data-day-slot-target={`${date}-${slotStartMinutes}`}
      ref={setNodeRef}
      style={{
        height: `${TIME_BLOCK_STEP_MINUTES * TIMELINE_MINUTE_HEIGHT}px`,
        top: `${
          TIMELINE_TOP_PADDING +
          (slotStartMinutes - visibleStart) * TIMELINE_MINUTE_HEIGHT
        }px`,
      }}
    />
  );
}

type DraggableTimeBlockProps = {
  block: TimeBlockItem;
  className: string;
  enableDrag: boolean;
  isActive: boolean;
  onClick: () => void;
  style: CSSProperties;
  children: ReactNode;
};

function DraggableTimeBlock({
  block,
  className,
  enableDrag,
  isActive,
  onClick,
  style,
  children,
}: DraggableTimeBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      data: {
        blockId: block.id,
        type: "time-block",
      } satisfies TimeBlockDragData,
      disabled: !enableDrag,
      id: `time-block:${block.id}`,
    });
  const dragStyle = CSS.Translate.toString(transform);

  return (
    <button
      aria-label={`Edit ${block.title}`}
      className={cn(
        className,
        isActive && "border-primary/60 bg-secondary",
        enableDrag && "cursor-grab active:cursor-grabbing",
      )}
      onClick={onClick}
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.35 : 1,
        transform: dragStyle,
        zIndex: isDragging ? 40 : style.zIndex,
      }}
      type="button"
      {...attributes}
      {...listeners}
    >
      {children}
    </button>
  );
}

export function TimeBlockingPanel({
  blocks,
  date,
  description,
  enableDragReposition = false,
  lockedTaskId,
  showUnblockedTasks = false,
  taskOptions,
  timezone,
  title,
  unblockedTasks = [],
}: TimeBlockingPanelProps) {
  const router = useRouter();
  const calendarScrollRef = useRef<HTMLDivElement | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [formState, setFormState] = useState<TimeBlockFormState>(() =>
    getInitialForm(date, lockedTaskId),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDraggedBlockId, setActiveDraggedBlockId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_START_DISTANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedTask = useMemo(
    () => taskOptions.find((task) => task.id === formState.taskId) ?? null,
    [formState.taskId, taskOptions],
  );
  const lockedTask = lockedTaskId
    ? (taskOptions.find((task) => task.id === lockedTaskId) ?? null)
    : null;
  const visibleRange = getVisibleRange();
  const timelineSlots = useMemo(
    () => getTimelineSlots(visibleRange.start, visibleRange.end),
    [visibleRange.end, visibleRange.start],
  );
  const blocksById = useMemo(
    () => new Map(blocks.map((block) => [block.id, block])),
    [blocks],
  );
  const laneLayoutByBlockId = useMemo(
    () =>
      computeOverlapLaneLayout(
        blocks.map((block) => ({
          endMinutes: block.end_minutes,
          id: block.id,
          startMinutes: block.start_minutes,
        })),
      ),
    [blocks],
  );
  const activeDraggedBlock = activeDraggedBlockId
    ? (blocksById.get(activeDraggedBlockId) ?? null)
    : null;
  const firstBlockStartMinutes = useMemo(
    () =>
      blocks.length > 0
        ? Math.min(...blocks.map((block) => block.start_minutes))
        : null,
    [blocks],
  );
  const timelineHours = getTimelineHours(visibleRange.start, visibleRange.end);
  const timelineHeight =
    (visibleRange.end - visibleRange.start) * TIMELINE_MINUTE_HEIGHT;
  const timelineContentHeight =
    timelineHeight + TIMELINE_TOP_PADDING + TIMELINE_BOTTOM_PADDING;
  const modalTitle = formState.blockId
    ? "Edit time block"
    : "Create time block";

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    const scrollContainer = calendarScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    if (firstBlockStartMinutes === null) {
      scrollContainer.scrollTop = 0;
      return;
    }

    scrollContainer.scrollTop = Math.max(
      0,
      TIMELINE_TOP_PADDING +
        (firstBlockStartMinutes - visibleRange.start) * TIMELINE_MINUTE_HEIGHT -
        48,
    );
  }, [date, firstBlockStartMinutes, visibleRange.start]);

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

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, SUCCESS_MESSAGE_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError(null);
    }, ERROR_MESSAGE_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

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
      let result: { message?: string; status: string };

      try {
        result = await action();
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Unable to update time blocks.",
        );
        return;
      }

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

  function handleDragStart(event: DragStartEvent) {
    const dragData = event.active.data.current as TimeBlockDragData | undefined;

    if (dragData?.type !== "time-block") {
      return;
    }

    setActiveDraggedBlockId(dragData.blockId);
  }

  function handleDragCancel() {
    setActiveDraggedBlockId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const dragData = event.active.data.current as TimeBlockDragData | undefined;
    const overId = event.over?.id.toString();
    const overData = event.over?.data.current as DaySlotDragTarget | undefined;
    const parsedTarget = parseDaySlotTargetId(overId);
    const dropTarget =
      overData?.type === "day-slot"
        ? { date: overData.date, startMinutes: overData.startMinutes }
        : parsedTarget;

    setActiveDraggedBlockId(null);

    if (dragData?.type !== "time-block") {
      return;
    }

    if (!dropTarget || dropTarget.date !== date) {
      return;
    }

    const block = blocksById.get(dragData.blockId);

    if (!block) {
      return;
    }

    suppressClickUntilRef.current = Date.now() + DRAG_CLICK_SUPPRESSION_MS;

    const durationMinutes = block.end_minutes - block.start_minutes;
    const nextStartMinutes = dropTarget.startMinutes;
    const nextEndMinutes = nextStartMinutes + durationMinutes;

    if (nextStartMinutes === block.start_minutes) {
      return;
    }

    if (nextEndMinutes > TIMELINE_DAY_END_MINUTES) {
      setError("Time blocks must stay inside the selected day.");
      return;
    }

    runAction(
      () =>
        upsertTimeBlockAction({
          blockDate: date,
          blockId: block.id,
          endTime: minutesToTimeInput(nextEndMinutes),
          startTime: minutesToTimeInput(nextStartMinutes),
          taskId: block.task_id,
          title: block.title,
        }),
      false,
    );
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
          <DndContext
            collisionDetection={pointerWithin}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            sensors={sensors}
          >
            <section
              aria-label="Time block timeline"
              className="overflow-hidden rounded-lg border border-border bg-background"
            >
              <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {date}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {enableDragReposition
                      ? "Click an open time to create, click a block to edit, or drag a block to move it."
                      : "Click an open time to create a block, or click a block to edit it."}
                  </p>
                </div>
                <span className="w-fit rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  {blocks.length} scheduled
                </span>
              </div>

              <div
                className="overflow-y-auto overflow-x-hidden"
                data-time-block-calendar-scroll=""
                ref={calendarScrollRef}
                style={{ height: TIMELINE_VIEWPORT_HEIGHT }}
              >
                <div
                  className="relative min-h-full"
                  style={{
                    height: `${Math.max(768, timelineContentHeight)}px`,
                  }}
                >
                  {timelineHours.map((minutes) => (
                    <div
                      className="absolute left-0 right-0 grid grid-cols-[3.25rem_1fr] items-start gap-2 sm:grid-cols-[4rem_1fr]"
                      key={minutes}
                      style={{
                        top: `${
                          TIMELINE_TOP_PADDING +
                          (minutes - visibleRange.start) *
                            TIMELINE_MINUTE_HEIGHT
                        }px`,
                      }}
                    >
                      <span className="-mt-2 text-right text-[11px] leading-4 text-muted-foreground">
                        {formatHour(minutes)}
                      </span>
                      <span className="h-px origin-left scale-y-50 bg-border/70" />
                    </div>
                  ))}

                  <button
                    aria-label="Create a time block from the calendar"
                    className="absolute left-[3.25rem] right-0 border-l border-border/70 bg-card/45 text-left transition-colors hover:bg-card/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:left-[4rem]"
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
                    style={{
                      bottom: `${TIMELINE_BOTTOM_PADDING}px`,
                      top: `${TIMELINE_TOP_PADDING}px`,
                    }}
                    type="button"
                  >
                    {blocks.length === 0 ? (
                      <span className="absolute left-4 top-6 text-sm text-muted-foreground">
                        Click the calendar to create your first time block.
                      </span>
                    ) : null}
                  </button>

                  {enableDragReposition
                    ? timelineSlots.map((slotStartMinutes) => (
                        <TimelineDropSlot
                          date={date}
                          isDragging={activeDraggedBlockId !== null}
                          key={slotStartMinutes}
                          slotStartMinutes={slotStartMinutes}
                          visibleStart={visibleRange.start}
                        />
                      ))
                    : null}

                  <div
                    className="pointer-events-none absolute left-[3.25rem] right-0 sm:left-[4rem]"
                    style={{
                      bottom: `${TIMELINE_BOTTOM_PADDING}px`,
                      top: `${TIMELINE_TOP_PADDING}px`,
                    }}
                  >
                    {blocks.map((block) => {
                      const top =
                        (block.start_minutes - visibleRange.start) *
                        TIMELINE_MINUTE_HEIGHT;
                      const height = Math.max(
                        28,
                        (block.end_minutes - block.start_minutes) *
                          TIMELINE_MINUTE_HEIGHT,
                      );
                      const isCompactBlock = height < 44;
                      const showTaskMeta = height >= 64;
                      const showActualTime = height >= 84;
                      const laneLayout = laneLayoutByBlockId.get(block.id) ?? {
                        lane: 0,
                        laneCount: 1,
                      };

                      return (
                        <DraggableTimeBlock
                          block={block}
                          className="pointer-events-auto absolute overflow-hidden rounded-md border border-border bg-secondary/90 px-2.5 py-1 text-left shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          enableDrag={enableDragReposition}
                          isActive={
                            formState.blockId === block.id && isModalOpen
                          }
                          key={block.id}
                          onClick={() => {
                            if (Date.now() < suppressClickUntilRef.current) {
                              return;
                            }

                            openEditModal(block);
                          }}
                          style={{
                            ...getLaneStyle(
                              laneLayout.lane,
                              laneLayout.laneCount,
                            ),
                            height: `${height}px`,
                            top: `${top}px`,
                          }}
                        >
                          {isCompactBlock ? (
                            <span className="flex h-full min-w-0 items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-5 text-foreground">
                                {block.title}
                              </span>
                              <span className="shrink-0 text-[11px] leading-5 text-muted-foreground">
                                {block.start_time}-{block.end_time}
                              </span>
                            </span>
                          ) : (
                            <>
                              <span className="block truncate text-sm font-semibold leading-5 text-foreground">
                                {block.title}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {block.start_time}-{block.end_time} |{" "}
                                {formatMinutes(block.duration_minutes)}
                              </span>
                              {showTaskMeta ? (
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                  {taskMeta(block.task)}
                                </span>
                              ) : null}
                              {showActualTime && block.task ? (
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                  Actual {formatMinutes(block.actual_minutes)} /
                                  est{" "}
                                  {formatMinutes(block.task.estimated_minutes)}
                                </span>
                              ) : null}
                            </>
                          )}
                        </DraggableTimeBlock>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
            <DragOverlay>
              {activeDraggedBlock ? (
                <div className="max-w-[20rem] rounded-md border border-border bg-card px-2.5 py-1 shadow-xl">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {activeDraggedBlock.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {activeDraggedBlock.start_time}-
                    {activeDraggedBlock.end_time}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

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
                              TIMELINE_DAY_START_MINUTES,
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
        <div className="fixed inset-0 z-50 !m-0 flex items-end justify-center bg-foreground/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            aria-modal="true"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl sm:max-h-[calc(100dvh-3rem)]"
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
              className="flex min-h-0 flex-1 flex-col"
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
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
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
              </div>

              <div className="flex flex-shrink-0 flex-col-reverse gap-2 border-t border-border px-4 pb-5 pt-4 sm:flex-row sm:justify-between sm:px-6">
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
