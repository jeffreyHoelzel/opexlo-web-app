import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicTopNav } from "@/components/public-top-nav";

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />
      <section className="flex min-h-[calc(100svh-4rem)] w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Confirm your Opexlo account
                </CardTitle>
                <CardDescription>Check your email to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We sent you a confirmation link. Open it to finish setting up
                  your account and continue into your workspace.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
