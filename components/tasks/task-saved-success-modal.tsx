"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useBodyScrollLock } from "@/components/ui/use-body-scroll-lock";

function getPathWithoutSavedParam(
  pathname: string,
  searchParams: { toString(): string },
) {
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.delete("saved");
  const nextQuery = nextSearchParams.toString();

  return nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
}

export function TaskSavedSuccessModal({
  description = "Your changes are now in the task library.",
}: {
  description?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const shouldShowFromQuery = searchParams.get("saved") === "1";
  const isOpen = shouldShowFromQuery && !dismissed;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (shouldShowFromQuery) {
      setDismissed(false);
    }
  }, [shouldShowFromQuery]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    router.replace(getPathWithoutSavedParam(pathname, searchParams), {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!shouldShowFromQuery || dismissed) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismiss, dismissed, shouldShowFromQuery]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm">
      <div
        aria-modal="true"
        aria-labelledby="task-saved-title"
        className="w-full max-w-sm rounded-lg border border-border bg-card p-5 text-card-foreground shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-[hsl(var(--chart-3))]/25 p-1.5 text-[hsl(var(--chart-3))]">
              <CheckCircle2 className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold" id="task-saved-title">
                Task saved successfully
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <Button
            aria-label="Close success message"
            onClick={dismiss}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={dismiss} type="button">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
