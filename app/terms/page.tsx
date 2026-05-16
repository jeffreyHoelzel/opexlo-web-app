import { PlaceholderPage } from "@/components/placeholder-page";
import { PublicTopNav } from "@/components/public-top-nav";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <PlaceholderPage
          description="Terms of service for Opexlo will be added before public launch."
          eyebrow="Legal"
          items={[
            "Account terms",
            "Subscription terms",
            "Acceptable use and service limits",
          ]}
          title="Terms of service"
        />
      </div>
    </main>
  );
}
