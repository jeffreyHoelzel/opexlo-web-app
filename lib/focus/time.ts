import type { FocusSessionSnapshot } from "@/lib/focus/types";

export const MAX_FOCUS_HOURS = 99;
export const MAX_FOCUS_MINUTES = 59;
export const MAX_FOCUS_SECONDS = 59;
export const MAX_FOCUS_DURATION_SECONDS =
  MAX_FOCUS_HOURS * 3600 + MAX_FOCUS_MINUTES * 60 + MAX_FOCUS_SECONDS;
export const MAX_POMODORO_DURATION_SECONDS = 55 * 60;
export const MAX_DEEP_WORK_DURATION_SECONDS = 12 * 60 * 60;
export const MAX_POMODORO_BREAK_SECONDS = 10 * 60;
export const DEFAULT_POMODORO_BREAK_SECONDS = 5 * 60;

type ClockParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

function getUnixTime(value: string | null) {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isFinite(time) ? time : null;
}

function padClockValue(value: number) {
  return String(value).padStart(2, "0");
}

export function getFocusSessionElapsedSeconds(
  session: FocusSessionSnapshot,
  nowMs = Date.now(),
) {
  const baseSeconds = Math.max(0, session.elapsedSeconds);

  if (session.status !== "active") {
    return baseSeconds;
  }

  const activeStartedAtMs = getUnixTime(session.activeStartedAt);

  if (!activeStartedAtMs) {
    return baseSeconds;
  }

  const activeSeconds = Math.floor(
    Math.max(0, nowMs - activeStartedAtMs) / 1000,
  );

  return baseSeconds + activeSeconds;
}

export function getFocusSessionRemainingSeconds(
  session: FocusSessionSnapshot,
  elapsedSeconds: number,
) {
  if (!session.plannedSeconds) {
    return null;
  }

  return Math.max(0, session.plannedSeconds - elapsedSeconds);
}

export function getFocusSessionProgressPercent(
  session: FocusSessionSnapshot,
  elapsedSeconds: number,
) {
  if (!session.plannedSeconds) {
    return 100;
  }

  return Math.min(
    100,
    Math.round((elapsedSeconds / session.plannedSeconds) * 100),
  );
}

export function secondsToClockParts(totalSeconds: number): ClockParts {
  const safeSeconds = Math.min(
    MAX_FOCUS_DURATION_SECONDS,
    Math.max(0, Math.floor(totalSeconds)),
  );
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return {
    hours,
    minutes,
    seconds,
  };
}

export function clockPartsToSeconds(parts: ClockParts) {
  return parts.hours * 3600 + parts.minutes * 60 + parts.seconds;
}

export function formatFocusClock(totalSeconds: number) {
  const parts = secondsToClockParts(totalSeconds);

  return `${padClockValue(parts.hours)}:${padClockValue(parts.minutes)}:${padClockValue(parts.seconds)}`;
}

export function parseFocusClock(value: string) {
  const match = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, rawHours, rawMinutes, rawSeconds] = match;
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const seconds = Number(rawSeconds);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > MAX_FOCUS_HOURS ||
    minutes < 0 ||
    minutes > MAX_FOCUS_MINUTES ||
    seconds < 0 ||
    seconds > MAX_FOCUS_SECONDS
  ) {
    return null;
  }

  const totalSeconds = clockPartsToSeconds({
    hours,
    minutes,
    seconds,
  });

  return totalSeconds > 0 ? totalSeconds : null;
}
