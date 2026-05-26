import { CircleHelp } from "lucide-react";
import { useId } from "react";

type FieldHelpTooltipProps = {
  content: string;
  fieldLabel: string;
};

export function FieldHelpTooltip({
  content,
  fieldLabel,
}: FieldHelpTooltipProps) {
  const tooltipId = useId();

  return (
    <span className="group/tooltip relative inline-flex items-center">
      <button
        aria-describedby={tooltipId}
        aria-label={`About ${fieldLabel}`}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        type="button"
      >
        <CircleHelp className="size-3.5" />
      </button>
      <span
        className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-[min(15rem,calc(100vw-2rem))] rounded-md border border-border bg-card px-2.5 py-2 text-xs leading-5 text-card-foreground opacity-0 shadow-md transition-opacity group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100 sm:left-0 sm:right-auto sm:w-60"
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
