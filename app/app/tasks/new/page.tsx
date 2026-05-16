import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTaskOptions } from "@/lib/tasks/queries";

export default async function NewTaskPage() {
  const options = await getTaskOptions();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <Button asChild variant="ghost">
        <Link href="/app/tasks">
          <ArrowLeft />
          Back to tasks
        </Link>
      </Button>

      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          Tasks
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
          New task
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Capture the task now and organize the planning details only when they
          are useful.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Task details</CardTitle>
          <CardDescription>
            Title is required. Everything else can stay empty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm mode="create" options={options} />
        </CardContent>
      </Card>
    </section>
  );
}
