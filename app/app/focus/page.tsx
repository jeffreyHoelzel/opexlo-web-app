import { PlaceholderPage } from "@/components/placeholder-page";

export default function FocusPage() {
  return (
    <PlaceholderPage
      description="Focus mode will launch timed work sessions from Today and task detail routes, and continue while moving through the app."
      eyebrow="Focus"
      items={["Pomodoro sessions", "Custom timers", "Pause and complete flow"]}
      title="Focus"
    />
  );
}
