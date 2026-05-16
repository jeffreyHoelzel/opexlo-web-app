import { PlaceholderPage } from "@/components/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      description="Settings will centralize account, notification, and billing preferences for the authenticated workspace."
      eyebrow="Settings"
      items={[
        "Account settings",
        "Notification preferences",
        "Billing management",
      ]}
      primaryHref="/app/settings/account"
      primaryLabel="Account settings"
      title="Settings"
    />
  );
}
