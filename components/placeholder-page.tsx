import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PlaceholderPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  items?: string[];
  primaryHref?: string;
  primaryLabel?: string;
};

export function PlaceholderPage({
  eyebrow = "Opexlo",
  title,
  description,
  items = [],
  primaryHref,
  primaryLabel,
}: PlaceholderPageProps) {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>

      {items.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Planned foundation</CardTitle>
            <CardDescription>
              This page is scaffolded for the MVP route map.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {items.map((item) => (
                <div
                  className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {primaryHref && primaryLabel ? (
        <Button asChild>
          <Link href={primaryHref}>
            {primaryLabel}
            <ArrowRight />
          </Link>
        </Button>
      ) : null}
    </section>
  );
}
