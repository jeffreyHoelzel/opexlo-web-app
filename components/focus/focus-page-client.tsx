"use client";

import {
  CheckCircle2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCw,
  Square,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { FocusDurationInput } from "@/components/focus/focus-duration-input";
import { useFocusSession } from "@/components/focus/focus-session-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  formatFocusClock,
  getFocusSessionProgressPercent,
  parseFocusClock,
} from "@/lib/focus/time";
import type { FocusSessionType } from "@/lib/focus/types";
import { cn } from "@/lib/utils";

type FocusMode = Extract<
  FocusSessionType,
  "pomodoro" | "custom" | "open_focus"
>;

const modeLabels: Record<FocusMode, string> = {
  pomodoro: "Pomodoro",
  custom: "Custom",
  open_focus: "Open",
};

function getTaskMeta(task: {
  estimated_minutes: number | null;
  planned_date?: string | null;
  project_name?: string | null;
}) {
  return [
    task.project_name ?? "Inbox",
    task.estimated_minutes ? `${task.estimated_minutes}m` : null,
    task.planned_date ? "Planned" : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function FocusPageClient() {
  const {
    cancelSession,
    completeSession,
    defaultFocusSeconds,
    elapsedSeconds,
    isPending,
    message,
    openMiniWindow,
    pauseSession,
    recentTasks,
    refreshFocusData,
    remainingSeconds,
    resumeSession,
    session,
    startSession,
  } = useFocusSession();
  const [mode, setMode] = useState<FocusMode>("pomodoro");
  const [durationValue, setDurationValue] = useState(
    formatFocusClock(defaultFocusSeconds),
  );
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [durationError, setDurationError] = useState<string | null>(null);
  const progressPercent = session
    ? getFocusSessionProgressPercent(session, elapsedSeconds)
    : 0;
  const selectedTask = useMemo(
    () => recentTasks.find((task) => task.id === selectedTaskId) ?? null,
    [recentTasks, selectedTaskId],
  );

  useEffect(() => {
    setDurationValue(formatFocusClock(defaultFocusSeconds));
  }, [defaultFocusSeconds]);

  function handleStart() {
    const plannedSeconds =
      mode === "open_focus" ? null : parseFocusClock(durationValue);

    if (mode !== "open_focus" && !plannedSeconds) {
      setDurationError("Use HH:MM:SS with minutes and seconds at 59 or less.");
      return;
    }

    setDurationError(null);
    startSession({
      plannedSeconds,
      sessionType: mode,
      taskId: selectedTaskId || null,
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Focus
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
            Stay with one session.
          </h1>
        </div>
        <Button onClick={refreshFocusData} type="button" variant="outline">
          <RotateCw />
          Refresh
        </Button>
      </div>

      {message ? (
        <div
          aria-live="polite"
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground"
          role="status"
        >
          {message}
        </div>
      ) : null}

      {session ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Timer className="size-5 text-primary" />
              {session.task?.title ?? "Open focus"}
            </CardTitle>
            <CardDescription>
              {modeLabels[session.sessionType as FocusMode] ?? "Focus"} session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="font-mono text-6xl font-semibold tabular-nums text-foreground">
                {remainingSeconds !== null
                  ? formatFocusClock(remainingSeconds)
                  : formatFocusClock(elapsedSeconds)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {remainingSeconds !== null
                  ? `${formatFocusClock(elapsedSeconds)} elapsed`
                  : "Elapsed focus time"}
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isPending}
                onClick={
                  session.status === "active" ? pauseSession : resumeSession
                }
                type="button"
                variant="secondary"
              >
                {session.status === "active" ? <Pause /> : <Play />}
                {session.status === "active" ? "Pause" : "Resume"}
              </Button>
              <Button
                disabled={isPending}
                onClick={completeSession}
                type="button"
                variant="outline"
              >
                <CheckCircle2 />
                Complete
              </Button>
              <Button onClick={openMiniWindow} type="button" variant="outline">
                <PictureInPicture2 />
                Mini-window
              </Button>
              <Button
                disabled={isPending}
                onClick={cancelSession}
                type="button"
                variant="ghost"
              >
                <Square />
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Start focus</CardTitle>
              <CardDescription>
                Pick a task and a session length.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="inline-flex rounded-md border border-border bg-background p-1">
                {(Object.keys(modeLabels) as FocusMode[]).map((item) => (
                  <button
                    className={cn(
                      "inline-flex h-9 items-center rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors",
                      mode === item && "bg-card text-primary shadow-sm",
                    )}
                    key={item}
                    onClick={() => setMode(item)}
                    type="button"
                  >
                    {modeLabels[item]}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="focus-task">Task</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  id="focus-task"
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                  value={selectedTaskId}
                >
                  <option value="">No linked task</option>
                  {recentTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>

              {mode !== "open_focus" ? (
                <FocusDurationInput
                  id="focus-duration"
                  onChange={(value) => {
                    setDurationValue(value);
                    setDurationError(null);
                  }}
                  value={durationValue}
                />
              ) : null}

              {durationError ? (
                <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {durationError}
                </p>
              ) : null}

              <Button disabled={isPending} onClick={handleStart} type="button">
                <Timer />
                Start session
              </Button>
            </CardContent>
          </Card>

          <Card className="self-start">
            <CardHeader>
              <CardTitle className="text-base">Selected task</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTask ? (
                <div className="rounded-lg border border-border bg-secondary/65 p-4">
                  <p className="text-sm font-medium text-foreground">
                    {selectedTask.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getTaskMeta(selectedTask)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This session will not be linked to a task.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!session && recentTasks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent tasks</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {recentTasks.map((task) => (
              <button
                className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/55"
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                type="button"
              >
                <span className="block text-sm font-medium text-foreground">
                  {task.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {getTaskMeta(task)}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
