import { PlaceholderPage } from "@/components/placeholder-page";

type NoteDetailPageProps = {
  params: Promise<{ noteId: string }>;
};

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
  const { noteId } = await params;

  return (
    <PlaceholderPage
      description={`Note detail route scaffold for ${noteId}. This page will support editing, linking, previews, and archiving.`}
      eyebrow="Notes"
      title="Note detail"
    />
  );
}
