import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Archive,
  ArrowLeft,
  CalendarMinus,
  CalendarPlus,
  CheckCircle2,
  Circle,
  Trash2,
} from "lucide-react";

import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/tasks/task-badges";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  archiveTaskAction,
  deleteTaskAndRedirectAction,
  planTaskForTodayAction,
  toggleTaskCompletionAction,
  unplanTaskAction,
} from "@/lib/tasks/actions";
import { getTaskById } from "@/lib/tasks/queries";

type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{
    return_to?: string | string[];
  }>;
};

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

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function getReturnPath(value: string | string[] | undefined) {
  const resolvedValue = Array.isArray(value) ? value[0] : value;

  if (!resolvedValue || !resolvedValue.startsWith("/app/")) {
    return null;
  }

  return resolvedValue;
}

function withSavedFlag(path: string) {
  const [pathname, search = ""] = path.split("?");
  const searchParams = new URLSearchParams(search);
  searchParams.set("saved", "1");

  return `${pathname}?${searchParams.toString()}`;
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: TaskDetailPageProps) {
  const [{ taskId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const returnPath = getReturnPath(resolvedSearchParams.return_to);
  const successRedirectPath = withSavedFlag(returnPath ?? "/app/tasks");
  const taskData = await getTaskById(taskId);

  if (!taskData) {
    notFound();
  }

  const { options, task } = taskData;
  const isCompleted = task.status === "completed";

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <Button asChild variant="ghost">
        <Link href="/app/tasks">
          <ArrowLeft />
          Back to tasks
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
              Task
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
              {task.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Edit task</CardTitle>
              <CardDescription>
                Keep task details simple enough to maintain quickly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskForm
                mode="edit"
                options={options}
                successRedirectPath={successRedirectPath}
                task={task}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
              <CardDescription>
                Move this task through today&apos;s loop.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <TaskActionForm
                action={toggleTaskCompletionAction}
                taskId={task.id}
              >
                <Button className="w-full" type="submit" variant="secondary">
                  {isCompleted ? <Circle /> : <CheckCircle2 />}
                  {isCompleted ? "Reopen task" : "Complete task"}
                </Button>
              </TaskActionForm>

              {task.planned_date ? (
                <TaskActionForm action={unplanTaskAction} taskId={task.id}>
                  <Button className="w-full" type="submit" variant="outline">
                    <CalendarMinus />
                    Remove from plan
                  </Button>
                </TaskActionForm>
              ) : (
                <TaskActionForm
                  action={planTaskForTodayAction}
                  taskId={task.id}
                >
                  <Button className="w-full" type="submit" variant="outline">
                    <CalendarPlus />
                    Set to today
                  </Button>
                </TaskActionForm>
              )}

              <TaskActionForm action={archiveTaskAction} taskId={task.id}>
                <Button className="w-full" type="submit" variant="outline">
                  <Archive />
                  Archive task
                </Button>
              </TaskActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Project</span>
                <span className="text-right font-medium text-foreground">
                  {task.project_name ?? "Inbox"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Area</span>
                <span className="text-right font-medium text-foreground">
                  {task.area_name ?? "None"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Goal</span>
                <span className="text-right font-medium text-foreground">
                  {task.goal_title ?? "None"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Planned start</span>
                <span className="text-right font-medium text-foreground">
                  {formatDate(task.planned_date)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Due</span>
                <span className="text-right font-medium text-foreground">
                  {formatDate(task.due_date)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Estimate</span>
                <span className="text-right font-medium text-foreground">
                  {task.estimated_minutes
                    ? `${task.estimated_minutes}m`
                    : "None"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delete</CardTitle>
              <CardDescription>
                Archive first unless the task should be removed permanently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskActionForm
                action={deleteTaskAndRedirectAction}
                taskId={task.id}
              >
                <Button className="w-full" type="submit" variant="destructive">
                  <Trash2 />
                  Delete permanently
                </Button>
              </TaskActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
