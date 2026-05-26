"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type ActionTooltipProps = {
  align?: "center" | "left" | "right";
  children: ReactNode;
  className?: string;
  content: string;
  container?: "div" | "span";
  side?: "bottom" | "top";
  tooltipId?: string;
};

export function ActionTooltip({
  align = "right",
  children,
  className,
  content,
  container = "span",
  side = "bottom",
  tooltipId,
}: ActionTooltipProps) {
  const generatedId = useId();
  const resolvedTooltipId = tooltipId ?? generatedId;
  const Component = container;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Component
      className={cn("relative inline-flex", className)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsVisible(false);
        }
      }}
      onFocusCapture={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.matches(":focus-visible")
        ) {
          setIsVisible(true);
        }
      }}
      onPointerDown={() => setIsVisible(false)}
      onPointerEnter={() => setIsVisible(true)}
      onPointerLeave={() => setIsVisible(false)}
    >
      {children}
      <span
        className={cn(
          "pointer-events-none absolute z-20 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[11px] text-card-foreground opacity-0 shadow-sm transition-opacity",
          isVisible && "opacity-100",
          side === "bottom" && "top-full mt-2",
          side === "top" && "bottom-full mb-2",
          align === "left" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "right" && "right-0",
        )}
        id={resolvedTooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </Component>
  );
}
