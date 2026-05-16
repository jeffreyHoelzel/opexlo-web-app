import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";
import { PublicTopNav } from "@/components/public-top-nav";
import { redirectIfAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  await redirectIfAuthenticated();

  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl items-center justify-center px-6 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
