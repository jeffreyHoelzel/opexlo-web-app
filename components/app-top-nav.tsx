"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck2,
  ClipboardList,
  Focus,
  Inbox,
  ListChecks,
  Settings,
} from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

type AppTopNavProps = {
  email?: string;
};

const navItems = [
  { href: "/app/today", label: "Today", icon: CalendarCheck2 },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/tasks", label: "Tasks", icon: ListChecks },
  { href: "/app/planner", label: "Planner", icon: ClipboardList },
  { href: "/app/focus", label: "Focus", icon: Focus },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppTopNav({ email }: AppTopNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            className="flex items-center gap-3 font-semibold"
            href="/app/today"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
              O
            </span>
            <span>Opexlo</span>
          </Link>

          <nav className="hidden items-center gap-1 overflow-x-auto md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                    isActive && "bg-card text-primary shadow-sm",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
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
