import { PlaceholderPage } from "@/components/placeholder-page";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { projectId } = await params;

  return (
    <PlaceholderPage
      description={`Project detail route scaffold for ${projectId}. This page will connect tasks, notes, goals, and lightweight progress.`}
      eyebrow="Projects"
      title="Project detail"
    />
  );
}
