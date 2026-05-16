import { PlaceholderPage } from "@/components/placeholder-page";

export default function TasksPage() {
  return (
    <PlaceholderPage
      description="A focused task library with filtering, search, completion, planning, and task detail entry points."
      eyebrow="Tasks"
      items={["Task list", "Filters and search", "Shared task form"]}
      primaryHref="/app/tasks/new"
      primaryLabel="New task"
      title="Tasks"
    />
  );
}
