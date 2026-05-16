import { PlaceholderPage } from "@/components/placeholder-page";

export default function BillingSettingsPage() {
  return (
    <PlaceholderPage
      description="Billing settings will expose subscription status and Stripe Customer Portal access."
      eyebrow="Settings"
      items={["Subscription status", "Customer Portal", "Plan entitlements"]}
      title="Billing"
    />
  );
}
