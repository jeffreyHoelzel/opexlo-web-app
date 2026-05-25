"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { FieldHelpTooltip } from "@/components/ui/field-help-tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialTaskActionState } from "@/lib/tasks/action-state";
import { createTaskAction, updateTaskAction } from "@/lib/tasks/actions";
import { TASK_PRIORITIES, type TaskFormOptions } from "@/lib/tasks/types";
import type { TaskListItem } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

export type TaskFormSuccessResult = {
  message: string;
  mode: "create" | "edit";
  taskId?: string;
};

type TaskFormProps = {
  formId?: string;
  hideSubmitButton?: boolean;
  mode: "create" | "edit";
  onPendingChange?: (isPending: boolean) => void;
  onSuccess?: (result: TaskFormSuccessResult) => void;
  options: TaskFormOptions;
  stickySubmitBar?: boolean;
  successRedirectPath?: string;
  submitLabel?: string;
  task?: TaskListItem;
};

const fieldClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button disabled={pending} type="submit">
      <Save />
      {pending ? "Saving..." : label}
    </Button>
  );
}

function LabelWithHelp({
  fieldLabel,
  helpText,
  htmlFor,
}: {
  fieldLabel: string;
  helpText: string;
  htmlFor: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{fieldLabel}</Label>
      <FieldHelpTooltip content={helpText} fieldLabel={fieldLabel} />
    </div>
  );
}

export function TaskForm({
  formId,
  hideSubmitButton = false,
  mode,
  onPendingChange,
  onSuccess,
  options,
  stickySubmitBar = false,
  successRedirectPath,
  submitLabel,
  task,
}: TaskFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handledSuccessSubmissionCountRef = useRef(0);
  const submissionCountRef = useRef(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const action = mode === "edit" ? updateTaskAction : createTaskAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialTaskActionState,
  );

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (
      submissionCountRef.current === handledSuccessSubmissionCountRef.current
    ) {
      return;
    }

    handledSuccessSubmissionCountRef.current = submissionCountRef.current;

    if (mode === "create") {
      formRef.current?.reset();
    }

    if (successRedirectPath) {
      router.push(successRedirectPath);
      return;
    }

    router.refresh();
    onSuccess?.({
      message: state.message,
      mode,
      taskId: state.taskId,
    });
  }, [mode, onSuccess, router, state, successRedirectPath]);

  return (
    <form
      action={formAction}
      className="space-y-4"
      id={formId}
      key={`${mode}-${task?.id ?? "new"}`}
      onSubmit={() => {
        submissionCountRef.current += 1;
        setHasSubmitted(true);
      }}
      ref={formRef}
    >
      <div className="space-y-4">
        {task ? <input name="task_id" type="hidden" value={task.id} /> : null}

        <div className="space-y-2">
          <LabelWithHelp
            fieldLabel="Title"
            helpText="A short action statement for what you need to do."
            htmlFor={`${mode}-task-title`}
          />
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
            <LabelWithHelp
              fieldLabel="Priority"
              helpText="Use priority to signal urgency and importance."
              htmlFor={`${mode}-task-priority`}
            />
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
            <LabelWithHelp
              fieldLabel="Estimate (minutes)"
              helpText="Estimated working time in minutes. This helps planning realism."
              htmlFor={`${mode}-task-estimate`}
            />
            <div className="relative">
              <Input
                className="pr-12"
                defaultValue={task?.estimated_minutes ?? ""}
                id={`${mode}-task-estimate`}
                min={1}
                name="estimated_minutes"
                placeholder="25"
                type="number"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                min
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <LabelWithHelp
              fieldLabel="Due date"
              helpText="Optional deadline date for when this task must be finished."
              htmlFor={`${mode}-task-due-date`}
            />
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
            <LabelWithHelp
              fieldLabel="Planned start date"
              helpText="The day you intend to start this task. If it matches your current day, the task appears in Today."
              htmlFor={`${mode}-task-planned-date`}
            />
            <Input
              defaultValue={task?.planned_date ?? ""}
              id={`${mode}-task-planned-date`}
              name="planned_date"
              type="date"
            />
          </div>

          <div className="space-y-2">
            <LabelWithHelp
              fieldLabel="Project"
              helpText="Optional project grouping for related tasks."
              htmlFor={`${mode}-task-project`}
            />
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
            <LabelWithHelp
              fieldLabel="Area"
              helpText="Optional life/work area this task supports."
              htmlFor={`${mode}-task-area`}
            />
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
            <LabelWithHelp
              fieldLabel="Goal"
              helpText="Optional long-term goal this task contributes to."
              htmlFor={`${mode}-task-goal`}
            />
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
          <LabelWithHelp
            fieldLabel="Notes"
            helpText="Optional execution details, context, or checklist-style notes."
            htmlFor={`${mode}-task-description`}
          />
          <Textarea
            defaultValue={task?.description ?? ""}
            id={`${mode}-task-description`}
            maxLength={2000}
            name="description"
            placeholder="Add details, context, or a simple next step"
          />
        </div>

        {hasSubmitted && state.message ? (
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
      </div>

      {hideSubmitButton ? null : (
        <div
          className={cn(
            "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end",
            stickySubmitBar &&
              "sticky bottom-0 z-20 border-t border-border bg-card/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85",
          )}
        >
          <SubmitButton
            label={
              submitLabel ?? (mode === "create" ? "Create task" : "Save task")
            }
            pending={isPending}
          />
        </div>
      )}
    </form>
  );
}
