import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Inbox,
  ListChecks,
  Target,
} from "lucide-react";

import { PublicTopNav } from "@/components/public-top-nav";
import { Button } from "@/components/ui/button";
import { redirectIfAuthenticated } from "@/lib/auth";

const workflow = [
  {
    icon: Inbox,
    title: "Capture",
    text: "Get work out of your head without making organization the first step.",
  },
  {
    icon: Target,
    title: "Plan",
    text: "Choose the work that actually belongs in today before the day fills itself.",
  },
  {
    icon: Clock3,
    title: "Focus",
    text: "Move into timed sessions with the right task already in front of you.",
  },
  {
    icon: BarChart3,
    title: "Review",
    text: "See what got done and where your focus time went, without judgment.",
  },
];

const previewTasks = [
  ["Finalize launch outline", "Top priority", "45m"],
  ["Review client notes", "Planned", "25m"],
  ["Draft reminder email", "Inbox", "15m"],
];

export default function Home() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <LandingPage />
    </Suspense>
  );
}

async function LandingPage() {
  await redirectIfAuthenticated();

  return (
    <main className="min-h-screen bg-background">
      <PublicTopNav />

      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-8 mx-auto h-[78%] max-w-6xl px-6 opacity-80 md:top-12"
        >
          <div className="h-full rounded-lg border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex h-full flex-col gap-4 rounded-md border border-border bg-background/90 p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    O
                  </div>
                  <div>
                    <div className="h-3 w-20 rounded bg-primary/80" />
                    <div className="mt-2 h-2 w-28 rounded bg-muted-foreground/20" />
                  </div>
                </div>
                <div className="hidden gap-2 md:flex">
                  <div className="h-8 w-20 rounded-md border border-border bg-card" />
                  <div className="h-8 w-24 rounded-md bg-primary" />
                </div>
              </div>
              <div className="grid flex-1 gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="h-2 w-16 rounded bg-muted-foreground/20" />
                      <div className="mt-4 h-6 w-10 rounded bg-primary/80" />
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="h-2 w-20 rounded bg-muted-foreground/20" />
                      <div className="mt-4 h-6 w-12 rounded bg-accent" />
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="h-2 w-14 rounded bg-muted-foreground/20" />
                      <div className="mt-4 h-6 w-16 rounded bg-[hsl(var(--chart-3))]" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-3 w-24 rounded bg-primary/80" />
                      <div className="h-7 w-20 rounded-md bg-secondary" />
                    </div>
                    <div className="space-y-3">
                      {previewTasks.map(([title, status, time]) => (
                        <div
                          className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-3"
                          key={title}
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="size-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {status}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="hidden rounded-lg border border-border bg-card p-4 md:block">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="h-3 w-24 rounded bg-primary/80" />
                      <div className="mt-2 h-2 w-32 rounded bg-muted-foreground/20" />
                    </div>
                    <CalendarClock className="size-5 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-md bg-secondary px-3 py-4">
                      <div className="h-2 w-16 rounded bg-primary/60" />
                      <div className="mt-3 h-3 w-28 rounded bg-primary/80" />
                    </div>
                    <div className="rounded-md border border-border px-3 py-4">
                      <div className="h-2 w-20 rounded bg-muted-foreground/20" />
                      <div className="mt-3 h-3 w-24 rounded bg-accent" />
                    </div>
                    <div className="rounded-md border border-border px-3 py-4">
                      <div className="h-2 w-16 rounded bg-muted-foreground/20" />
                      <div className="mt-3 h-3 w-32 rounded bg-[hsl(var(--chart-3))]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[82svh] max-w-6xl flex-col justify-center px-6 py-24 sm:px-8">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-primary">
              Calm daily execution
            </p>
            <h1 className="text-balance text-5xl font-semibold leading-[1.03] text-foreground md:text-7xl">
              Opexlo
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Lower the mental operating expense of planning, focusing, and
              finishing work.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  Start planning today
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        className="mx-auto grid max-w-6xl gap-4 px-6 py-16 sm:px-8 md:grid-cols-4"
        id="workflow"
      >
        {workflow.map((item) => {
          const Icon = item.icon;

          return (
            <article
              className="rounded-lg border border-border bg-card p-5 shadow-sm"
              key={item.title}
            >
              <Icon className="mb-5 size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.text}
              </p>
            </article>
          );
        })}
      </section>

      <section
        className="border-y border-border bg-secondary/55"
        id="today-preview"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
              Today first
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-foreground md:text-4xl">
              One page for the work that matters now.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Opexlo keeps the backlog out of the way until you need it, so your
              day starts with priorities, realistic time, and a clear next
              session.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Planned focus
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  2h 25m
                </p>
              </div>
              <ListChecks className="size-6 text-primary" />
            </div>
            <div className="space-y-3">
              {previewTasks.map(([title, status, time]) => (
                <div
                  className="flex items-center justify-between rounded-md border border-border px-3 py-3"
                  key={title}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {title}
                    </p>
                    <p className="text-xs text-muted-foreground">{status}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8" id="principles">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Product principles
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-foreground md:text-4xl">
            Built to help you execute your day, not endlessly organize your
            life.
          </h2>
        </div>
      </section>
    </main>
  );
}
