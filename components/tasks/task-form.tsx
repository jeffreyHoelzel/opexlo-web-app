"use client";

import { useActionState, useEffect, useRef } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialTaskActionState } from "@/lib/tasks/action-state";
import { createTaskAction, updateTaskAction } from "@/lib/tasks/actions";
import { TASK_PRIORITIES, type TaskFormOptions } from "@/lib/tasks/types";
import type { TaskListItem } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type TaskFormProps = {
  mode: "create" | "edit";
  onSuccess?: (taskId?: string) => void;
  options: TaskFormOptions;
  submitLabel?: string;
  task?: TaskListItem;
};

const fieldClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <Save />
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function TaskForm({
  mode,
  onSuccess,
  options,
  submitLabel,
  task,
}: TaskFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = mode === "edit" ? updateTaskAction : createTaskAction;
  const [state, formAction] = useActionState(action, initialTaskActionState);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (mode === "create") {
      formRef.current?.reset();
    }

    router.refresh();
    onSuccess?.(state.taskId);
  }, [mode, onSuccess, router, state]);

  return (
    <form
      action={formAction}
      className="space-y-4"
      key={`${mode}-${task?.id ?? "new"}`}
      ref={formRef}
    >
      {task ? <input name="task_id" type="hidden" value={task.id} /> : null}

      <div className="space-y-2">
        <Label htmlFor={`${mode}-task-title`}>Title</Label>
        <Input
          autoComplete="off"
          defaultValue={task?.title ?? ""}
          id={`${mode}-task-title`}
          maxLength={180}
          name="title"
          placeholder="Capture the next task"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-task-priority`}>Priority</Label>
          <select
            className={fieldClassName}
            defaultValue={task?.priority ?? "medium"}
            id={`${mode}-task-priority`}
            name="priority"
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority[0].toUpperCase()}
                {priority.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-task-estimate`}>Estimate</Label>
          <Input
            defaultValue={task?.estimated_minutes ?? ""}
            id={`${mode}-task-estimate`}
            min={1}
            name="estimated_minutes"
            placeholder="25"
            type="number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-task-due-date`}>Due date</Label>
          <Input
            defaultValue={task?.due_date ?? ""}
            id={`${mode}-task-due-date`}
            name="due_date"
            type="date"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-task-planned-date`}>Planned date</Label>
          <Input
            defaultValue={task?.planned_date ?? ""}
            id={`${mode}-task-planned-date`}
            name="planned_date"
            type="date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-task-project`}>Project</Label>
          <select
            className={fieldClassName}
            defaultValue={task?.project_id ?? ""}
            id={`${mode}-task-project`}
            name="project_id"
          >
            <option value="">Inbox</option>
            {options.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-task-area`}>Area</Label>
          <select
            className={fieldClassName}
            defaultValue={task?.area_id ?? ""}
            id={`${mode}-task-area`}
            name="area_id"
          >
            <option value="">No area</option>
            {options.areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-task-goal`}>Goal</Label>
          <select
            className={fieldClassName}
            defaultValue={task?.goal_id ?? ""}
            id={`${mode}-task-goal`}
            name="goal_id"
          >
            <option value="">No goal</option>
            {options.goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-task-description`}>Notes</Label>
        <Textarea
          defaultValue={task?.description ?? ""}
          id={`${mode}-task-description`}
          maxLength={2000}
          name="description"
          placeholder="Add details, context, or a simple next step"
        />
      </div>

      {state.message ? (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            state.status === "success"
              ? "border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))]/35 text-foreground"
              : "border-destructive/35 bg-destructive/10 text-destructive",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <SubmitButton
          label={
            submitLabel ?? (mode === "create" ? "Create task" : "Save task")
          }
        />
      </div>
    </form>
  );
}
