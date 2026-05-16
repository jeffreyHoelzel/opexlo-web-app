import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PublicTopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-8">
        <Link className="flex items-center gap-3 font-semibold" href="/">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
            O
          </span>
          <span>Opexlo</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link className="transition-colors hover:text-foreground" href="/#workflow">
            Workflow
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/#today-preview"
          >
            Today
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/#principles"
          >
            Principles
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">
              Register
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
