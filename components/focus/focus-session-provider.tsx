"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Coffee,
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  Square,
  Timer,
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

import { Button } from "@/components/ui/button";
import {
  cancelFocusSessionAction,
  completeFocusSessionAction,
  loadFocusBootstrapAction,
  pauseFocusSessionAction,
  resumeFocusSessionAction,
  startFocusSessionAction,
} from "@/lib/focus/actions";
import {
  formatFocusClock,
  getFocusSessionElapsedSeconds,
  getFocusSessionProgressPercent,
  getFocusSessionRemainingSeconds,
} from "@/lib/focus/time";
import type {
  FocusActionResult,
  FocusBootstrapData,
  FocusSessionSnapshot,
  FocusTaskSummary,
  StartFocusSessionInput,
} from "@/lib/focus/types";

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
  openMiniWindow: () => void;
  pauseSession: () => void;
  recentTasks: FocusTaskSummary[];
  refreshFocusData: () => void;
  resumeSession: () => void;
  session: FocusSessionSnapshot | null;
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

function getUnixTime(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getSessionTitle(session: FocusSessionSnapshot) {
  return session.task?.title ?? "Focus session";
}

function getSessionModeLabel(session: FocusSessionSnapshot) {
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
  session: FocusSessionSnapshot | null;
}): ActiveTimerSnapshot | null {
  if (session) {
    const elapsedSeconds = getFocusSessionElapsedSeconds(session, nowMs);
    const status = session.status === "active" ? "active" : "paused";

    return {
      elapsedSeconds,
      isBreak: false,
      modeLabel: getSessionModeLabel(session),
      progressPercent: getFocusSessionProgressPercent(session, elapsedSeconds),
      remainingSeconds: getFocusSessionRemainingSeconds(session, elapsedSeconds),
      status,
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
        min-height: 36px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.08);
        color: #f7f7f5;
        font: inherit;
        font-size: 13px;
        font-weight: 700;
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
    pauseResume.textContent = activeTimer.status === "active" ? "Pause" : "Resume";
    pauseResume.onclick = activeTimer.status === "active" ? onPause : onResume;
  }

  if (complete) {
    complete.textContent = activeTimer.isBreak ? "End Break" : "Done";
    complete.onclick = onComplete;
  }

  if (stop) {
    stop.textContent = activeTimer.isBreak ? "Skip" : "Stop";
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
  const [session, setSession] = useState(bootstrap.activeSession);
  const [breakSession, setBreakSession] = useState<BreakSessionState | null>(
    null,
  );
  const [recentTasks, setRecentTasks] = useState(bootstrap.recentTasks);
  const [message, setMessage] = useState<string | null>(null);
  const [miniWindowVersion, setMiniWindowVersion] = useState(0);
  const [isPending, startTransition] = useTransition();
  const autoCompletedSessionIdRef = useRef<string | null>(null);
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

  useEffect(() => {
    focusTickStore.setEnabled(activeTimer?.status === "active");
  }, [activeTimer?.status]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [message]);

  const handleFocusResult = useCallback((result: FocusActionResult) => {
    if (result.status === "error") {
      setMessage(result.message);
      return;
    }

    setSession(result.session);

    if (result.message) {
      setMessage(result.message);
    }
  }, []);

  const refreshFocusData = useCallback(() => {
    startTransition(async () => {
      try {
        const nextBootstrap = await loadFocusBootstrapAction();
        setSession(nextBootstrap.activeSession);
        setRecentTasks(nextBootstrap.recentTasks);

        if (nextBootstrap.activeSession) {
          setBreakSession(null);
        }
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not refresh focus.",
        );
      }
    });
  }, []);

  const startSession = useCallback(
    (input: StartFocusSessionInput) => {
      if (breakSession) {
        setMessage("End the current break before starting another session.");
        return;
      }

      startTransition(async () => {
        handleFocusResult(await startFocusSessionAction(input));
      });
    },
    [breakSession, handleFocusResult],
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

    startTransition(async () => {
      handleFocusResult(await pauseFocusSessionAction(session.id));
    });
  }, [breakSession, handleFocusResult, session]);

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

    startTransition(async () => {
      handleFocusResult(await resumeFocusSessionAction(session.id));
    });
  }, [breakSession, handleFocusResult, session]);

  const completeSession = useCallback((source: CompleteSessionSource = "manual") => {
    if (breakSession) {
      setBreakSession(null);
      setMessage("Break complete.");
      return;
    }

    if (!session) {
      return;
    }

    const sessionSnapshot = session;

    startTransition(async () => {
      const result = await completeFocusSessionAction(sessionSnapshot.id);
      handleFocusResult(result);

      if (result.status === "error") {
        if (
          source === "auto" &&
          autoCompletedSessionIdRef.current === sessionSnapshot.id
        ) {
          autoCompletedSessionIdRef.current = null;
        }

        return;
      }

      refreshFocusData();

      if (sessionSnapshot.sessionType === "pomodoro") {
        const breakSeconds =
          sessionSnapshot.breakSeconds ?? bootstrap.defaultBreakSeconds;
        setBreakSession({
          activeStartedAt: new Date().toISOString(),
          elapsedSeconds: 0,
          plannedSeconds: breakSeconds,
          status: "active",
          taskTitle: sessionSnapshot.task?.title ?? null,
        });
        setMessage("Pomodoro complete. Break started.");
      } else if (source === "auto") {
        setMessage("Session complete.");
      }

      if (autoCompletedSessionIdRef.current === sessionSnapshot.id) {
        autoCompletedSessionIdRef.current = null;
      }
    });
  }, [bootstrap.defaultBreakSeconds, breakSession, handleFocusResult, refreshFocusData, session]);

  const cancelSession = useCallback(() => {
    if (breakSession) {
      setBreakSession(null);
      setMessage("Break skipped.");
      return;
    }

    if (!session) {
      return;
    }

    startTransition(async () => {
      const result = await cancelFocusSessionAction(session.id);
      handleFocusResult(result);

      if (result.status === "error") {
        return;
      }

      refreshFocusData();
    });
  }, [breakSession, handleFocusResult, refreshFocusData, session]);

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
    const miniWindow = miniWindowRef.current;

    if (!miniWindow || miniWindow.closed) {
      miniWindowRef.current = null;
      return;
    }

    if (!activeTimer) {
      miniWindow.close();
      miniWindowRef.current = null;
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
    completeSession,
    miniWindowVersion,
    pauseSession,
    resumeSession,
  ]);

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

    if (activeTimer.remainingSeconds === null || activeTimer.remainingSeconds > 0) {
      return;
    }

    if (autoCompletedSessionIdRef.current === session.id) {
      return;
    }

    autoCompletedSessionIdRef.current = session.id;
    completeSession("auto");
  }, [
    activeTimer,
    completeSession,
    session,
  ]);

  const value = useMemo(
    () => ({
      activeTimer,
      cancelSession,
      completeSession,
      defaultBreakSeconds: bootstrap.defaultBreakSeconds,
      defaultFocusSeconds: bootstrap.defaultFocusSeconds,
      isPending,
      message,
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
      <FocusSessionDock />
    </FocusSessionContext.Provider>
  );
}

function FocusSessionDock() {
  const {
    activeTimer,
    cancelSession,
    completeSession,
    isPending,
    message,
    openMiniWindow,
    pauseSession,
    resumeSession,
  } = useFocusSession();

  if (!activeTimer) {
    return message ? (
      <div
        aria-live="polite"
        className="fixed bottom-20 right-5 z-50 max-w-sm rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-lg sm:bottom-24 sm:right-8"
        role="status"
      >
        {message}
      </div>
    ) : null;
  }

  return (
    <aside
      aria-label={activeTimer.isBreak ? "Active break timer" : "Active focus session"}
      className="fixed bottom-20 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl sm:bottom-24 sm:right-8"
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
          <Button asChild size="icon" variant="ghost">
            <Link aria-label="Open full focus view" href="/app/focus">
              <Maximize2 />
            </Link>
          </Button>
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

        {message ? (
          <p className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}

        <div className="grid grid-cols-5 gap-2">
          <Button
            aria-label={
              activeTimer.status === "active" ? "Pause timer" : "Resume timer"
            }
            className="col-span-2"
            disabled={isPending}
            onClick={activeTimer.status === "active" ? pauseSession : resumeSession}
            type="button"
            variant="secondary"
          >
            {activeTimer.status === "active" ? <Pause /> : <Play />}
            {activeTimer.status === "active" ? "Pause" : "Resume"}
          </Button>
          <Button
            aria-label={activeTimer.isBreak ? "End break" : "Complete focus session"}
            disabled={isPending}
            onClick={completeSession}
            size="icon"
            type="button"
            variant="outline"
          >
            <CheckCircle2 />
          </Button>
          <Button
            aria-label="Open mini-window"
            onClick={openMiniWindow}
            size="icon"
            type="button"
            variant="outline"
          >
            <PictureInPicture2 />
          </Button>
          <Button
            aria-label={activeTimer.isBreak ? "Skip break" : "Stop focus session"}
            disabled={isPending}
            onClick={cancelSession}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Square />
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function useFocusSession() {
  const context = useContext(FocusSessionContext);

  if (!context) {
    throw new Error("useFocusSession must be used within FocusSessionProvider.");
  }

  return context;
}
