import { PlaceholderPage } from "@/components/placeholder-page";

export default function AreasPage() {
  return (
    <PlaceholderPage
      description="Areas represent broad categories of work or life that can organize projects, goals, and tasks."
      eyebrow="Areas"
      items={["Work categories", "Linked projects", "Long-term organization"]}
      primaryHref="/app/areas/new"
      primaryLabel="New area"
      title="Areas"
    />
  );
}
