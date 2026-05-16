import { PlaceholderPage } from "@/components/placeholder-page";

export default function NotesPage() {
  return (
    <PlaceholderPage
      description="Notes support execution by attaching lightweight structured context to tasks, projects, areas, and goals."
      eyebrow="Notes"
      items={["Tiptap editor", "Structured links", "Plain-text previews"]}
      primaryHref="/app/notes/new"
      primaryLabel="New note"
      title="Notes"
    />
  );
}
