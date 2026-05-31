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
import { usePathname, useRouter } from "next/navigation";
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
import {
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";

import {
  getAdjacentPlannerDate,
  getMonthCells,
  getMonthsForYear,
} from "@/lib/planner/calendar";
import type {
  PlannerCalendarData,
  PlannerCalendarRangeBlock,
  PlannerCalendarView,
} from "@/lib/planner/types";
import {
  deleteTimeBlockAction,
  upsertTimeBlockAction,
} from "@/lib/time-blocks/actions";
import {
  addDaysToIsoDate,
  minutesToTimeInput,
  parseTimeToMinutes,
  TIME_BLOCK_STEP_MINUTES,
} from "@/lib/time-blocks/time";
import { computeOverlapLaneLayout } from "@/lib/time-blocks/layout";
import type { TimeBlockTaskOption } from "@/lib/time-blocks/types";
import { cn } from "@/lib/utils";
import { TimeBlockingPanel } from "@/components/time-blocks/time-blocking-panel";
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

type PlannerCalendarProps = {
  data: PlannerCalendarData;
};

type PlannerBlockFormState = {
  blockDate: string;
  blockId: string | null;
  endTime: string;
  startTime: string;
  taskId: string;
  title: string;
};

const VIEW_OPTIONS: Array<{ label: string; value: PlannerCalendarView }> = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEK_HOUR_START = 0;
const WEEK_HOUR_END = 24 * 60;
const WEEK_MINUTE_HEIGHT = 1;
const WEEK_VIEWPORT_HEIGHT = "min(72vh, 42rem)";
const DEFAULT_FORM_START = "09:00";
const DEFAULT_FORM_DURATION_MINUTES = 30;
const SUCCESS_MESSAGE_TIMEOUT_MS = 3000;
const ERROR_MESSAGE_TIMEOUT_MS = 3000;
const DRAG_CLICK_SUPPRESSION_MS = 50;
const DRAG_START_DISTANCE_PX = 4;
const LANE_GAP_PX = 6;
const MAX_WEEK_COLUMNS = 7;
const MAX_MONTH_SNIPPETS = 3;

type WeekSlotDropData = {
  date: string;
  startMinutes: number;
  type: "week-slot";
};

type MonthDayDropData = {
  date: string;
  type: "month-day";
};

type WeekBlockDragData = {
  blockId: string;
  type: "week-block";
};

type MonthBlockDragData = {
  blockId: string;
  type: "month-block";
};

function getUtcDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function formatHeaderDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
  }).format(getUtcDate(date));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(getUtcDate(date));
}

function formatMonthLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(getUtcDate(date));
}

function formatYearLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
  }).format(getUtcDate(date));
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(getUtcDate(date));
}

function formatHour(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour} ${suffix}`;
}

function getWeekHours() {
  const hours: number[] = [];

  for (let minutes = WEEK_HOUR_START; minutes < WEEK_HOUR_END; minutes += 60) {
    hours.push(minutes);
  }

  return hours;
}

function getWeekSlots() {
  const slots: number[] = [];

  for (
    let minutes = WEEK_HOUR_START;
    minutes <= WEEK_HOUR_END - TIME_BLOCK_STEP_MINUTES;
    minutes += TIME_BLOCK_STEP_MINUTES
  ) {
    slots.push(minutes);
  }

  return slots;
}

function getWeekSlotDropId(date: string, startMinutes: number) {
  return `week-slot:${date}:${startMinutes}`;
}

function getMonthDayDropId(date: string) {
  return `month-day:${date}`;
}

function parseWeekSlotDropId(id: string | null | undefined) {
  if (!id || !id.startsWith("week-slot:")) {
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

function parseMonthDayDropId(id: string | null | undefined) {
  if (!id || !id.startsWith("month-day:")) {
    return null;
  }

  const [, rawDate] = id.split(":");
  return rawDate ? { date: rawDate } : null;
}

function getLaneStyle(lane: number, laneCount: number): CSSProperties {
  if (laneCount <= 1) {
    return {
      left: "0.25rem",
      right: "0.25rem",
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

type WeekSlotDropTargetProps = {
  date: string;
  isDragging: boolean;
  slotStartMinutes: number;
};

function WeekSlotDropTarget({
  date,
  isDragging,
  slotStartMinutes,
}: WeekSlotDropTargetProps) {
  const { isOver, setNodeRef } = useDroppable({
    data: {
      date,
      startMinutes: slotStartMinutes,
      type: "week-slot",
    } satisfies WeekSlotDropData,
    id: getWeekSlotDropId(date, slotStartMinutes),
  });

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute left-0 right-0 border-l border-transparent transition-colors",
        isDragging ? "pointer-events-auto" : "pointer-events-none",
        isOver && "bg-secondary/40",
      )}
      data-week-slot-target={`${date}-${slotStartMinutes}`}
      ref={setNodeRef}
      style={{
        height: `${TIME_BLOCK_STEP_MINUTES * WEEK_MINUTE_HEIGHT}px`,
        top: `${(slotStartMinutes - WEEK_HOUR_START) * WEEK_MINUTE_HEIGHT}px`,
      }}
    />
  );
}

type MonthDayDropTargetProps = {
  children: ReactNode;
  className?: string;
  date: string;
  onClick: () => void;
};

function MonthDayDropTarget({
  children,
  className,
  date,
  onClick,
}: MonthDayDropTargetProps) {
  const { isOver, setNodeRef } = useDroppable({
    data: {
      date,
      type: "month-day",
    } satisfies MonthDayDropData,
    id: getMonthDayDropId(date),
  });

  return (
    <div
      className={cn(className, isOver && "bg-secondary/45")}
      data-month-day-target={date}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      ref={setNodeRef}
      role="button"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

type DraggablePlannerItemProps = {
  children: ReactNode;
  className: string;
  data: WeekBlockDragData | MonthBlockDragData;
  id: string;
  onClick: () => void;
  style?: CSSProperties;
};

function DraggablePlannerItem({
  children,
  className,
  data,
  id,
  onClick,
  style,
}: DraggablePlannerItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      data,
      id,
    });
  const dragStyle = CSS.Translate.toString(transform);

  return (
    <button
      className={cn(className, "cursor-grab active:cursor-grabbing")}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.35 : 1,
        transform: dragStyle,
        zIndex: isDragging ? 40 : style?.zIndex,
      }}
      type="button"
      {...attributes}
      {...listeners}
    >
      {children}
    </button>
  );
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

function getInitialForm(date: string): PlannerBlockFormState {
  return {
    blockDate: date,
    blockId: null,
    endTime: addMinutesToTime(
      DEFAULT_FORM_START,
      DEFAULT_FORM_DURATION_MINUTES,
    ),
    startTime: DEFAULT_FORM_START,
    taskId: "",
    title: "",
  };
}

function getWeekDates(startDate: string) {
  const dates: string[] = [];

  for (let index = 0; index < MAX_WEEK_COLUMNS; index += 1) {
    const nextDate = addDaysToIsoDate(startDate, index);

    if (!nextDate) {
      continue;
    }

    dates.push(nextDate);
  }

  return dates;
}

function getWeekRangeLabel(startDate: string) {
  const endDate =
    addDaysToIsoDate(startDate, MAX_WEEK_COLUMNS - 1) ?? startDate;
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

function getRangeTitle(
  view: PlannerCalendarView,
  date: string,
  rangeStartDate: string,
) {
  if (view === "day") {
    return formatHeaderDate(date);
  }

  if (view === "week") {
    return getWeekRangeLabel(rangeStartDate);
  }

  if (view === "month") {
    return formatMonthLabel(date);
  }

  return formatYearLabel(date);
}

function toDateBlocksMap(blocks: PlannerCalendarRangeBlock[]) {
  const map = new Map<string, PlannerCalendarRangeBlock[]>();

  for (const block of blocks) {
    const entries = map.get(block.start_local_date) ?? [];
    entries.push(block);
    map.set(block.start_local_date, entries);
  }

  for (const entries of map.values()) {
    entries.sort((left, right) => left.start_minutes - right.start_minutes);
  }

  return map;
}

function getClickedStartMinute({
  clientY,
  timelineTop,
}: {
  clientY: number;
  timelineTop: number;
}) {
  const clickedMinutes =
    WEEK_HOUR_START + (clientY - timelineTop) / WEEK_MINUTE_HEIGHT;
  const snappedMinutes =
    Math.floor(clickedMinutes / TIME_BLOCK_STEP_MINUTES) *
    TIME_BLOCK_STEP_MINUTES;

  return Math.max(
    WEEK_HOUR_START,
    Math.min(snappedMinutes, WEEK_HOUR_END - DEFAULT_FORM_DURATION_MINUTES),
  );
}

function clipBlockToVisibleHours(block: PlannerCalendarRangeBlock) {
  const start = Math.max(WEEK_HOUR_START, block.start_minutes);
  const end = Math.min(WEEK_HOUR_END, block.end_minutes);

  if (end <= WEEK_HOUR_START || start >= WEEK_HOUR_END || end <= start) {
    return null;
  }

  return { end, start };
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime} - ${endTime}`;
}

export function PlannerCalendar({ data }: PlannerCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const suppressClickUntilRef = useRef(0);
  const [formState, setFormState] = useState<PlannerBlockFormState>(() =>
    getInitialForm(data.date),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [yearDayModalDate, setYearDayModalDate] = useState<string | null>(null);
  const [activeDragBlockId, setActiveDragBlockId] = useState<string | null>(
    null,
  );
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
  const hours = useMemo(() => getWeekHours(), []);
  const weekSlots = useMemo(() => getWeekSlots(), []);
  const weekDates = useMemo(
    () => getWeekDates(data.range.startDate),
    [data.range.startDate],
  );
  const blocksById = useMemo(
    () => new Map(data.rangeBlocks.map((block) => [block.id, block])),
    [data.rangeBlocks],
  );
  const blocksByDate = useMemo(
    () => toDateBlocksMap(data.rangeBlocks),
    [data.rangeBlocks],
  );
  const weekLaneLayoutByDate = useMemo(() => {
    const layouts = new Map<
      string,
      ReturnType<typeof computeOverlapLaneLayout>
    >();

    for (const weekDate of weekDates) {
      const dayBlocks = blocksByDate.get(weekDate) ?? [];
      layouts.set(
        weekDate,
        computeOverlapLaneLayout(
          dayBlocks.map((block) => ({
            endMinutes: block.end_minutes,
            id: block.id,
            startMinutes: block.start_minutes,
          })),
        ),
      );
    }

    return layouts;
  }, [blocksByDate, weekDates]);
  const selectedTask = useMemo(
    () =>
      data.selectedDay.taskOptions.find(
        (task) => task.id === formState.taskId,
      ) ?? null,
    [data.selectedDay.taskOptions, formState.taskId],
  );
  const timelineHeight = (WEEK_HOUR_END - WEEK_HOUR_START) * WEEK_MINUTE_HEIGHT;
  const activeDragBlock = activeDragBlockId
    ? (blocksById.get(activeDragBlockId) ?? null)
    : null;
  const isYearDayModalOpen = yearDayModalDate !== null;
  const yearDayModalBlocks = yearDayModalDate
    ? (blocksByDate.get(yearDayModalDate) ?? [])
    : [];
  const modalTitle = formState.blockId
    ? "Edit time block"
    : "Create time block";

  useBodyScrollLock(isModalOpen || isYearDayModalOpen);

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

  useEffect(() => {
    if (!isYearDayModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setYearDayModalDate(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isYearDayModalOpen]);

  function navigate(view: PlannerCalendarView, date: string) {
    const searchParams = new URLSearchParams({
      date,
      view,
    });
    router.push(`${pathname}?${searchParams.toString()}`, { scroll: false });
  }

  function openModal(nextFormState: PlannerBlockFormState) {
    setError(null);
    setMessage(null);
    setFormState(nextFormState);
    setIsModalOpen(true);
  }

  function openCreateModal(date: string, startMinutes: number) {
    const startTime = minutesToTimeInput(startMinutes);
    openModal({
      blockDate: date,
      blockId: null,
      endTime: minutesToTimeInput(startMinutes + DEFAULT_FORM_DURATION_MINUTES),
      startTime,
      taskId: "",
      title: "",
    });
  }

  function getDefaultCreateStartMinutes() {
    return parseTimeToMinutes(DEFAULT_FORM_START) ?? WEEK_HOUR_START;
  }

  function openEditModal(block: PlannerCalendarRangeBlock) {
    openModal({
      blockDate: block.start_local_date,
      blockId: block.id,
      endTime: block.end_time,
      startTime: block.start_time,
      taskId: block.task_id ?? "",
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

  function moveBlockToDateAndTime(
    block: PlannerCalendarRangeBlock,
    targetDate: string,
    targetStartMinutes: number,
  ) {
    const durationMinutes = block.end_minutes - block.start_minutes;
    const targetEndMinutes = targetStartMinutes + durationMinutes;

    if (targetEndMinutes > WEEK_HOUR_END) {
      setError("Time blocks must stay inside the selected day.");
      return;
    }

    if (
      block.start_local_date === targetDate &&
      block.start_minutes === targetStartMinutes
    ) {
      return;
    }

    runAction(
      () =>
        upsertTimeBlockAction({
          blockDate: targetDate,
          blockId: block.id,
          endTime: minutesToTimeInput(targetEndMinutes),
          startTime: minutesToTimeInput(targetStartMinutes),
          taskId: block.task_id,
          title: block.title,
        }),
      false,
    );
  }

  function moveBlockToDatePreservingTime(
    block: PlannerCalendarRangeBlock,
    targetDate: string,
  ) {
    if (block.start_local_date === targetDate) {
      return;
    }

    runAction(
      () =>
        upsertTimeBlockAction({
          blockDate: targetDate,
          blockId: block.id,
          endTime: block.end_time,
          startTime: block.start_time,
          taskId: block.task_id,
          title: block.title,
        }),
      false,
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const dragData = event.active.data.current as
      | WeekBlockDragData
      | MonthBlockDragData
      | undefined;

    if (dragData?.type !== "week-block" && dragData?.type !== "month-block") {
      return;
    }

    setActiveDragBlockId(dragData.blockId);
  }

  function handleDragCancel() {
    setActiveDragBlockId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const dragData = event.active.data.current as
      | WeekBlockDragData
      | MonthBlockDragData
      | undefined;
    const overData = event.over?.data.current as
      | WeekSlotDropData
      | MonthDayDropData
      | undefined;
    const overId = event.over?.id.toString();
    const parsedWeekDrop = parseWeekSlotDropId(overId);
    const parsedMonthDrop = parseMonthDayDropId(overId);

    setActiveDragBlockId(null);

    if (!dragData) {
      return;
    }

    const block = blocksById.get(dragData.blockId);

    if (!block) {
      return;
    }

    const weekDropTarget =
      overData?.type === "week-slot"
        ? { date: overData.date, startMinutes: overData.startMinutes }
        : parsedWeekDrop;
    const monthDropTarget =
      overData?.type === "month-day"
        ? { date: overData.date }
        : parsedMonthDrop;

    if (dragData.type === "week-block" && weekDropTarget) {
      suppressClickUntilRef.current = Date.now() + DRAG_CLICK_SUPPRESSION_MS;
      moveBlockToDateAndTime(
        block,
        weekDropTarget.date,
        weekDropTarget.startMinutes,
      );
      return;
    }

    if (dragData.type === "month-block" && monthDropTarget) {
      suppressClickUntilRef.current = Date.now() + DRAG_CLICK_SUPPRESSION_MS;
      moveBlockToDatePreservingTime(block, monthDropTarget.date);
    }
  }

  const selectedDayPanel = (
    <TimeBlockingPanel
      blocks={data.selectedDay.blocks}
      date={data.selectedDay.date}
      description="Place planned tasks into realistic blocks and leave flexible work unscheduled."
      enableDragReposition={data.view === "day"}
      showUnblockedTasks
      taskOptions={data.selectedDay.taskOptions}
      timezone={data.timezone}
      title="Daily schedule"
      unblockedTasks={data.selectedDay.unblockedTasks}
    />
  );

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarClock className="size-5 text-primary" />
                Planner calendar
              </CardTitle>
              <CardDescription>
                View and schedule blocks in {data.timezone}.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {VIEW_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => navigate(option.value, data.date)}
                  size="sm"
                  type="button"
                  variant={option.value === data.view ? "default" : "outline"}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() =>
                navigate(
                  data.view,
                  getAdjacentPlannerDate(data.view, data.date, "previous"),
                )
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronLeft />
              Prev
            </Button>
            <Button
              onClick={() =>
                navigate(
                  data.view,
                  getAdjacentPlannerDate(data.view, data.date, "next"),
                )
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Next
              <ChevronRight />
            </Button>
            <Button
              onClick={() => navigate(data.view, data.todayDate)}
              size="sm"
              type="button"
              variant="outline"
            >
              Today
            </Button>
            <span className="ml-1 text-sm text-muted-foreground">
              {getRangeTitle(data.view, data.date, data.range.startDate)}
            </span>
          </div>

          {message ? (
            <p className="rounded-md border border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))]/35 px-3 py-2 text-sm text-foreground">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardHeader>

        <DndContext
          collisionDetection={pointerWithin}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          {data.view === "week" ? (
            <CardContent>
              <section
                aria-label="Weekly calendar"
                className="overflow-hidden rounded-lg border border-border"
              >
                <div className="overflow-x-auto">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-border bg-background">
                      <div className="border-r border-border px-2 py-2 text-xs text-muted-foreground">
                        Time
                      </div>
                      {weekDates.map((weekDate) => (
                        <button
                          className={cn(
                            "border-r border-border px-3 py-2 text-left last:border-r-0",
                            weekDate === data.date && "bg-secondary/60",
                          )}
                          key={weekDate}
                          onClick={() => navigate("week", weekDate)}
                          type="button"
                        >
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            {formatWeekday(weekDate)}
                          </p>
                          <p className="text-xl font-semibold text-foreground">
                            {new Intl.DateTimeFormat("en-US", {
                              day: "numeric",
                              timeZone: "UTC",
                            }).format(getUtcDate(weekDate))}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div
                      className="overflow-y-auto"
                      style={{ maxHeight: WEEK_VIEWPORT_HEIGHT }}
                    >
                      <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] bg-background">
                        <div className="relative border-r border-border">
                          {hours.map((hour) => (
                            <div
                              className="absolute left-0 right-0 border-t border-border/75"
                              key={hour}
                              style={{
                                top: `${(hour - WEEK_HOUR_START) * WEEK_MINUTE_HEIGHT}px`,
                              }}
                            >
                              <span className="-mt-2 block pl-2 text-xs text-muted-foreground">
                                {formatHour(hour)}
                              </span>
                            </div>
                          ))}
                          <div style={{ height: `${timelineHeight}px` }} />
                        </div>

                        {weekDates.map((weekDate) => {
                          const dayBlocks = blocksByDate.get(weekDate) ?? [];
                          const dayLaneLayout =
                            weekLaneLayoutByDate.get(weekDate);

                          return (
                            <div
                              className={cn(
                                "relative border-r border-border last:border-r-0",
                                weekDate === data.date && "bg-secondary/20",
                              )}
                              key={weekDate}
                            >
                              {hours.map((hour) => (
                                <div
                                  className="absolute left-0 right-0 border-t border-border/75"
                                  key={`${weekDate}-${hour}`}
                                  style={{
                                    top: `${(hour - WEEK_HOUR_START) * WEEK_MINUTE_HEIGHT}px`,
                                  }}
                                />
                              ))}

                              <button
                                aria-label={`Create a time block on ${weekDate}`}
                                className="absolute inset-0 z-0 cursor-pointer bg-transparent hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                onClick={(event) => {
                                  const rect =
                                    event.currentTarget.getBoundingClientRect();
                                  openCreateModal(
                                    weekDate,
                                    getClickedStartMinute({
                                      clientY: event.clientY,
                                      timelineTop: rect.top,
                                    }),
                                  );
                                }}
                                type="button"
                              />

                              {weekSlots.map((slotStartMinutes) => (
                                <WeekSlotDropTarget
                                  date={weekDate}
                                  isDragging={activeDragBlockId !== null}
                                  key={`${weekDate}-${slotStartMinutes}`}
                                  slotStartMinutes={slotStartMinutes}
                                />
                              ))}

                              {dayBlocks.map((block) => {
                                const clippedRange =
                                  clipBlockToVisibleHours(block);

                                if (!clippedRange) {
                                  return null;
                                }

                                const top =
                                  (clippedRange.start - WEEK_HOUR_START) *
                                  WEEK_MINUTE_HEIGHT;
                                const height = Math.max(
                                  30,
                                  (clippedRange.end - clippedRange.start) *
                                    WEEK_MINUTE_HEIGHT,
                                );
                                const laneLayout = dayLaneLayout?.get(
                                  block.id,
                                ) ?? {
                                  lane: 0,
                                  laneCount: 1,
                                };

                                return (
                                  <DraggablePlannerItem
                                    className="absolute z-10 overflow-hidden rounded-md border border-border bg-secondary px-2 py-1 text-left shadow-sm transition-colors hover:bg-secondary/85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    data={{
                                      blockId: block.id,
                                      type: "week-block",
                                    }}
                                    id={`week-block:${block.id}`}
                                    key={block.id}
                                    onClick={() => {
                                      if (
                                        Date.now() <
                                        suppressClickUntilRef.current
                                      ) {
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
                                    <p className="truncate text-xs font-semibold text-foreground">
                                      {block.title}
                                    </p>
                                    {block.duration_minutes > 30 ? (
                                      <p className="truncate text-[11px] text-muted-foreground">
                                        {formatTimeRange(
                                          block.start_time,
                                          block.end_time,
                                        )}
                                      </p>
                                    ) : null}
                                  </DraggablePlannerItem>
                                );
                              })}

                              <div style={{ height: `${timelineHeight}px` }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </CardContent>
          ) : null}

          {data.view === "month" ? (
            <CardContent>
              <section
                aria-label="Monthly calendar"
                className="overflow-hidden rounded-lg border border-border bg-background"
              >
                <div className="grid grid-cols-7 border-b border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <span key={`month-weekday-${index}`}>{label}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {getMonthCells(data.date).map((cell) => {
                    const dayBlocks = blocksByDate.get(cell.date) ?? [];
                    const snippets = dayBlocks.slice(0, MAX_MONTH_SNIPPETS);
                    const hiddenCount = Math.max(
                      0,
                      dayBlocks.length - snippets.length,
                    );

                    return (
                      <MonthDayDropTarget
                        className={cn(
                          "min-h-[8.5rem] border-b border-r border-border p-2 text-left last:border-r-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          !cell.isCurrentMonth &&
                            "bg-muted/40 text-muted-foreground",
                          cell.date === data.date && "bg-secondary/35",
                        )}
                        date={cell.date}
                        key={cell.date}
                        onClick={() =>
                          openCreateModal(
                            cell.date,
                            getDefaultCreateStartMinutes(),
                          )
                        }
                      >
                        <p
                          className={cn(
                            "text-xs font-semibold",
                            !cell.isCurrentMonth && "text-muted-foreground/80",
                          )}
                        >
                          {cell.dayNumber}
                        </p>
                        <div className="mt-2 space-y-1">
                          {snippets.map((block) => (
                            <DraggablePlannerItem
                              className="block w-full truncate rounded bg-secondary/70 px-1.5 py-0.5 text-left text-[11px] font-medium text-secondary-foreground hover:bg-secondary/85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              data={{
                                blockId: block.id,
                                type: "month-block",
                              }}
                              id={`month-block:${block.id}`}
                              key={block.id}
                              onClick={() => {
                                if (
                                  Date.now() < suppressClickUntilRef.current
                                ) {
                                  return;
                                }

                                openEditModal(block);
                              }}
                            >
                              {block.title}
                            </DraggablePlannerItem>
                          ))}
                          {hiddenCount > 0 ? (
                            <p className="text-[11px] text-muted-foreground">
                              +{hiddenCount} more
                            </p>
                          ) : null}
                        </div>
                      </MonthDayDropTarget>
                    );
                  })}
                </div>
              </section>
            </CardContent>
          ) : null}

          {data.view === "year" ? (
            <CardContent>
              <section
                aria-label="Yearly calendar"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {getMonthsForYear(data.date).map((month) => {
                  const firstDate = month.firstDate;
                  const monthCells = getMonthCells(firstDate);
                  const monthLabel = new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    timeZone: "UTC",
                  }).format(getUtcDate(firstDate));

                  return (
                    <article
                      className="rounded-lg border border-border bg-background p-3"
                      key={firstDate}
                    >
                      <p className="text-lg font-semibold text-foreground">
                        {monthLabel}
                      </p>
                      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px] text-muted-foreground">
                        {WEEKDAY_LABELS.map((label, index) => (
                          <span key={`${firstDate}-weekday-${index}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 grid grid-cols-7 gap-y-1">
                        {monthCells.map((cell) => {
                          const hasBlocks =
                            (blocksByDate.get(cell.date)?.length ?? 0) > 0;
                          const isSelected = cell.date === data.date;

                          return (
                            <button
                              className={cn(
                                "mx-auto flex size-7 items-center justify-center rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                !cell.isCurrentMonth &&
                                  "text-muted-foreground/65",
                                hasBlocks &&
                                  cell.isCurrentMonth &&
                                  "text-primary",
                                isSelected &&
                                  "bg-primary text-primary-foreground hover:bg-primary/90",
                              )}
                              key={cell.date}
                              onClick={() => setYearDayModalDate(cell.date)}
                              type="button"
                            >
                              {cell.dayNumber}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </section>
            </CardContent>
          ) : null}
          <DragOverlay>
            {activeDragBlock ? (
              <div className="max-w-[20rem] rounded-md border border-border bg-card px-2.5 py-1 shadow-xl">
                <p className="truncate text-sm font-semibold text-foreground">
                  {activeDragBlock.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatTimeRange(
                    activeDragBlock.start_time,
                    activeDragBlock.end_time,
                  )}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Card>

      {data.view === "day" ? (
        selectedDayPanel
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
            Selected day
          </h2>
          {selectedDayPanel}
        </section>
      )}

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
                    taskId: formState.taskId || null,
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

                <div className="space-y-1.5">
                  <Label htmlFor="planner-time-block-task">Task</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    id="planner-time-block-task"
                    onChange={(event) => {
                      const taskId = event.target.value;
                      const task =
                        data.selectedDay.taskOptions.find(
                          (option) => option.id === taskId,
                        ) ?? null;
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
                    {data.selectedDay.taskOptions.map(
                      (task: TimeBlockTaskOption) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="planner-time-block-title">Title</Label>
                  <Input
                    id="planner-time-block-title"
                    maxLength={180}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder={
                      selectedTask ? "Optional custom title" : "Block title"
                    }
                    value={formState.title}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="planner-time-block-date">Date</Label>
                  <Input
                    id="planner-time-block-date"
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
                    <Label htmlFor="planner-time-block-start">Start</Label>
                    <Input
                      id="planner-time-block-start"
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
                    <Label htmlFor="planner-time-block-end">End</Label>
                    <Input
                      id="planner-time-block-end"
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
                        setFormState(getInitialForm(data.date));
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

      {isYearDayModalOpen ? (
        <div className="fixed inset-0 z-50 !m-0 flex items-end justify-center bg-foreground/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            aria-modal="true"
            className="max-h-full w-full max-w-md overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
                  Day blocks
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {yearDayModalDate
                    ? formatHeaderDate(yearDayModalDate)
                    : "Selected day"}
                </h2>
              </div>
              <Button
                aria-label="Close day blocks modal"
                onClick={() => setYearDayModalDate(null)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>
            <div className="space-y-4 px-4 py-4">
              {yearDayModalBlocks.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
                  No active time blocks for this day.
                </p>
              ) : (
                <div className="space-y-2">
                  {yearDayModalBlocks.map((block) => (
                    <button
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      key={block.id}
                      onClick={() => {
                        setYearDayModalDate(null);
                        openEditModal(block);
                      }}
                      type="button"
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {block.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTimeRange(block.start_time, block.end_time)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-4">
              <Button
                onClick={() => setYearDayModalDate(null)}
                type="button"
                variant="outline"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  if (!yearDayModalDate) {
                    return;
                  }

                  setYearDayModalDate(null);
                  openCreateModal(
                    yearDayModalDate,
                    getDefaultCreateStartMinutes(),
                  );
                }}
                type="button"
              >
                <CalendarPlus />
                Create time block
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
