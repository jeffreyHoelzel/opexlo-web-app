"use client";

import Link from "next/link";
import {
  CheckCircle2,
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

type FocusSessionContextValue = {
  cancelSession: () => void;
  completeSession: () => void;
  defaultBreakSeconds: number;
  defaultFocusSeconds: number;
  elapsedSeconds: number;
  isPending: boolean;
  message: string | null;
  openMiniWindow: () => void;
  pauseSession: () => void;
  progressPercent: number;
  recentTasks: FocusTaskSummary[];
  refreshFocusData: () => void;
  remainingSeconds: number | null;
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

function getSessionTitle(session: FocusSessionSnapshot) {
  return session.task?.title ?? "Open focus";
}

function getSessionModeLabel(session: FocusSessionSnapshot) {
  if (session.sessionType === "pomodoro") {
    return "Pomodoro";
  }

  if (session.sessionType === "open_focus") {
    return "Open focus";
  }

  return "Custom";
}

function syncMiniWindow({
  elapsedSeconds,
  onCancel,
  onComplete,
  onPause,
  onResume,
  progressPercent,
  remainingSeconds,
  session,
  targetWindow,
}: {
  elapsedSeconds: number;
  onCancel: () => void;
  onComplete: () => void;
  onPause: () => void;
  onResume: () => void;
  progressPercent: number;
  remainingSeconds: number | null;
  session: FocusSessionSnapshot;
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
        <button class="primary" id="complete" type="button">Done</button>
        <button id="stop" type="button">Stop</button>
      </section>
    </main>
  </body>
</html>`);
    targetDocument.close();
  }

  targetDocument.title = `Opexlo Focus - ${formatFocusClock(elapsedSeconds)}`;

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
    title.textContent = getSessionTitle(session);
  }

  if (mode) {
    mode.textContent = getSessionModeLabel(session);
  }

  if (time) {
    time.textContent =
      remainingSeconds !== null
        ? formatFocusClock(remainingSeconds)
        : formatFocusClock(elapsedSeconds);
  }

  if (remaining) {
    remaining.textContent =
      remainingSeconds !== null
        ? `${formatFocusClock(elapsedSeconds)} elapsed`
        : "Elapsed focus time";
  }

  if (progress) {
    progress.style.width = `${progressPercent}%`;
  }

  if (pauseResume) {
    pauseResume.textContent = session.status === "active" ? "Pause" : "Resume";
    pauseResume.onclick = session.status === "active" ? onPause : onResume;
  }

  if (complete) {
    complete.onclick = onComplete;
  }

  if (stop) {
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
  const [recentTasks, setRecentTasks] = useState(bootstrap.recentTasks);
  const [message, setMessage] = useState<string | null>(null);
  const [miniWindowVersion, setMiniWindowVersion] = useState(0);
  const [isPending, startTransition] = useTransition();
  const miniWindowRef = useRef<Window | null>(null);
  const now = useSyncExternalStore(
    focusTickStore.subscribe,
    focusTickStore.getSnapshot,
    focusTickStore.getServerSnapshot,
  );
  const elapsedSeconds = session
    ? getFocusSessionElapsedSeconds(session, now)
    : 0;
  const remainingSeconds = session
    ? getFocusSessionRemainingSeconds(session, elapsedSeconds)
    : null;
  const progressPercent = session
    ? getFocusSessionProgressPercent(session, elapsedSeconds)
    : 0;

  useEffect(() => {
    focusTickStore.setEnabled(session?.status === "active");
  }, [session?.status]);

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
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not refresh focus.",
        );
      }
    });
  }, []);

  const startSession = useCallback(
    (input: StartFocusSessionInput) => {
      startTransition(async () => {
        handleFocusResult(await startFocusSessionAction(input));
      });
    },
    [handleFocusResult],
  );

  const pauseSession = useCallback(() => {
    if (!session) {
      return;
    }

    startTransition(async () => {
      handleFocusResult(await pauseFocusSessionAction(session.id));
    });
  }, [handleFocusResult, session]);

  const resumeSession = useCallback(() => {
    if (!session) {
      return;
    }

    startTransition(async () => {
      handleFocusResult(await resumeFocusSessionAction(session.id));
    });
  }, [handleFocusResult, session]);

  const completeSession = useCallback(() => {
    if (!session) {
      return;
    }

    startTransition(async () => {
      handleFocusResult(await completeFocusSessionAction(session.id));
      refreshFocusData();
    });
  }, [handleFocusResult, refreshFocusData, session]);

  const cancelSession = useCallback(() => {
    if (!session) {
      return;
    }

    startTransition(async () => {
      handleFocusResult(await cancelFocusSessionAction(session.id));
      refreshFocusData();
    });
  }, [handleFocusResult, refreshFocusData, session]);

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
    if (!session) {
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
  }, [openFallbackPopup, session]);

  useEffect(() => {
    const miniWindow = miniWindowRef.current;

    if (!miniWindow || miniWindow.closed) {
      miniWindowRef.current = null;
      return;
    }

    if (!session) {
      miniWindow.close();
      miniWindowRef.current = null;
      return;
    }

    syncMiniWindow({
      elapsedSeconds,
      onCancel: cancelSession,
      onComplete: completeSession,
      onPause: pauseSession,
      onResume: resumeSession,
      progressPercent,
      remainingSeconds,
      session,
      targetWindow: miniWindow,
    });
  }, [
    cancelSession,
    completeSession,
    elapsedSeconds,
    pauseSession,
    progressPercent,
    remainingSeconds,
    resumeSession,
    session,
    miniWindowVersion,
  ]);

  const value = useMemo(
    () => ({
      cancelSession,
      completeSession,
      defaultBreakSeconds: bootstrap.defaultBreakSeconds,
      defaultFocusSeconds: bootstrap.defaultFocusSeconds,
      elapsedSeconds,
      isPending,
      message,
      openMiniWindow,
      pauseSession,
      progressPercent,
      recentTasks,
      refreshFocusData,
      remainingSeconds,
      resumeSession,
      session,
      startSession,
    }),
    [
      bootstrap.defaultBreakSeconds,
      bootstrap.defaultFocusSeconds,
      cancelSession,
      completeSession,
      elapsedSeconds,
      isPending,
      message,
      openMiniWindow,
      pauseSession,
      progressPercent,
      recentTasks,
      refreshFocusData,
      remainingSeconds,
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
    cancelSession,
    completeSession,
    elapsedSeconds,
    isPending,
    message,
    openMiniWindow,
    pauseSession,
    progressPercent,
    remainingSeconds,
    resumeSession,
    session,
  } = useFocusSession();

  if (!session) {
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
      aria-label="Active focus session"
      className="fixed bottom-20 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl sm:bottom-24 sm:right-8"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Timer className="size-3.5" />
              {getSessionModeLabel(session)}
            </p>
            <h2 className="mt-1 truncate text-sm font-semibold text-foreground">
              {getSessionTitle(session)}
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
            {remainingSeconds !== null
              ? formatFocusClock(remainingSeconds)
              : formatFocusClock(elapsedSeconds)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {remainingSeconds !== null
              ? `${formatFocusClock(elapsedSeconds)} elapsed`
              : "Elapsed focus time"}
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progressPercent}%` }}
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
              session.status === "active" ? "Pause focus" : "Resume focus"
            }
            className="col-span-2"
            disabled={isPending}
            onClick={session.status === "active" ? pauseSession : resumeSession}
            type="button"
            variant="secondary"
          >
            {session.status === "active" ? <Pause /> : <Play />}
            {session.status === "active" ? "Pause" : "Resume"}
          </Button>
          <Button
            aria-label="Complete focus session"
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
            aria-label="Stop focus session"
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
    throw new Error(
      "useFocusSession must be used within FocusSessionProvider.",
    );
  }

  return context;
}
