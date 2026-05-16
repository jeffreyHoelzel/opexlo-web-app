"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2 } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

type AppTopNavProps = {
  email?: string;
};

export function AppTopNav({ email }: AppTopNavProps) {
  const pathname = usePathname();
  const todayIsActive = pathname === "/app/today";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link className="flex items-center gap-3 font-semibold" href="/app/today">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
              O
            </span>
            <span>Opexlo</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                todayIsActive && "bg-card text-primary shadow-sm",
              )}
              href="/app/today"
            >
              <CalendarCheck2 className="size-4" />
              Today
            </Link>
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          {email ? (
            <span className="hidden max-w-56 truncate text-sm text-muted-foreground md:block">
              {email}
            </span>
          ) : null}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
