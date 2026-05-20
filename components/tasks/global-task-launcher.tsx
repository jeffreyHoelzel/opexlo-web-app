"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ListChecks, Plus, Save, X } from "lucide-react";

import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/tasks/task-badges";
import { useTaskLauncher } from "@/components/tasks/task-launcher-context";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { useBodyScrollLock } from "@/components/ui/use-body-scroll-lock";
import { loadTaskModalDataAction } from "@/lib/tasks/actions";
import type {
  TaskFormOptions,
  TaskListItem,
  TaskModalData,
} from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type GlobalTaskLauncherProps = {
  initialOptions: TaskFormOptions;
  initialRecentTasks: TaskListItem[];
};

type ModalMode = "create" | "recent" | "edit";
const CREATE_TASK_FORM_ID = "global-create-task-form";

function compactMeta(task: TaskListItem) {
  const items = [
    task.project_name ?? "Inbox",
    task.estimated_minutes ? `${task.estimated_minutes}m` : null,
    task.planned_date ? `Start ${task.planned_date}` : null,
    task.due_date ? `Due ${task.due_date}` : null,
  ];

  return items.filter(Boolean).join(" | ");
}

export function GlobalTaskLauncher({
  initialOptions,
  initialRecentTasks,
}: GlobalTaskLauncherProps) {
  const { registerOpenCreateTaskModal } = useTaskLauncher();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [modalData, setModalData] = useState<TaskModalData>({
    options: initialOptions,
    recentTasks: initialRecentTasks,
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successPopup, setSuccessPopup] = useState<string | null>(null);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  useBodyScrollLock(isOpen);

  const refreshModalData = useCallback(() => {
    startTransition(async () => {
      try {
        setLoadError(null);
        setModalData(await loadTaskModalDataAction());
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Could not load tasks.",
        );
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshModalData();
    }
  }, [isOpen, refreshModalData]);

  useEffect(() => {
    if (!successPopup) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessPopup(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [successPopup]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const openCreate = useCallback(() => {
    setIsCreateSubmitting(false);
    setEditingTask(null);
    setMode("create");
    setIsOpen(true);
  }, []);

  function openRecent() {
    setEditingTask(null);
    setMode("recent");
  }

  function openEdit(task: TaskListItem) {
    setEditingTask(task);
    setMode("edit");
  }

  function handleCreateSuccess() {
    setIsCreateSubmitting(false);
    refreshModalData();
    setEditingTask(null);
    setMode("create");
    setIsOpen(false);
    setSuccessPopup("Task created successfully");
  }

  useEffect(() => {
    return registerOpenCreateTaskModal(openCreate);
  }, [openCreate, registerOpenCreateTaskModal]);

  return (
    <>
      {successPopup ? (
        <div
          aria-live="polite"
          className="fixed right-5 top-20 z-50 rounded-md border border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))]/35 px-3 py-2 text-sm text-foreground shadow-sm sm:right-8"
          role="status"
        >
          {successPopup}
        </div>
      ) : null}

      <Button
        aria-label="Create task"
        className="fixed bottom-5 right-5 z-40 h-12 rounded-full px-4 shadow-lg sm:bottom-8 sm:right-8"
        onClick={openCreate}
        type="button"
      >
        <Plus />
        <span className="hidden sm:inline">Task</span>
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            aria-modal="true"
            className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl sm:max-h-[92vh]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
                  Tasks
                </p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">
                  {mode === "edit" ? "Edit task" : "Capture task"}
                </h2>
              </div>
              <Button
                aria-label="Close task modal"
                onClick={() => setIsOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>

            <div className="border-b border-border px-4 py-3 sm:px-6">
              <div className="inline-flex rounded-md border border-border bg-background p-1">
                <button
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors",
                    mode === "create" && "bg-card text-primary shadow-sm",
                  )}
                  onClick={() => {
                    setEditingTask(null);
                    setMode("create");
                  }}
                  type="button"
                >
                  <Plus className="size-4" />
                  New
                </button>
                <button
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors",
                    (mode === "recent" || mode === "edit") &&
                      "bg-card text-primary shadow-sm",
                  )}
                  onClick={openRecent}
                  type="button"
                >
                  <ListChecks className="size-4" />
                  Recent
                </button>
              </div>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6"
            >
              {loadError ? (
                <p className="mb-4 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {loadError}
                </p>
              ) : null}

              {mode === "create" ? (
                <TaskForm
                  formId={CREATE_TASK_FORM_ID}
                  hideSubmitButton
                  mode="create"
                  onPendingChange={setIsCreateSubmitting}
                  onSuccess={handleCreateSuccess}
                  options={modalData.options}
                />
              ) : null}

              {mode === "recent" ? (
                <div className="space-y-3">
                  {isPending ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : null}

                  {modalData.recentTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                      No active tasks yet.
                    </div>
                  ) : (
                    modalData.recentTasks.map((task) => (
                      <button
                        className="w-full rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-secondary/55"
                        key={task.id}
                        onClick={() => openEdit(task)}
                        type="button"
                      >
                        <span className="block text-sm font-medium text-foreground">
                          {task.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {compactMeta(task)}
                        </span>
                        <span className="mt-3 flex flex-wrap gap-2">
                          <TaskStatusBadge status={task.status} />
                          <TaskPriorityBadge priority={task.priority} />
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {mode === "edit" && editingTask ? (
                <div className="space-y-4">
                  <Button onClick={openRecent} type="button" variant="ghost">
                    Back to recent
                  </Button>
                  <TaskForm
                    mode="edit"
                    onSuccess={() => {
                      refreshModalData();
                      setMode("recent");
                      setEditingTask(null);
                    }}
                    options={modalData.options}
                    task={editingTask}
                  />
                </div>
              ) : null}
            </div>

            {mode === "create" ? (
              <div className="shrink-0 border-t border-border bg-card px-4 py-4 sm:flex sm:justify-end sm:px-6">
                <Button
                  disabled={isCreateSubmitting}
                  form={CREATE_TASK_FORM_ID}
                  type="submit"
                >
                  <Save />
                  {isCreateSubmitting ? "Saving..." : "Create task"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
