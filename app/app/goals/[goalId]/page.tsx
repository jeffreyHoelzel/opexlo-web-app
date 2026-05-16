import { PlaceholderPage } from "@/components/placeholder-page";

type GoalDetailPageProps = {
  params: Promise<{ goalId: string }>;
};

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { goalId } = await params;

  return (
    <PlaceholderPage
      description={`Goal detail route scaffold for ${goalId}. This page will show linked projects, tasks, notes, and progress.`}
      eyebrow="Goals"
      title="Goal detail"
    />
  );
}
