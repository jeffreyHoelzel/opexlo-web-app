"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Coffee,
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  Square,
  Timer,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";

import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { useBodyScrollLock } from "@/components/ui/use-body-scroll-lock";
import {
  completeFocusSessionAction,
  loadFocusBootstrapAction,
} from "@/lib/focus/actions";
import { formatFocusClock } from "@/lib/focus/time";
import type {
  FocusActionResult,
  FocusBootstrapData,
  FocusSessionDraft,
  FocusTaskSummary,
  StartFocusSessionInput,
} from "@/lib/focus/types";
import { toggleTaskCompletionAction } from "@/lib/tasks/actions";

type BreakSessionState = {
  activeStartedAt: string | null;
  elapsedSeconds: number;
  plannedSeconds: number;
  status: "active" | "paused";
  taskTitle: string | null;
};

type ActiveTimerSnapshot = {
  elapsedSeconds: number;
  isBreak: boolean;
  modeLabel: string;
  progressPercent: number;
  remainingSeconds: number | null;
  status: "active" | "paused";
  taskTitle: string;
};

type CompleteSessionSource = "auto" | "manual";

type FocusSessionContextValue = {
  activeTimer: ActiveTimerSnapshot | null;
  cancelSession: () => void;
  completeSession: () => void;
  defaultBreakSeconds: number;
  defaultFocusSeconds: number;
  isPending: boolean;
  message: string | null;
  openFocusView: () => void;
  openMiniWindow: () => void;
  pauseSession: () => void;
  recentTasks: FocusTaskSummary[];
  refreshFocusData: () => void;
  resumeSession: () => void;
  session: FocusSessionDraft | null;
  startSession: (input: StartFocusSessionInput) => void;
};

type DocumentPictureInPictureApi = {
  requestWindow: (options?: {
    disallowReturnToOpener?: boolean;
    height?: number;
    preferInitialWindowPlacement?: boolean;
    width?: number;
  }) => Promise<Window>;
};

type WindowWithPictureInPicture = Window & {
  documentPictureInPicture?: DocumentPictureInPictureApi;
};

const FocusSessionContext = createContext<FocusSessionContextValue | null>(
  null,
);

function createFocusTickStore() {
  let snapshot = 0;
  let intervalId: number | null = null;
  let enabled = false;
  const listeners = new Set<() => void>();

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function setSnapshot(nextSnapshot: number) {
    snapshot = nextSnapshot;
    emit();
  }

  function stop() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function start() {
    if (intervalId !== null || !enabled || listeners.size === 0) {
      return;
    }

    setSnapshot(Date.now());
    intervalId = window.setInterval(() => {
      setSnapshot(Date.now());
    }, 1000);
  }

  return {
    getServerSnapshot: () => 0,
    getSnapshot: () => snapshot,
    setEnabled(nextEnabled: boolean) {
      enabled = nextEnabled;

      if (enabled) {
        start();
      } else {
        stop();
        setSnapshot(0);
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      start();

      return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
          stop();
        }
      };
    },
  };
}

const focusTickStore = createFocusTickStore();
const FOCUS_COOKIE_VERSION = 1;
const FOCUS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const FOCUS_CHANNEL_NAME = "opexlo-focus-session";

function getUnixTime(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getFocusCookieName(userId: string) {
  return `opexlo_focus_session_${userId}`;
}

function readCookieValue(name: string) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return cookie.slice(prefix.length);
}

function writeFocusCookie(name: string, session: FocusSessionDraft) {
  const value = encodeURIComponent(
    JSON.stringify({
      ...session,
      version: FOCUS_COOKIE_VERSION,
    }),
  );

  document.cookie = `${name}=${value}; Max-Age=${FOCUS_COOKIE_MAX_AGE_SECONDS}; Path=/app; SameSite=Lax`;
}

function clearFocusCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/app; SameSite=Lax`;
}

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toPositiveIntegerOrNull(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function toNonnegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function sanitizeTaskSummary(value: unknown): FocusTaskSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const task = value as Partial<FocusTaskSummary>;

  if (typeof task.id !== "string" || typeof task.title !== "string") {
    return null;
  }

  return {
    estimated_minutes:
      typeof task.estimated_minutes === "number"
        ? task.estimated_minutes
        : null,
    id: task.id,
    planned_date: toStringOrNull(task.planned_date),
    priority: typeof task.priority === "string" ? task.priority : "medium",
    project_name: toStringOrNull(task.project_name),
    status: typeof task.status === "string" ? task.status : "inbox",
    title: task.title.slice(0, 180),
  };
}

function parseFocusCookie(value: string | null): FocusSessionDraft | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Record<
      string,
      unknown
    >;

    if (parsed.version !== FOCUS_COOKIE_VERSION) {
      return null;
    }

    const plannedSeconds = toPositiveIntegerOrNull(parsed.plannedSeconds);
    const startedAt = toStringOrNull(parsed.startedAt);
    const rawTaskIds = Array.isArray(parsed.taskIds) ? parsed.taskIds : [];
    const taskIds = rawTaskIds.filter(
      (taskId): taskId is string => typeof taskId === "string",
    );
    const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const tasks = rawTasks
      .map(sanitizeTaskSummary)
      .filter((task): task is FocusTaskSummary => task !== null);

    if (
      !plannedSeconds ||
      !startedAt ||
      (parsed.sessionType !== "pomodoro" && parsed.sessionType !== "deep_work")
    ) {
      return null;
    }

    return {
      activeStartedAt: toStringOrNull(parsed.activeStartedAt),
      breakSeconds: toPositiveIntegerOrNull(parsed.breakSeconds),
      elapsedSeconds: toNonnegativeInteger(parsed.elapsedSeconds),
      plannedSeconds,
      sessionType: parsed.sessionType,
      startedAt,
      status: parsed.status === "paused" ? "paused" : "active",
      taskId: toStringOrNull(parsed.taskId),
      taskIds,
      tasks,
    };
  } catch {
    return null;
  }
}

function getDraftElapsedSeconds(
  session: FocusSessionDraft,
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

function getDraftRemainingSeconds(
  session: FocusSessionDraft,
  elapsedSeconds: number,
) {
  return Math.max(0, session.plannedSeconds - elapsedSeconds);
}

function getDraftProgressPercent(
  session: FocusSessionDraft,
  elapsedSeconds: number,
) {
  return Math.min(
    100,
    Math.round((elapsedSeconds / session.plannedSeconds) * 100),
  );
}

function getSessionTitle(session: FocusSessionDraft) {
  if (session.tasks.length === 1) {
    return session.tasks[0].title;
  }

  if (session.tasks.length > 1) {
    return `${session.tasks[0].title} + ${session.tasks.length - 1} more`;
  }

  return "Focus session";
}

function getSessionModeLabel(session: FocusSessionDraft) {
  if (session.sessionType === "pomodoro") {
    return "Pomodoro";
  }

  return "Deep Work";
}

function getBreakElapsedSeconds(
  breakSession: BreakSessionState,
  nowMs = Date.now(),
) {
  const baseSeconds = Math.max(0, breakSession.elapsedSeconds);

  if (breakSession.status !== "active") {
    return baseSeconds;
  }

  const activeStartedAtMs = getUnixTime(breakSession.activeStartedAt);

  if (!activeStartedAtMs) {
    return baseSeconds;
  }

  const activeSeconds = Math.floor(
    Math.max(0, nowMs - activeStartedAtMs) / 1000,
  );

  return baseSeconds + activeSeconds;
}

function getBreakRemainingSeconds(
  breakSession: BreakSessionState,
  elapsedSeconds: number,
) {
  return Math.max(0, breakSession.plannedSeconds - elapsedSeconds);
}

function getBreakProgressPercent(
  breakSession: BreakSessionState,
  elapsedSeconds: number,
) {
  return Math.min(
    100,
    Math.round((elapsedSeconds / breakSession.plannedSeconds) * 100),
  );
}

function getBreakTitle(taskTitle: string | null) {
  return taskTitle ? `Break after ${taskTitle}` : "Pomodoro break";
}

function getActiveTimerSnapshot({
  breakSession,
  nowMs,
  session,
}: {
  breakSession: BreakSessionState | null;
  nowMs: number;
  session: FocusSessionDraft | null;
}): ActiveTimerSnapshot | null {
  if (session) {
    const elapsedSeconds = getDraftElapsedSeconds(session, nowMs);

    return {
      elapsedSeconds,
      isBreak: false,
      modeLabel: getSessionModeLabel(session),
      progressPercent: getDraftProgressPercent(session, elapsedSeconds),
      remainingSeconds: getDraftRemainingSeconds(session, elapsedSeconds),
      status: session.status,
      taskTitle: getSessionTitle(session),
    };
  }

  if (!breakSession) {
    return null;
  }

  const elapsedSeconds = getBreakElapsedSeconds(breakSession, nowMs);

  return {
    elapsedSeconds,
    isBreak: true,
    modeLabel: "Break",
    progressPercent: getBreakProgressPercent(breakSession, elapsedSeconds),
    remainingSeconds: getBreakRemainingSeconds(breakSession, elapsedSeconds),
    status: breakSession.status,
    taskTitle: getBreakTitle(breakSession.taskTitle),
  };
}

function syncMiniWindow({
  activeTimer,
  onCancel,
  onComplete,
  onPause,
  onResume,
  targetWindow,
}: {
  activeTimer: ActiveTimerSnapshot;
  onCancel: () => void;
  onComplete: () => void;
  onPause: () => void;
  onResume: () => void;
  targetWindow: Window;
}) {
  const targetDocument = targetWindow.document;

  if (!targetDocument.getElementById("opexlo-focus-mini")) {
    targetDocument.open();
    targetDocument.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Opexlo Focus</title>
    <style>
      * { box-sizing: border-box; }
      html, body { height: 100%; margin: 0; }
      body {
        background: #050505;
        color: #f7f7f5;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        display: flex;
        min-height: 100%;
        flex-direction: column;
        justify-content: space-between;
        gap: 16px;
        padding: 16px;
      }
      .meta {
        color: rgba(247, 247, 245, 0.68);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      h1 {
        display: -webkit-box;
        margin: 6px 0 0;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        font-size: 20px;
        line-height: 1.15;
      }
      .time {
        font-variant-numeric: tabular-nums;
        font-size: 42px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .subtime {
        color: rgba(247, 247, 245, 0.68);
        font-size: 13px;
      }
      .bar {
        height: 7px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
      }
      .fill {
        height: 100%;
        border-radius: inherit;
        background: #c4d7df;
      }
      .actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      button {
        position: relative;
        min-height: 36px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.08);
        color: #f7f7f5;
        font: inherit;
        font-size: 13px;
        font-weight: 700;
      }
      button::after {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        width: max-content;
        max-width: 180px;
        transform: translateX(-50%);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 6px;
        background: #111827;
        color: #f7f7f5;
        content: attr(data-tooltip);
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        opacity: 0;
        padding: 5px 7px;
        pointer-events: none;
        transition: opacity 140ms ease;
        white-space: normal;
      }
      button:hover::after,
      button:focus-visible::after {
        opacity: 1;
      }
      button.primary {
        border-color: #c4d7df;
        background: #c4d7df;
        color: #26324a;
      }
    </style>
  </head>
  <body>
    <main id="opexlo-focus-mini">
      <section>
        <div class="meta" id="mode"></div>
        <h1 id="title"></h1>
      </section>
      <section>
        <div class="time" id="time"></div>
        <div class="subtime" id="remaining"></div>
      </section>
      <section class="bar" aria-hidden="true">
        <div class="fill" id="progress"></div>
      </section>
      <section class="actions">
        <button id="pause-resume" type="button"></button>
        <button class="primary" id="complete" type="button"></button>
        <button id="stop" type="button"></button>
      </section>
    </main>
  </body>
</html>`);
    targetDocument.close();
  }

  targetDocument.title = `Opexlo Focus - ${formatFocusClock(activeTimer.elapsedSeconds)}`;

  const title = targetDocument.getElementById("title");
  const mode = targetDocument.getElementById("mode");
  const time = targetDocument.getElementById("time");
  const remaining = targetDocument.getElementById("remaining");
  const progress = targetDocument.getElementById("progress");
  const pauseResume = targetDocument.getElementById(
    "pause-resume",
  ) as HTMLButtonElement | null;
  const complete = targetDocument.getElementById(
    "complete",
  ) as HTMLButtonElement | null;
  const stop = targetDocument.getElementById(
    "stop",
  ) as HTMLButtonElement | null;

  if (title) {
    title.textContent = activeTimer.taskTitle;
  }

  if (mode) {
    mode.textContent = activeTimer.modeLabel;
  }

  if (time) {
    time.textContent =
      activeTimer.remainingSeconds !== null
        ? formatFocusClock(activeTimer.remainingSeconds)
        : formatFocusClock(activeTimer.elapsedSeconds);
  }

  if (remaining) {
    if (activeTimer.isBreak) {
      remaining.textContent = `${formatFocusClock(activeTimer.elapsedSeconds)} break elapsed`;
    } else if (activeTimer.remainingSeconds !== null) {
      remaining.textContent = `${formatFocusClock(activeTimer.elapsedSeconds)} elapsed`;
    } else {
      remaining.textContent = "Elapsed focus time";
    }
  }

  if (progress) {
    progress.style.width = `${activeTimer.progressPercent}%`;
  }

  if (pauseResume) {
    const pauseResumeLabel =
      activeTimer.status === "active" ? "Pause timer" : "Resume timer";
    pauseResume.textContent =
      activeTimer.status === "active" ? "Pause" : "Resume";
    pauseResume.setAttribute("aria-label", pauseResumeLabel);
    pauseResume.dataset.tooltip = pauseResumeLabel;
    pauseResume.title = pauseResumeLabel;
    pauseResume.onclick = activeTimer.status === "active" ? onPause : onResume;
  }

  if (complete) {
    const completeLabel = activeTimer.isBreak
      ? "End the break"
      : "Complete the focus session";
    complete.textContent = activeTimer.isBreak ? "End Break" : "Done";
    complete.setAttribute("aria-label", completeLabel);
    complete.dataset.tooltip = completeLabel;
    complete.title = completeLabel;
    complete.onclick = onComplete;
  }

  if (stop) {
    const stopLabel = activeTimer.isBreak
      ? "Skip the break"
      : "Stop the focus session";
    stop.textContent = activeTimer.isBreak ? "Skip" : "Stop";
    stop.setAttribute("aria-label", stopLabel);
    stop.dataset.tooltip = stopLabel;
    stop.title = stopLabel;
    stop.onclick = onCancel;
  }
}

export function FocusSessionProvider({
  bootstrap,
  children,
}: {
  bootstrap: FocusBootstrapData;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isFocusRoute = pathname === "/app/focus";
  const focusCookieName = useMemo(
    () => getFocusCookieName(bootstrap.userId),
    [bootstrap.userId],
  );
  const [session, setSession] = useState<FocusSessionDraft | null>(null);
  const [breakSession, setBreakSession] = useState<BreakSessionState | null>(
    null,
  );
  const [recentTasks, setRecentTasks] = useState(bootstrap.recentTasks);
  const [message, setMessage] = useState<string | null>(null);
  const [completionReviewTasks, setCompletionReviewTasks] = useState<
    FocusTaskSummary[]
  >([]);
  const [miniWindowVersion, setMiniWindowVersion] = useState(0);
  const [isPending, startTransition] = useTransition();
  const autoCompletedSessionIdRef = useRef<string | null>(null);
  const focusChannelRef = useRef<BroadcastChannel | null>(null);
  const miniWindowRef = useRef<Window | null>(null);
  const now = useSyncExternalStore(
    focusTickStore.subscribe,
    focusTickStore.getSnapshot,
    focusTickStore.getServerSnapshot,
  );
  const activeTimer = useMemo(
    () => getActiveTimerSnapshot({ breakSession, nowMs: now, session }),
    [breakSession, now, session],
  );
  const dismissMessage = useCallback(() => {
    setMessage(null);
  }, []);
  const closeMiniWindow = useCallback(() => {
    const miniWindow = miniWindowRef.current;

    if (!miniWindow) {
      return;
    }

    if (!miniWindow.closed) {
      miniWindow.close();
    }

    miniWindowRef.current = null;
  }, []);
  const openFocusView = useCallback(() => {
    closeMiniWindow();
    router.push("/app/focus");
  }, [closeMiniWindow, router]);
  const syncSessionFromCookie = useCallback(() => {
    setSession(parseFocusCookie(readCookieValue(focusCookieName)));
  }, [focusCookieName]);
  const broadcastFocusSessionChange = useCallback(() => {
    focusChannelRef.current?.postMessage({
      cookieName: focusCookieName,
      type: "focus-session-changed",
    });
  }, [focusCookieName]);
  const persistSession = useCallback(
    (nextSession: FocusSessionDraft) => {
      writeFocusCookie(focusCookieName, nextSession);
      setSession(nextSession);
      broadcastFocusSessionChange();
    },
    [broadcastFocusSessionChange, focusCookieName],
  );
  const clearPersistedSession = useCallback(() => {
    clearFocusCookie(focusCookieName);
    setSession(null);
    broadcastFocusSessionChange();
  }, [broadcastFocusSessionChange, focusCookieName]);

  useEffect(() => {
    focusTickStore.setEnabled(activeTimer?.status === "active");
  }, [activeTimer?.status]);

  useEffect(() => {
    syncSessionFromCookie();

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(FOCUS_CHANNEL_NAME);
      focusChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (
          event.data?.type === "focus-session-changed" &&
          event.data?.cookieName === focusCookieName
        ) {
          syncSessionFromCookie();
        }
      };
    }

    function handleFocusChange() {
      syncSessionFromCookie();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        syncSessionFromCookie();
      }
    }

    window.addEventListener("focus", handleFocusChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocusChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      focusChannelRef.current?.close();
      focusChannelRef.current = null;
    };
  }, [focusCookieName, syncSessionFromCookie]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!message) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMessage(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [message]);

  const handleFocusResult = useCallback((result: FocusActionResult) => {
    if (result.status === "error") {
      setMessage(result.message);
      return;
    }

    if (result.message) {
      setMessage(result.message);
    }
  }, []);

  const refreshFocusData = useCallback(() => {
    startTransition(async () => {
      try {
        const nextBootstrap = await loadFocusBootstrapAction();
        setRecentTasks(nextBootstrap.recentTasks);
        syncSessionFromCookie();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not refresh focus.",
        );
      }
    });
  }, [syncSessionFromCookie]);

  const completeReviewTask = useCallback(
    (taskId: string) => {
      const formData = new FormData();
      formData.set("task_id", taskId);

      startTransition(async () => {
        try {
          await toggleTaskCompletionAction(formData);
          setCompletionReviewTasks((current) =>
            current.filter((task) => task.id !== taskId),
          );
          refreshFocusData();
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not complete the task.",
          );
        }
      });
    },
    [refreshFocusData, router],
  );

  const dismissCompletionReview = useCallback(() => {
    setCompletionReviewTasks([]);
  }, []);

  const startSession = useCallback(
    (input: StartFocusSessionInput) => {
      if (breakSession) {
        setMessage("End the current break before starting another session.");
        return;
      }

      if (session) {
        setMessage("A focus session is already running.");
        return;
      }

      const plannedSeconds =
        input.plannedSeconds ?? bootstrap.defaultFocusSeconds;

      if (!plannedSeconds || plannedSeconds <= 0) {
        setMessage("Choose a focus duration.");
        return;
      }

      const taskIds = Array.from(
        new Set(
          input.taskIds && input.taskIds.length > 0
            ? input.taskIds
            : input.taskId
              ? [input.taskId]
              : [],
        ),
      );
      const recentTasksById = new Map(
        recentTasks.map((task) => [task.id, task]),
      );
      const tasks = taskIds.map(
        (taskId) =>
          recentTasksById.get(taskId) ?? {
            estimated_minutes: null,
            id: taskId,
            planned_date: null,
            priority: "medium",
            project_name: null,
            status: "inbox",
            title: "Linked task",
          },
      );
      const now = new Date().toISOString();

      setCompletionReviewTasks([]);
      setBreakSession(null);
      persistSession({
        activeStartedAt: now,
        breakSeconds:
          input.sessionType === "pomodoro"
            ? (input.breakSeconds ?? bootstrap.defaultBreakSeconds)
            : null,
        elapsedSeconds: 0,
        plannedSeconds,
        sessionType: input.sessionType ?? "pomodoro",
        startedAt: now,
        status: "active",
        taskId: taskIds[0] ?? null,
        taskIds,
        tasks,
      });
    },
    [
      bootstrap.defaultBreakSeconds,
      bootstrap.defaultFocusSeconds,
      breakSession,
      persistSession,
      recentTasks,
      session,
    ],
  );

  const pauseSession = useCallback(() => {
    if (breakSession) {
      setBreakSession((current) => {
        if (!current || current.status !== "active") {
          return current;
        }

        const elapsedSeconds = getBreakElapsedSeconds(current);

        return {
          ...current,
          activeStartedAt: null,
          elapsedSeconds,
          status: "paused",
        };
      });
      return;
    }

    if (!session) {
      return;
    }

    const elapsedSeconds = getDraftElapsedSeconds(session);

    persistSession({
      ...session,
      activeStartedAt: null,
      elapsedSeconds,
      status: "paused",
    });
  }, [breakSession, persistSession, session]);

  const resumeSession = useCallback(() => {
    if (breakSession) {
      setBreakSession((current) => {
        if (!current || current.status !== "paused") {
          return current;
        }

        return {
          ...current,
          activeStartedAt: new Date().toISOString(),
          status: "active",
        };
      });
      return;
    }

    if (!session) {
      return;
    }

    persistSession({
      ...session,
      activeStartedAt: new Date().toISOString(),
      status: "active",
    });
  }, [breakSession, persistSession, session]);

  const completeSession = useCallback(
    (source: CompleteSessionSource = "manual") => {
      if (breakSession) {
        setBreakSession(null);
        setMessage("Break complete.");
        return;
      }

      if (!session) {
        return;
      }

      const sessionSnapshot = session;
      const elapsedSeconds = getDraftElapsedSeconds(sessionSnapshot);
      const endedAt = new Date().toISOString();
      const reviewTasks = sessionSnapshot.tasks.filter(
        (task) => task.status !== "completed",
      );

      startTransition(async () => {
        const result = await completeFocusSessionAction({
          breakSeconds: sessionSnapshot.breakSeconds,
          elapsedSeconds,
          endedAt,
          plannedSeconds: sessionSnapshot.plannedSeconds,
          sessionType: sessionSnapshot.sessionType,
          startedAt: sessionSnapshot.startedAt,
          taskIds: sessionSnapshot.taskIds,
        });
        handleFocusResult(result);

        if (result.status === "error") {
          if (
            source === "auto" &&
            autoCompletedSessionIdRef.current === sessionSnapshot.startedAt
          ) {
            autoCompletedSessionIdRef.current = null;
          }

          return;
        }

        clearPersistedSession();
        refreshFocusData();

        if (reviewTasks.length > 0) {
          setCompletionReviewTasks(reviewTasks);
        }

        if (sessionSnapshot.sessionType === "pomodoro") {
          const breakSeconds =
            sessionSnapshot.breakSeconds ?? bootstrap.defaultBreakSeconds;
          setBreakSession({
            activeStartedAt: new Date().toISOString(),
            elapsedSeconds: 0,
            plannedSeconds: breakSeconds,
            status: "active",
            taskTitle:
              sessionSnapshot.tasks.length > 0
                ? getSessionTitle(sessionSnapshot)
                : null,
          });
          setMessage("Pomodoro complete. Break started.");
        } else if (source === "auto") {
          setMessage("Session complete.");
        }

        if (autoCompletedSessionIdRef.current === sessionSnapshot.startedAt) {
          autoCompletedSessionIdRef.current = null;
        }
      });
    },
    [
      bootstrap.defaultBreakSeconds,
      breakSession,
      clearPersistedSession,
      handleFocusResult,
      refreshFocusData,
      session,
    ],
  );

  const cancelSession = useCallback(() => {
    if (breakSession) {
      setBreakSession(null);
      setMessage("Break skipped.");
      return;
    }

    if (!session) {
      return;
    }

    clearPersistedSession();
    setMessage("Focus session stopped.");
  }, [breakSession, clearPersistedSession, session]);

  const openFallbackPopup = useCallback(() => {
    const popupWindow = window.open(
      "",
      "opexlo-focus-mini-window",
      "popup,width=360,height=250,resizable=yes,scrollbars=no",
    );

    if (!popupWindow) {
      setMessage("The mini-window was blocked by the browser.");
      return;
    }

    miniWindowRef.current = popupWindow;
    setMiniWindowVersion((version) => version + 1);
  }, []);

  const openMiniWindow = useCallback(() => {
    if (!activeTimer) {
      return;
    }

    if (miniWindowRef.current && !miniWindowRef.current.closed) {
      miniWindowRef.current.focus();
      return;
    }

    const pictureInPicture = (window as WindowWithPictureInPicture)
      .documentPictureInPicture;

    if (pictureInPicture) {
      pictureInPicture
        .requestWindow({
          height: 250,
          preferInitialWindowPlacement: true,
          width: 360,
        })
        .then((pictureInPictureWindow) => {
          miniWindowRef.current = pictureInPictureWindow;
          setMiniWindowVersion((version) => version + 1);
        })
        .catch(() => {
          openFallbackPopup();
        });
      return;
    }

    openFallbackPopup();
  }, [activeTimer, openFallbackPopup]);

  useEffect(() => {
    if (!isFocusRoute) {
      return;
    }

    closeMiniWindow();
  }, [closeMiniWindow, isFocusRoute]);

  useEffect(() => {
    const miniWindow = miniWindowRef.current;

    if (!miniWindow || miniWindow.closed) {
      miniWindowRef.current = null;
      return;
    }

    if (!activeTimer) {
      closeMiniWindow();
      return;
    }

    syncMiniWindow({
      activeTimer,
      onCancel: cancelSession,
      onComplete: completeSession,
      onPause: pauseSession,
      onResume: resumeSession,
      targetWindow: miniWindow,
    });
  }, [
    activeTimer,
    cancelSession,
    closeMiniWindow,
    completeSession,
    miniWindowVersion,
    pauseSession,
    resumeSession,
  ]);

  useEffect(
    () => () => {
      closeMiniWindow();
    },
    [closeMiniWindow],
  );

  useEffect(() => {
    if (!breakSession) {
      return;
    }

    const elapsedSeconds = getBreakElapsedSeconds(breakSession);

    if (elapsedSeconds < breakSession.plannedSeconds) {
      return;
    }

    setBreakSession(null);
    setMessage("Break complete.");
  }, [breakSession, now]);

  useEffect(() => {
    if (!session || !activeTimer || activeTimer.isBreak) {
      return;
    }

    if (activeTimer.status !== "active") {
      return;
    }

    if (
      activeTimer.remainingSeconds === null ||
      activeTimer.remainingSeconds > 0
    ) {
      return;
    }

    if (autoCompletedSessionIdRef.current === session.startedAt) {
      return;
    }

    autoCompletedSessionIdRef.current = session.startedAt;
    completeSession("auto");
  }, [activeTimer, completeSession, session]);

  const value = useMemo(
    () => ({
      activeTimer,
      cancelSession,
      completeSession,
      defaultBreakSeconds: bootstrap.defaultBreakSeconds,
      defaultFocusSeconds: bootstrap.defaultFocusSeconds,
      isPending,
      message,
      openFocusView,
      openMiniWindow,
      pauseSession,
      recentTasks,
      refreshFocusData,
      resumeSession,
      session,
      startSession,
    }),
    [
      activeTimer,
      cancelSession,
      completeSession,
      bootstrap.defaultBreakSeconds,
      bootstrap.defaultFocusSeconds,
      isPending,
      message,
      openFocusView,
      openMiniWindow,
      pauseSession,
      recentTasks,
      refreshFocusData,
      resumeSession,
      session,
      startSession,
    ],
  );

  return (
    <FocusSessionContext.Provider value={value}>
      {children}
      {!isFocusRoute ? <FocusSessionDock /> : null}
      <FocusCompletionReviewModal
        isPending={isPending}
        onCompleteTask={completeReviewTask}
        onDismiss={dismissCompletionReview}
        tasks={completionReviewTasks}
      />
      <FocusSessionMessageOverlay
        message={message}
        onDismiss={dismissMessage}
      />
    </FocusSessionContext.Provider>
  );
}

function FocusCompletionReviewModal({
  isPending,
  onCompleteTask,
  onDismiss,
  tasks,
}: {
  isPending: boolean;
  onCompleteTask: (taskId: string) => void;
  onDismiss: () => void;
  tasks: FocusTaskSummary[];
}) {
  const isOpen = tasks.length > 0;

  useBodyScrollLock(isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        aria-labelledby="focus-review-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-lg border border-border bg-card text-card-foreground shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
              Focus review
            </p>
            <h2
              className="mt-1 text-xl font-semibold text-foreground"
              id="focus-review-title"
            >
              Wrap up linked tasks
            </h2>
          </div>
          <Button
            aria-describedby="focus-review-close-tooltip"
            aria-label="Close focus review"
            onClick={onDismiss}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          {tasks.map((task) => {
            const tooltipId = `focus-review-${task.id}-complete-tooltip`;

            return (
              <div
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                key={task.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.project_name ?? "Inbox"}
                  </p>
                </div>
                <ActionTooltip
                  content="Mark this task complete"
                  tooltipId={tooltipId}
                >
                  <Button
                    aria-describedby={tooltipId}
                    disabled={isPending}
                    onClick={() => onCompleteTask(task.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <CheckCircle2 />
                    Mark complete
                  </Button>
                </ActionTooltip>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-border px-4 py-4 sm:px-5">
          <Button
            aria-describedby="focus-review-dismiss-tooltip"
            onClick={onDismiss}
            type="button"
            variant="secondary"
          >
            Review later
          </Button>
        </div>
      </div>
    </div>
  );
}

function FocusSessionMessageOverlay({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6"
      role="status"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 rounded-full bg-[hsl(var(--chart-3))]/25 p-1.5 text-[hsl(var(--chart-3))]">
              <CheckCircle2 className="size-4" />
            </span>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button
            aria-describedby="focus-message-close-tooltip"
            aria-label="Close focus message"
            onClick={onDismiss}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FocusSessionDock() {
  const {
    activeTimer,
    cancelSession,
    completeSession,
    isPending,
    openFocusView,
    openMiniWindow,
    pauseSession,
    resumeSession,
  } = useFocusSession();

  if (!activeTimer) {
    return null;
  }

  const pauseResumeLabel =
    activeTimer.status === "active" ? "Pause timer" : "Resume timer";

  return (
    <aside
      aria-label={
        activeTimer.isBreak ? "Active break timer" : "Active focus session"
      }
      className="fixed bottom-20 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm overflow-visible rounded-lg border border-border bg-card text-card-foreground shadow-xl sm:bottom-24 sm:right-8"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {activeTimer.isBreak ? (
                <Coffee className="size-3.5" />
              ) : (
                <Timer className="size-3.5" />
              )}
              {activeTimer.modeLabel}
            </p>
            <h2 className="mt-1 truncate text-sm font-semibold text-foreground">
              {activeTimer.taskTitle}
            </h2>
          </div>
          <ActionTooltip
            content="Open full focus view"
            tooltipId="focus-dock-open-full-tooltip"
          >
            <Button
              aria-describedby="focus-dock-open-full-tooltip"
              aria-label="Open full focus view"
              onClick={openFocusView}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Maximize2 />
            </Button>
          </ActionTooltip>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="font-mono text-4xl font-semibold tabular-nums text-foreground">
            {activeTimer.remainingSeconds !== null
              ? formatFocusClock(activeTimer.remainingSeconds)
              : formatFocusClock(activeTimer.elapsedSeconds)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeTimer.isBreak
              ? `${formatFocusClock(activeTimer.elapsedSeconds)} break elapsed`
              : activeTimer.remainingSeconds !== null
                ? `${formatFocusClock(activeTimer.elapsedSeconds)} elapsed`
                : "Elapsed focus time"}
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${activeTimer.progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          <ActionTooltip
            className="col-span-2"
            content={pauseResumeLabel}
            side="top"
            tooltipId="focus-dock-pause-resume-tooltip"
          >
            <Button
              aria-describedby="focus-dock-pause-resume-tooltip"
              aria-label={pauseResumeLabel}
              className="w-full"
              disabled={isPending}
              onClick={
                activeTimer.status === "active" ? pauseSession : resumeSession
              }
              type="button"
              variant="secondary"
            >
              {activeTimer.status === "active" ? <Pause /> : <Play />}
              {activeTimer.status === "active" ? "Pause" : "Resume"}
            </Button>
          </ActionTooltip>
          <ActionTooltip
            content={
              activeTimer.isBreak ? "End break" : "Complete focus session"
            }
            side="top"
            tooltipId="focus-dock-complete-tooltip"
          >
            <Button
              aria-describedby="focus-dock-complete-tooltip"
              aria-label={
                activeTimer.isBreak ? "End break" : "Complete focus session"
              }
              disabled={isPending}
              onClick={completeSession}
              size="icon"
              type="button"
              variant="outline"
            >
              <CheckCircle2 />
            </Button>
          </ActionTooltip>
          <ActionTooltip
            content="Open mini-window"
            side="top"
            tooltipId="focus-dock-mini-window-tooltip"
          >
            <Button
              aria-describedby="focus-dock-mini-window-tooltip"
              aria-label="Open mini-window"
              onClick={openMiniWindow}
              size="icon"
              type="button"
              variant="outline"
            >
              <PictureInPicture2 />
            </Button>
          </ActionTooltip>
          <ActionTooltip
            content={activeTimer.isBreak ? "Skip break" : "Stop focus session"}
            side="top"
            tooltipId="focus-dock-stop-tooltip"
          >
            <Button
              aria-describedby="focus-dock-stop-tooltip"
              aria-label={
                activeTimer.isBreak ? "Skip break" : "Stop focus session"
              }
              disabled={isPending}
              onClick={cancelSession}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Square />
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </aside>
  );
}

export function useFocusSession() {
  const context = useContext(FocusSessionContext);

  if (!context) {
    throw new Error(
      "useFocusSession must be used within FocusSessionProvider.",
    );
  }

  return context;
}
