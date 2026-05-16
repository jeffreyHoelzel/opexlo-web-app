import { PlaceholderPage } from "@/components/placeholder-page";

type AreaDetailPageProps = {
  params: Promise<{ areaId: string }>;
};

export default async function AreaDetailPage({ params }: AreaDetailPageProps) {
  const { areaId } = await params;

  return (
    <PlaceholderPage
      description={`Area detail route scaffold for ${areaId}. This page will connect related projects, goals, and tasks.`}
      eyebrow="Areas"
      title="Area detail"
    />
  );
}
