import Link from "next/link";
import { Inbox } from "lucide-react";

import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getInboxTasks } from "@/lib/tasks/queries";

export default async function InboxPage() {
  const tasks = await getInboxTasks();

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Capture
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
            Inbox
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Unplanned tasks stay here until you assign them to today, a project,
            an area, or a goal.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/tasks/new">
            <Inbox />
            New task
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Unplanned tasks</CardTitle>
          <CardDescription>
            Plan only what you intend to work on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskList
            emptyDescription="Use the floating task button to capture your first task."
            emptyTitle="Inbox is clear"
            tasks={tasks}
          />
        </CardContent>
      </Card>
    </section>
  );
}
