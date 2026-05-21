import Link from "next/link";
import type { ReactNode } from "react";
import {
  Archive,
  CalendarMinus,
  CalendarPlus,
  CheckCircle2,
  Circle,
  Pencil,
  Timer,
} from "lucide-react";

import { FocusStartButton } from "@/components/focus/focus-start-button";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/tasks/task-badges";
import { Button } from "@/components/ui/button";
import {
  archiveTaskAction,
  planTaskForTodayAction,
  toggleTaskCompletionAction,
  unplanTaskAction,
} from "@/lib/tasks/actions";
import type { TaskListItem } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type TaskListProps = {
  editReturnPath?: string;
  emptyDescription: string;
  emptyTitle: string;
  showUnplan?: boolean;
  tasks: TaskListItem[];
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function taskMeta(task: TaskListItem) {
  const items = [
    task.project_name ?? "Inbox",
    task.area_name,
    task.goal_title,
    task.estimated_minutes ? `${task.estimated_minutes}m` : null,
    task.due_date ? `Due ${formatDate(task.due_date)}` : null,
    task.planned_date ? `Start ${formatDate(task.planned_date)}` : null,
  ];

  return items.filter(Boolean).join(" | ");
}

function getTaskDetailHref(taskId: string, editReturnPath?: string) {
  if (!editReturnPath) {
    return `/app/tasks/${taskId}`;
  }

  const searchParams = new URLSearchParams({
    return_to: editReturnPath,
  });

  return `/app/tasks/${taskId}?${searchParams.toString()}`;
}

function TaskActionForm({
  action,
  className,
  children,
  taskId,
}: {
  action: (formData: FormData) => Promise<void>;
  className?: string;
  children: ReactNode;
  taskId: string;
}) {
  return (
    <form action={action} className={className}>
      <input name="task_id" type="hidden" value={taskId} />
      {children}
    </form>
  );
}

function TaskActionTooltip({
  children,
  content,
  tooltipId,
}: {
  children: ReactNode;
  content: string;
  tooltipId: string;
}) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        className="pointer-events-none absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[11px] text-card-foreground opacity-0 shadow-sm transition-opacity group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100"
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

export function TaskList({
  editReturnPath,
  emptyDescription,
  emptyTitle,
  showUnplan = false,
  tasks,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const isCompleted = task.status === "completed";
        const editTooltipId = `task-${task.id}-edit-tooltip`;
        const archiveTooltipId = `task-${task.id}-archive-tooltip`;
        const focusTooltipId = `task-${task.id}-focus-tooltip`;
        const todayTooltipId = `task-${task.id}-today-tooltip`;

        return (
          <article
            className={cn(
              "rounded-lg border border-border bg-card p-4 shadow-sm transition-colors",
              isCompleted && "bg-card/75",
            )}
            key={task.id}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <TaskActionForm
                action={toggleTaskCompletionAction}
                className="min-w-0 flex-1"
                taskId={task.id}
              >
                <button
                  aria-label={
                    isCompleted ? "Reopen task" : "Mark task complete"
                  }
                  className="flex w-full min-w-0 items-start gap-3 rounded-md p-1 text-left transition-colors hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  type="submit"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[hsl(var(--chart-3))]" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium text-foreground",
                        isCompleted && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {taskMeta(task)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <TaskStatusBadge status={task.status} />
                      <TaskPriorityBadge priority={task.priority} />
                    </div>
                  </div>
                </button>
              </TaskActionForm>

              <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                {!isCompleted ? (
                  <TaskActionTooltip
                    content="Start focus"
                    tooltipId={focusTooltipId}
                  >
                    <FocusStartButton
                      aria-describedby={focusTooltipId}
                      aria-label="Start focus"
                      size="icon"
                      taskId={task.id}
                      variant="outline"
                    >
                      <Timer />
                    </FocusStartButton>
                  </TaskActionTooltip>
                ) : null}

                {showUnplan && task.planned_date ? (
                  <TaskActionTooltip
                    content="Remove from today plan"
                    tooltipId={todayTooltipId}
                  >
                    <TaskActionForm action={unplanTaskAction} taskId={task.id}>
                      <Button
                        aria-describedby={todayTooltipId}
                        aria-label="Remove from today plan"
                        size="icon"
                        type="submit"
                        variant="outline"
                      >
                        <CalendarMinus />
                      </Button>
                    </TaskActionForm>
                  </TaskActionTooltip>
                ) : (
                  <TaskActionTooltip
                    content="Set planned start date to today"
                    tooltipId={todayTooltipId}
                  >
                    <TaskActionForm
                      action={planTaskForTodayAction}
                      taskId={task.id}
                    >
                      <Button
                        aria-describedby={todayTooltipId}
                        aria-label="Set planned start date to today"
                        size="icon"
                        type="submit"
                        variant="outline"
                      >
                        <CalendarPlus />
                      </Button>
                    </TaskActionForm>
                  </TaskActionTooltip>
                )}

                <TaskActionTooltip
                  content="Edit the task"
                  tooltipId={editTooltipId}
                >
                  <Button asChild size="icon" variant="outline">
                    <Link
                      aria-describedby={editTooltipId}
                      aria-label="Edit the task"
                      href={getTaskDetailHref(task.id, editReturnPath)}
                    >
                      <Pencil />
                    </Link>
                  </Button>
                </TaskActionTooltip>

                <TaskActionTooltip
                  content="Archive the task"
                  tooltipId={archiveTooltipId}
                >
                  <TaskActionForm action={archiveTaskAction} taskId={task.id}>
                    <Button
                      aria-describedby={archiveTooltipId}
                      aria-label="Archive the task"
                      size="icon"
                      type="submit"
                      variant="ghost"
                    >
                      <Archive />
                    </Button>
                  </TaskActionForm>
                </TaskActionTooltip>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
