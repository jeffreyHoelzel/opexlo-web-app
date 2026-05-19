"use client";

import type { ReactNode } from "react";

import { useTaskLauncher } from "@/components/tasks/task-launcher-context";
import { Button } from "@/components/ui/button";

type OpenTaskModalButtonProps = {
  children: ReactNode;
};

export function OpenTaskModalButton({ children }: OpenTaskModalButtonProps) {
  const { openCreateTaskModal } = useTaskLauncher();

  return (
    <Button onClick={openCreateTaskModal} type="button">
      {children}
    </Button>
  );
}
