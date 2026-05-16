import Link from "next/link";
import type { ReactNode } from "react";
import {
  Archive,
  CalendarMinus,
  CalendarPlus,
  CheckCircle2,
  Circle,
  Pencil,
} from "lucide-react";

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
    task.planned_date ? `Planned ${formatDate(task.planned_date)}` : null,
  ];

  return items.filter(Boolean).join(" · ");
}

function TaskActionForm({
  action,
  children,
  taskId,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  taskId: string;
}) {
  return (
    <form action={action}>
      <input name="task_id" type="hidden" value={taskId} />
      {children}
    </form>
  );
}

export function TaskList({
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

        return (
          <article
            className={cn(
              "rounded-lg border border-border bg-card p-4 shadow-sm transition-colors",
              isCompleted && "bg-card/75",
            )}
            key={task.id}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start gap-3">
                  {isCompleted ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[hsl(var(--chart-3))]" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <Link
                      className={cn(
                        "block text-sm font-medium text-foreground transition-colors hover:text-primary",
                        isCompleted && "text-muted-foreground line-through",
                      )}
                      href={`/app/tasks/${task.id}`}
                    >
                      {task.title}
                    </Link>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {taskMeta(task)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 pl-8">
                  <TaskStatusBadge status={task.status} />
                  <TaskPriorityBadge priority={task.priority} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <TaskActionForm
                  action={toggleTaskCompletionAction}
                  taskId={task.id}
                >
                  <Button size="sm" type="submit" variant="secondary">
                    {isCompleted ? <Circle /> : <CheckCircle2 />}
                    {isCompleted ? "Reopen" : "Complete"}
                  </Button>
                </TaskActionForm>

                {showUnplan && task.planned_date ? (
                  <TaskActionForm action={unplanTaskAction} taskId={task.id}>
                    <Button size="sm" type="submit" variant="outline">
                      <CalendarMinus />
                      Unplan
                    </Button>
                  </TaskActionForm>
                ) : (
                  <TaskActionForm
                    action={planTaskForTodayAction}
                    taskId={task.id}
                  >
                    <Button size="sm" type="submit" variant="outline">
                      <CalendarPlus />
                      Today
                    </Button>
                  </TaskActionForm>
                )}

                <Button asChild size="sm" variant="outline">
                  <Link href={`/app/tasks/${task.id}`}>
                    <Pencil />
                    Edit
                  </Link>
                </Button>

                <TaskActionForm action={archiveTaskAction} taskId={task.id}>
                  <Button size="sm" type="submit" variant="ghost">
                    <Archive />
                    Archive
                  </Button>
                </TaskActionForm>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
