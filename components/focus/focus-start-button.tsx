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
};

export function FocusStartButton({
  children,
  disabled,
  plannedSeconds,
  sessionType = "pomodoro",
  taskId,
  type = "button",
  ...buttonProps
}: FocusStartButtonProps) {
  const { defaultFocusSeconds, isPending, startSession } = useFocusSession();
  const resolvedPlannedSeconds =
    sessionType === "open_focus"
      ? null
      : (plannedSeconds ?? defaultFocusSeconds);

  return (
    <Button
      disabled={disabled || isPending}
      onClick={() => {
        startSession({
          plannedSeconds: resolvedPlannedSeconds,
          sessionType,
          taskId: taskId ?? null,
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
