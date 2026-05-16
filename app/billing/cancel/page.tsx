import { PlaceholderPage } from "@/components/placeholder-page";
import { PublicTopNav } from "@/components/public-top-nav";

export default function BillingCancelPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <PlaceholderPage
          description="This route will receive canceled Stripe Checkout redirects and let users review plans again."
          eyebrow="Billing"
          primaryHref="/pricing"
          primaryLabel="View pricing"
          title="Checkout canceled"
        />
      </div>
    </main>
  );
}
