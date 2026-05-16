import { Suspense } from "react";

import { AppTopNav } from "@/components/app-top-nav";
import { requireUserClaims } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <ProtectedAppShell>{children}</ProtectedAppShell>
    </Suspense>
  );
}

async function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  const claims = await requireUserClaims();
  const email = typeof claims.email === "string" ? claims.email : undefined;

  return (
    <div className="min-h-screen bg-background">
      <AppTopNav email={email} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function AppShellFallback() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
              O
            </span>
            <span className="font-semibold">Opexlo</span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8" />
    </div>
  );
}
