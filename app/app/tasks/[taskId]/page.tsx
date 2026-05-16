import { PlaceholderPage } from "@/components/placeholder-page";

type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { taskId } = await params;

  return (
    <PlaceholderPage
      description={`Task detail route scaffold for ${taskId}. This page will support editing, completion, reminders, checklist items, and focus entry.`}
      eyebrow="Tasks"
      title="Task detail"
    />
  );
}
