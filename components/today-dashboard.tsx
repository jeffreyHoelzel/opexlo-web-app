import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Inbox,
  Target,
} from "lucide-react";

import { FocusStartButton } from "@/components/focus/focus-start-button";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TaskListItem } from "@/lib/tasks/types";

type TodayDashboardProps = {
  tasks: TaskListItem[];
  todayDate: string;
  timezone: string;
};

function getTodayTaskHref(taskId: string) {
  const searchParams = new URLSearchParams({
    return_to: "/app/today",
  });

  return `/app/tasks/${taskId}?${searchParams.toString()}`;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function TodayDashboard({
  tasks,
  todayDate,
  timezone,
}: TodayDashboardProps) {
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const plannedMinutes = tasks.reduce(
    (total, task) => total + (task.estimated_minutes ?? 0),
    0,
  );
  const completedMinutes = completedTasks.reduce(
    (total, task) => total + (task.estimated_minutes ?? 0),
    0,
  );
  const priorityTasks = tasks.filter(
    (task) => task.priority === "high" || task.priority === "urgent",
  );
  const nextTask = tasks.find((task) => task.status !== "completed");
  const progress = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Today
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
            Make the day realistic before it gets noisy.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {todayDate} in {timezone}. Capture work, plan only what fits, and
            finish from a focused list.
          </p>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" />
              Next up
            </CardTitle>
            <CardDescription>
              The next unfinished task planned for today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextTask ? (
              <div className="rounded-lg border border-border bg-secondary/65 p-4">
                <p className="text-sm font-medium text-foreground">
                  {nextTask.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextTask.estimated_minutes
                    ? `${nextTask.estimated_minutes} minutes planned`
                    : "No estimate set"}
                </p>
                <div className="mt-4 grid gap-2">
                  <FocusStartButton className="w-full" taskId={nextTask.id} />
                  <Button asChild className="w-full" variant="outline">
                    <Link href={getTodayTaskHref(nextTask.id)}>Open task</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No unfinished planned tasks.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">
              {completedTasks.length}/{tasks.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Planned work</CardDescription>
            <CardTitle className="text-3xl">
              {formatMinutes(plannedMinutes)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatMinutes(completedMinutes)} already finished.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>High priority</CardDescription>
            <CardTitle className="text-3xl">{priorityTasks.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Keep the day centered on the work that matters most.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="size-5 text-primary" />
              Planned tasks
            </CardTitle>
            <CardDescription>
              Tasks with today as their planned date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList
              editReturnPath="/app/today"
              emptyDescription="Use the floating task button or plan an inbox task for today."
              emptyTitle="Nothing planned for today"
              showUnplan
              tasks={tasks}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-primary" />
                Planning
              </CardTitle>
              <CardDescription>Move captured work into today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" variant="outline">
                <Link href="/app/inbox">
                  <Inbox />
                  Open inbox
                </Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/app/planner">
                  <Clock3 />
                  Open planner
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Priority tasks</CardTitle>
              <CardDescription>
                High and urgent work planned today.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {priorityTasks.length > 0 ? (
                priorityTasks.map((task) => (
                  <Link
                    className="block rounded-lg bg-secondary/65 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    href={getTodayTaskHref(task.id)}
                    key={task.id}
                  >
                    {task.title}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No high priority tasks planned today.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
