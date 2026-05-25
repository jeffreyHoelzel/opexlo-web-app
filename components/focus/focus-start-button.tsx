"use client";

import { Timer } from "lucide-react";
import type { ReactNode } from "react";

import { useFocusSession } from "@/components/focus/focus-session-provider";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { FocusSessionType } from "@/lib/focus/types";

type FocusStartButtonProps = Omit<ButtonProps, "onClick"> & {
  children?: ReactNode;
  plannedSeconds?: number | null;
  sessionType?: FocusSessionType;
  taskId?: string | null;
  taskIds?: string[];
};

export function FocusStartButton({
  children,
  disabled,
  plannedSeconds,
  sessionType = "pomodoro",
  taskId,
  taskIds,
  type = "button",
  ...buttonProps
}: FocusStartButtonProps) {
  const { defaultBreakSeconds, defaultFocusSeconds, isPending, startSession } =
    useFocusSession();
  const resolvedPlannedSeconds = plannedSeconds ?? defaultFocusSeconds;
  const resolvedBreakSeconds =
    sessionType === "pomodoro" ? defaultBreakSeconds : null;

  return (
    <Button
      disabled={disabled || isPending}
      onClick={() => {
        startSession({
          breakSeconds: resolvedBreakSeconds,
          plannedSeconds: resolvedPlannedSeconds,
          sessionType,
          taskId: taskId ?? taskIds?.[0] ?? null,
          taskIds: taskIds ?? (taskId ? [taskId] : undefined),
        });
      }}
      type={type}
      {...buttonProps}
    >
      {children ?? (
        <>
          <Timer />
          Start focus
        </>
      )}
    </Button>
  );
}
