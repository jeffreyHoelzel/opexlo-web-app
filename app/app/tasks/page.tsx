import { ListChecks, Plus } from "lucide-react";

import { OpenTaskModalButton } from "@/components/tasks/open-task-modal-button";
import { TaskList } from "@/components/tasks/task-list";
import { TaskSavedSuccessModal } from "@/components/tasks/task-saved-success-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTaskLibrary } from "@/lib/tasks/queries";

export default async function TasksPage() {
  const tasks = await getTaskLibrary();
  const activeCount = tasks.filter(
    (task) => task.status !== "completed",
  ).length;
  const completedCount = tasks.length - activeCount;

  return (
    <>
      <TaskSavedSuccessModal />
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
              Tasks
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
              Task library
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Review active work, adjust planning fields, and keep completed
              tasks visible without letting archived work crowd the day.
            </p>
          </div>
          <OpenTaskModalButton>
            <Plus />
            New task
          </OpenTaskModalButton>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total tasks</CardDescription>
              <CardTitle className="text-3xl">{tasks.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-3xl">{activeCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl">{completedCount}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ListChecks className="size-5 text-primary" />
              All current tasks
            </CardTitle>
            <CardDescription>
              Archived tasks are hidden from this working list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList
              editReturnPath="/app/tasks"
              emptyDescription="Use the floating task button to create a task from anywhere in the app."
              emptyTitle="No tasks yet"
              tasks={tasks}
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
}
