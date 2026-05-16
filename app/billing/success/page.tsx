import { PlaceholderPage } from "@/components/placeholder-page";
import { PublicTopNav } from "@/components/public-top-nav";

export default function BillingSuccessPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <PlaceholderPage
          description="This route will receive successful Stripe Checkout redirects and guide users back to their Opexlo workspace."
          eyebrow="Billing"
          primaryHref="/app/today"
          primaryLabel="Return to Today"
          title="Checkout success"
        />
      </div>
    </main>
  );
}
