import { PublicTopNav } from "@/components/public-top-nav";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl items-center justify-center px-6 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <UpdatePasswordForm />
        </div>
      </section>
    </main>
  );
}
