"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  Plus,
  Play,
  Target,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TaskPriority = "low" | "medium" | "high";

type TodayTask = {
  id: string;
  title: string;
  project: string;
  minutes: number;
  priority: TaskPriority;
  topPriority: boolean;
  completed: boolean;
  block?: string;
};

const initialTasks: TodayTask[] = [
  {
    id: "launch-outline",
    title: "Finalize launch outline",
    project: "Opexlo build",
    minutes: 45,
    priority: "high",
    topPriority: true,
    completed: false,
    block: "9:00 AM",
  },
  {
    id: "client-notes",
    title: "Review client notes",
    project: "Admin",
    minutes: 25,
    priority: "medium",
    topPriority: true,
    completed: true,
    block: "10:15 AM",
  },
  {
    id: "reminder-email",
    title: "Draft reminder email",
    project: "Marketing",
    minutes: 30,
    priority: "medium",
    topPriority: false,
    completed: false,
  },
  {
    id: "metrics-pass",
    title: "Collect weekly metrics",
    project: "Review",
    minutes: 25,
    priority: "low",
    topPriority: false,
    completed: false,
    block: "2:30 PM",
  },
];

const priorityStyles: Record<TaskPriority, string> = {
  high: "bg-primary text-primary-foreground",
  medium: "bg-accent text-accent-foreground",
  low: "bg-secondary text-secondary-foreground",
};

export function TodayDashboard() {
  const [tasks, setTasks] = useState(initialTasks);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    const plannedMinutes = tasks.reduce(
      (total, task) => total + task.minutes,
      0,
    );
    const completedMinutes = tasks
      .filter((task) => task.completed)
      .reduce((total, task) => total + task.minutes, 0);

    return {
      completed,
      plannedMinutes,
      completedMinutes,
      progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  const topPriorities = tasks.filter((task) => task.topPriority);
  const timeBlocks = tasks.filter((task) => task.block);

  function addQuickTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = quickTaskTitle.trim();
    if (!title) {
      return;
    }

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id: crypto.randomUUID(),
        title,
        project: "Inbox",
        minutes: 25,
        priority: "medium",
        topPriority: false,
        completed: false,
      },
    ]);
    setQuickTaskTitle("");
  }

  function toggleTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

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
            Capture the next task, protect top priorities, and start the next
            focus session from one calm surface.
          </p>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="size-4 text-primary" />
              Focus session
            </CardTitle>
            <CardDescription>Ready for the next planned block.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-secondary/65 p-4">
              <p className="text-sm font-medium text-foreground">
                Finalize launch outline
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                45 minutes planned
              </p>
              <Button className="mt-4 w-full" type="button">
                <Play />
                Start focus
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">
              {stats.completed}/{tasks.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Planned work</CardDescription>
            <CardTitle className="text-3xl">
              {Math.floor(stats.plannedMinutes / 60)}h{" "}
              {stats.plannedMinutes % 60}m
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {stats.completedMinutes} minutes already finished.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Top priorities</CardDescription>
            <CardTitle className="text-3xl">{topPriorities.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Keep the day centered on a short list.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="size-5 text-primary" />
                  Planned tasks
                </CardTitle>
                <CardDescription>
                  Demo tasks are stored in local state for this first pass.
                </CardDescription>
              </div>
              <form className="flex gap-2 md:min-w-80" onSubmit={addQuickTask}>
                <Input
                  aria-label="Quick task title"
                  onChange={(event) => setQuickTaskTitle(event.target.value)}
                  placeholder="Capture a task"
                  value={quickTaskTitle}
                />
                <Button aria-label="Add task" size="icon" type="submit">
                  <Plus />
                </Button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map((task) => (
                <button
                  className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-secondary/55"
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {task.completed ? (
                      <CheckCircle2 className="size-5 shrink-0 text-[hsl(var(--chart-3))]" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-sm font-medium text-foreground",
                          task.completed &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{task.project}</span>
                        <span>{task.minutes}m</span>
                        {task.block ? <span>{task.block}</span> : null}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-1 text-xs font-medium capitalize",
                      priorityStyles[task.priority],
                    )}
                  >
                    {task.priority}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-primary" />
                Time blocks
              </CardTitle>
              <CardDescription>Today&apos;s scheduled anchors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeBlocks.map((task) => (
                <div
                  className="rounded-lg border border-border bg-background p-3"
                  key={task.id}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Clock3 className="size-4 text-primary" />
                    {task.block}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {task.title}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top priorities</CardTitle>
              <CardDescription>
                Keep these visible while you work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topPriorities.map((task) => (
                <div
                  className="rounded-lg bg-secondary/65 px-3 py-3 text-sm font-medium text-foreground"
                  key={task.id}
                >
                  {task.title}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
