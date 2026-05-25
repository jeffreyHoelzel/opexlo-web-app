import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/utils";

type ActionTooltipProps = {
  align?: "center" | "left" | "right";
  children: ReactNode;
  className?: string;
  content: string;
  container?: "div" | "span";
  tooltipId?: string;
};

export function ActionTooltip({
  align = "right",
  children,
  className,
  content,
  container = "span",
  tooltipId,
}: ActionTooltipProps) {
  const generatedId = useId();
  const resolvedTooltipId = tooltipId ?? generatedId;
  const Component = container;

  return (
    <Component className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        className={cn(
          "pointer-events-none absolute top-full z-20 mt-2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[11px] text-card-foreground opacity-0 shadow-sm transition-opacity group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100",
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
