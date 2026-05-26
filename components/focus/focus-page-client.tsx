"use client";

import {
  CheckCircle2,
  Coffee,
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
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldHelpTooltip } from "@/components/ui/field-help-tooltip";
import { Label } from "@/components/ui/label";
import { formatFocusClock } from "@/lib/focus/time";
import type { FocusSessionType } from "@/lib/focus/types";
import { cn } from "@/lib/utils";

type FocusMode = FocusSessionType;

const focusModes: FocusMode[] = ["pomodoro", "deep_work"];

const modeLabels: Record<FocusMode, string> = {
  deep_work: "Deep Work",
  pomodoro: "Pomodoro",
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

function FieldLabelWithHelp({
  fieldLabel,
  helpText,
}: {
  fieldLabel: string;
  helpText: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium leading-none">{fieldLabel}</span>
      <FieldHelpTooltip content={helpText} fieldLabel={fieldLabel} />
    </div>
  );
}

export function FocusPageClient() {
  const {
    activeTimer,
    cancelSession,
    completeSession,
    defaultBreakSeconds,
    defaultFocusSeconds,
    isPending,
    openMiniWindow,
    pauseSession,
    recentTasks,
    refreshFocusData,
    resumeSession,
    session,
    startSession,
  } = useFocusSession();
  const [mode, setMode] = useState<FocusMode>("pomodoro");
  const [durationSeconds, setDurationSeconds] = useState(defaultFocusSeconds);
  const [breakSeconds, setBreakSeconds] = useState(defaultBreakSeconds);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [durationError, setDurationError] = useState<string | null>(null);
  const recentTasksById = useMemo(
    () => new Map(recentTasks.map((task) => [task.id, task])),
    [recentTasks],
  );
  const selectedTaskIdSet = useMemo(
    () => new Set(selectedTaskIds),
    [selectedTaskIds],
  );
  const selectedTasks = useMemo(
    () =>
      selectedTaskIds
        .map((taskId) => recentTasksById.get(taskId) ?? null)
        .filter((task) => task !== null),
    [recentTasksById, selectedTaskIds],
  );

  useEffect(() => {
    setDurationSeconds((current) => current || defaultFocusSeconds);
  }, [defaultFocusSeconds]);

  useEffect(() => {
    setBreakSeconds(defaultBreakSeconds);
  }, [defaultBreakSeconds]);

  useEffect(() => {
    setSelectedTaskIds((current) =>
      current.filter((taskId) => recentTasksById.has(taskId)),
    );
  }, [recentTasksById]);

  function handleModeChange(nextMode: FocusMode) {
    setMode(nextMode);
    setDurationError(null);
  }

  function handleTaskCheckedChange(taskId: string, checked: boolean) {
    setSelectedTaskIds((current) => {
      if (checked) {
        return current.includes(taskId) ? current : [...current, taskId];
      }

      return current.filter((currentTaskId) => currentTaskId !== taskId);
    });
  }

  function handleStart() {
    if (durationSeconds <= 0) {
      setDurationError("Choose a focus duration.");
      return;
    }

    if (mode === "pomodoro" && breakSeconds <= 0) {
      setDurationError("Choose a break duration.");
      return;
    }

    setDurationError(null);
    startSession({
      breakSeconds: mode === "pomodoro" ? breakSeconds : null,
      plannedSeconds: durationSeconds,
      sessionType: mode,
      taskId: selectedTaskIds[0] ?? null,
      taskIds: selectedTaskIds,
    });
  }

  const pauseResumeLabel =
    activeTimer?.status === "active" ? "Pause timer" : "Resume timer";

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
        <Button
          aria-describedby="focus-refresh-tooltip"
          onClick={refreshFocusData}
          type="button"
          variant="outline"
        >
          <RotateCw />
          Refresh
        </Button>
      </div>

      {activeTimer ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {activeTimer.isBreak ? (
                <Coffee className="size-5 text-primary" />
              ) : (
                <Timer className="size-5 text-primary" />
              )}
              {activeTimer.taskTitle}
            </CardTitle>
            <CardDescription>
              {activeTimer.isBreak
                ? "Auto-started Pomodoro break"
                : `${modeLabels[session?.sessionType ?? "pomodoro"]} session`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="font-mono text-6xl font-semibold tabular-nums text-foreground">
                {activeTimer.remainingSeconds !== null
                  ? formatFocusClock(activeTimer.remainingSeconds)
                  : formatFocusClock(activeTimer.elapsedSeconds)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeTimer.isBreak
                  ? `${formatFocusClock(activeTimer.elapsedSeconds)} break elapsed`
                  : activeTimer.remainingSeconds !== null
                    ? `${formatFocusClock(activeTimer.elapsedSeconds)} elapsed`
                    : "Elapsed focus time"}
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${activeTimer.progressPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionTooltip
                content={pauseResumeLabel}
                tooltipId="focus-active-pause-resume-tooltip"
              >
                <Button
                  aria-describedby="focus-active-pause-resume-tooltip"
                  disabled={isPending}
                  onClick={
                    activeTimer.status === "active"
                      ? pauseSession
                      : resumeSession
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
                  activeTimer.isBreak ? "End the break" : "Complete the session"
                }
                tooltipId="focus-active-complete-tooltip"
              >
                <Button
                  aria-describedby="focus-active-complete-tooltip"
                  disabled={isPending}
                  onClick={completeSession}
                  type="button"
                  variant="outline"
                >
                  <CheckCircle2 />
                  {activeTimer.isBreak ? "End break" : "Complete"}
                </Button>
              </ActionTooltip>
              <ActionTooltip
                content="Open the mini-window"
                tooltipId="focus-active-mini-window-tooltip"
              >
                <Button
                  aria-describedby="focus-active-mini-window-tooltip"
                  aria-label="Open mini-window"
                  onClick={openMiniWindow}
                  type="button"
                  variant="outline"
                >
                  <PictureInPicture2 />
                  Open mini-window
                </Button>
              </ActionTooltip>
              <ActionTooltip
                content={
                  activeTimer.isBreak ? "Skip the break" : "Stop the session"
                }
                tooltipId="focus-active-stop-tooltip"
              >
                <Button
                  aria-describedby="focus-active-stop-tooltip"
                  disabled={isPending}
                  onClick={cancelSession}
                  type="button"
                  variant="ghost"
                >
                  <Square />
                  {activeTimer.isBreak ? "Skip break" : "Stop"}
                </Button>
              </ActionTooltip>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Start focus</CardTitle>
              <CardDescription>
                Choose Pomodoro or Deep Work, then start.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <FieldLabelWithHelp
                  fieldLabel="Mode"
                  helpText="Pomodoro starts a break after the focus timer. Deep Work supports longer focus without a break."
                />
                <div className="inline-flex rounded-md border border-border bg-background p-1">
                  {focusModes.map((item) => {
                    const tooltipId = `focus-mode-${item}-tooltip`;

                    return (
                      <button
                        aria-describedby={tooltipId}
                        className={cn(
                          "inline-flex h-9 items-center rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors",
                          mode === item && "bg-card text-primary shadow-sm",
                        )}
                        id={`focus-mode-${item}`}
                        onClick={() => handleModeChange(item)}
                        type="button"
                        key={item}
                      >
                        {modeLabels[item]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabelWithHelp
                  fieldLabel="Tasks"
                  helpText="Link one or more active tasks to track what this focus session supports."
                />
                {recentTasks.length > 0 ? (
                  <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                    {recentTasks.map((task) => {
                      const isSelected = selectedTaskIdSet.has(task.id);
                      const checkboxId = `focus-task-${task.id}`;
                      const tooltipId = `focus-task-${task.id}-tooltip`;

                      return (
                        <div
                          className={cn(
                            "flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/55",
                            isSelected && "border-primary/55 bg-secondary/65",
                          )}
                          key={task.id}
                        >
                          <Checkbox
                            aria-describedby={tooltipId}
                            checked={isSelected}
                            className="mt-0.5"
                            id={checkboxId}
                            onCheckedChange={(checked) => {
                              handleTaskCheckedChange(
                                task.id,
                                checked === true,
                              );
                            }}
                          />
                          <Label
                            className="min-w-0 flex-1 cursor-pointer text-sm font-medium leading-5 text-foreground"
                            htmlFor={checkboxId}
                          >
                            <span className="block truncate">{task.title}</span>
                            <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                              {getTaskMeta(task)}
                            </span>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                    No active tasks are available to link.
                  </p>
                )}
              </div>

              <FocusDurationInput
                helpText={
                  mode === "pomodoro"
                    ? "Set the Pomodoro focus length."
                    : "Set the Deep Work focus length."
                }
                hint="Set hours, minutes, and seconds."
                id="focus-duration"
                onChange={(value) => {
                  setDurationSeconds(value);
                  setDurationError(null);
                }}
                value={durationSeconds}
              />

              {mode === "pomodoro" ? (
                <FocusDurationInput
                  helpText="Set the short break that starts after the Pomodoro completes."
                  hint="Set hours, minutes, and seconds."
                  id="focus-break"
                  label="Break duration"
                  onChange={(value) => {
                    setBreakSeconds(value);
                    setDurationError(null);
                  }}
                  value={breakSeconds}
                />
              ) : null}

              {durationError ? (
                <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {durationError}
                </p>
              ) : null}

              <Button
                aria-describedby="focus-start-session-tooltip"
                disabled={isPending}
                onClick={handleStart}
                type="button"
              >
                <Timer />
                Start session
              </Button>
            </CardContent>
          </Card>

          <Card className="self-start">
            <CardHeader>
              <CardTitle className="text-base">Selected tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTasks.length > 0 ? (
                <div className="space-y-2">
                  {selectedTasks.map((task) => (
                    <div
                      className="rounded-lg border border-border bg-secondary/65 p-3"
                      key={task.id}
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getTaskMeta(task)}
                      </p>
                    </div>
                  ))}
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
    </section>
  );
}
