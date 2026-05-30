import { addDaysToIsoDate, isValidIsoDate } from "@/lib/time-blocks/time";

import type { PlannerCalendarView } from "@/lib/planner/types";

type PlannerNavigationDirection = "next" | "previous";

type IsoDateParts = {
  day: number;
  month: number;
  year: number;
};

export type PlannerCalendarRange = {
  endDateExclusive: string;
  startDate: string;
};

export type PlannerMonthCell = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

const DAY_COUNT_IN_WEEK = 7;
const WEEK_START_DAY_INDEX = 0;
const MONTH_GRID_CELL_COUNT = 42;

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const PLANNER_CALENDAR_VIEWS: PlannerCalendarView[] = [
  "day",
  "week",
  "month",
  "year",
];

function parseIsoDateParts(value: string): IsoDateParts | null {
  const match = value.match(isoDatePattern);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

function getUtcDate(localDate: string) {
  const parts = parseIsoDateParts(localDate);

  if (!parts) {
    return null;
  }

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(localDate: string, days: number) {
  const nextDate = addDaysToIsoDate(localDate, days);

  if (!nextDate) {
    throw new Error("Use a valid calendar date.");
  }

  return nextDate;
}

function addMonths(localDate: string, months: number) {
  const parts = parseIsoDateParts(localDate);

  if (!parts) {
    throw new Error("Use a valid calendar date.");
  }

  const targetMonth = parts.month - 1 + months;
  const year = parts.year + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(parts.day, lastDay);

  return toIsoDate(new Date(Date.UTC(year, month, day)));
}

function addYears(localDate: string, years: number) {
  return addMonths(localDate, years * 12);
}

export function isPlannerCalendarView(
  value: string | null | undefined,
): value is PlannerCalendarView {
  return value
    ? PLANNER_CALENDAR_VIEWS.includes(value as PlannerCalendarView)
    : false;
}

export function normalizePlannerCalendarView(
  value: string | null | undefined,
): PlannerCalendarView {
  if (isPlannerCalendarView(value)) {
    return value;
  }

  return "day";
}

export function getStartOfWeek(localDate: string) {
  const date = getUtcDate(localDate);

  if (!date) {
    throw new Error("Use a valid calendar date.");
  }

  const dayOffset = (date.getUTCDay() - WEEK_START_DAY_INDEX + 7) % 7;
  return addDays(localDate, -dayOffset);
}

export function getDateRangeForPlannerView(
  view: PlannerCalendarView,
  date: string,
): PlannerCalendarRange {
  if (!isValidIsoDate(date)) {
    throw new Error("Use a valid calendar date.");
  }

  if (view === "day") {
    return {
      endDateExclusive: addDays(date, 1),
      startDate: date,
    };
  }

  if (view === "week") {
    const weekStart = getStartOfWeek(date);
    return {
      endDateExclusive: addDays(weekStart, DAY_COUNT_IN_WEEK),
      startDate: weekStart,
    };
  }

  if (view === "month") {
    const parts = parseIsoDateParts(date);

    if (!parts) {
      throw new Error("Use a valid calendar date.");
    }

    const startDate = `${parts.year.toString().padStart(4, "0")}-${parts.month
      .toString()
      .padStart(2, "0")}-01`;

    return {
      endDateExclusive: addMonths(startDate, 1),
      startDate,
    };
  }

  const parts = parseIsoDateParts(date);

  if (!parts) {
    throw new Error("Use a valid calendar date.");
  }

  const startDate = `${parts.year.toString().padStart(4, "0")}-01-01`;

  return {
    endDateExclusive: addYears(startDate, 1),
    startDate,
  };
}

export function getAdjacentPlannerDate(
  view: PlannerCalendarView,
  date: string,
  direction: PlannerNavigationDirection,
) {
  const delta = direction === "next" ? 1 : -1;

  if (view === "day") {
    return addDays(date, delta);
  }

  if (view === "week") {
    return addDays(date, delta * DAY_COUNT_IN_WEEK);
  }

  if (view === "month") {
    return addMonths(date, delta);
  }

  return addYears(date, delta);
}

export function getMonthCells(date: string): PlannerMonthCell[] {
  const parts = parseIsoDateParts(date);

  if (!parts) {
    throw new Error("Use a valid calendar date.");
  }

  const monthStart = `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-01`;
  const gridStart = getStartOfWeek(monthStart);

  const cells: PlannerMonthCell[] = [];

  for (let index = 0; index < MONTH_GRID_CELL_COUNT; index += 1) {
    const cellDate = addDays(gridStart, index);
    const cellParts = parseIsoDateParts(cellDate);

    if (!cellParts) {
      continue;
    }

    cells.push({
      date: cellDate,
      dayNumber: cellParts.day,
      isCurrentMonth: cellParts.month === parts.month,
    });
  }

  return cells;
}

export function getMonthsForYear(date: string) {
  const parts = parseIsoDateParts(date);

  if (!parts) {
    throw new Error("Use a valid calendar date.");
  }

  return Array.from({ length: 12 }, (_, index) => ({
    firstDate: `${parts.year.toString().padStart(4, "0")}-${(index + 1)
      .toString()
      .padStart(2, "0")}-01`,
    monthIndex: index,
    year: parts.year,
  }));
}
