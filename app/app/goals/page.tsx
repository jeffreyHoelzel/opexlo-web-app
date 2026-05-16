import { PlaceholderPage } from "@/components/placeholder-page";

export default function GoalsPage() {
  return (
    <PlaceholderPage
      description="Goals connect longer-term outcomes to today's tasks without adding heavy OKR workflows."
      eyebrow="Goals"
      items={["Goal list", "Project links", "Today alignment"]}
      primaryHref="/app/goals/new"
      primaryLabel="New goal"
      title="Goals"
    />
  );
}
