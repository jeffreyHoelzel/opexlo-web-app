import { PlaceholderPage } from "@/components/placeholder-page";

export default function ProjectsPage() {
  return (
    <PlaceholderPage
      description="Projects group related tasks, notes, and goals without turning Opexlo into a complex workspace."
      eyebrow="Projects"
      items={[
        "Active project list",
        "Linked tasks and notes",
        "Goal alignment",
      ]}
      primaryHref="/app/projects/new"
      primaryLabel="New project"
      title="Projects"
    />
  );
}
