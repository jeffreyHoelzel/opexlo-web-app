"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useTaskLauncher } from "@/components/tasks/task-launcher-context";

export function NewTaskModalBridge() {
  const router = useRouter();
  const hasOpenedRef = useRef(false);
  const { openCreateTaskModal } = useTaskLauncher();

  useEffect(() => {
    if (hasOpenedRef.current) {
      return;
    }

    hasOpenedRef.current = true;
    openCreateTaskModal();
    router.replace("/app/tasks", {
      scroll: false,
    });
  }, [openCreateTaskModal, router]);

  return (
    <section className="mx-auto w-full max-w-3xl rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">Opening task creator...</p>
    </section>
  );
}
