import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/lib/tasks/types";

const priorityLabels: Record<TaskPriority, string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
  urgent: "Urgent",
};

const statusLabels: Record<TaskStatus, string> = {
  archived: "Archived",
  completed: "Completed",
  inbox: "Inbox",
  in_progress: "In progress",
  planned: "Planned",
};

const priorityStyles: Record<TaskPriority, string> = {
  high: "border-primary/20 bg-primary/10 text-primary",
  low: "border-border bg-background text-muted-foreground",
  medium: "border-accent/50 bg-accent/35 text-accent-foreground",
  urgent: "border-primary bg-primary text-primary-foreground",
};

const statusStyles: Record<TaskStatus, string> = {
  archived: "border-border bg-background text-muted-foreground",
  completed: "border-transparent bg-[hsl(var(--chart-3))] text-foreground",
  inbox: "border-border bg-background text-muted-foreground",
  in_progress: "border-primary/20 bg-primary/10 text-primary",
  planned: "border-accent/50 bg-accent/35 text-accent-foreground",
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const safePriority = priority as TaskPriority;

  if (!priorityLabels[safePriority]) {
    return null;
  }

  return (
    <Badge
      className={cn("font-medium", priorityStyles[safePriority])}
      variant="outline"
    >
      {priorityLabels[safePriority]}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  const safeStatus = status as TaskStatus;

  if (!statusLabels[safeStatus]) {
    return null;
  }

  return (
    <Badge
      className={cn("font-medium", statusStyles[safeStatus])}
      variant="outline"
    >
      {statusLabels[safeStatus]}
    </Badge>
  );
}
