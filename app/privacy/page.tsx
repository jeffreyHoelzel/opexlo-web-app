import { PlaceholderPage } from "@/components/placeholder-page";
import { PublicTopNav } from "@/components/public-top-nav";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <PlaceholderPage
          description="Privacy details for Opexlo will cover account data, productivity records, billing data, reminders, and analytics."
          eyebrow="Legal"
          items={[
            "Supabase account and app data",
            "Stripe billing data",
            "Reminder and productivity records",
          ]}
          title="Privacy policy"
        />
      </div>
    </main>
  );
}
