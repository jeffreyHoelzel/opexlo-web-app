import { PlaceholderPage } from "@/components/placeholder-page";
import { PublicTopNav } from "@/components/public-top-nav";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <PlaceholderPage
          description="Compare the Free, Tier 1, and Tier 2 plans for Opexlo. Stripe Checkout and Customer Portal integration will power paid subscriptions."
          eyebrow="Plans"
          items={[
            "Free tier without payment information",
            "Tier 1 and Tier 2 subscription access",
            "Paid analytics entitlement checks",
          ]}
          primaryHref="/register"
          primaryLabel="Create an account"
          title="Pricing"
        />
      </div>
    </main>
  );
}
