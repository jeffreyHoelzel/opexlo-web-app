"use client";

import { FieldHelpTooltip } from "@/components/ui/field-help-tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_FOCUS_DURATION_SECONDS,
  clockPartsToSeconds,
  secondsToClockParts,
} from "@/lib/focus/time";
import { cn } from "@/lib/utils";

type FocusDurationInputProps = {
  className?: string;
  disabled?: boolean;
  helpText?: string;
  hint?: string;
  id: string;
  label?: string;
  maxSeconds?: number;
  onChange: (value: number) => void;
  value: number;
};

type DurationPart = "hours" | "minutes" | "seconds";

const segmentLabels: Record<DurationPart, string> = {
  hours: "Hours",
  minutes: "Minutes",
  seconds: "Seconds",
};

function padSegment(value: number) {
  return String(value).padStart(2, "0");
}

function parseSegment(value: string, maxValue: number) {
  const digits = value.replace(/\D/g, "").slice(0, 2);

  if (!digits) {
    return 0;
  }

  return Math.min(maxValue, Number(digits));
}

export function FocusDurationInput({
  className,
  disabled,
  helpText,
  hint = "Set hours, minutes, and seconds.",
  id,
  label = "Duration",
  maxSeconds = MAX_FOCUS_DURATION_SECONDS,
  onChange,
  value,
}: FocusDurationInputProps) {
  const safeValue = Math.max(0, Math.min(maxSeconds, Math.floor(value)));
  const parts = secondsToClockParts(safeValue);
  const hintId = `${id}-hint`;

  function handlePartChange(part: DurationPart, rawValue: string) {
    const nextParts = {
      ...parts,
      [part]: parseSegment(rawValue, part === "hours" ? 99 : 59),
    };
    const nextSeconds = Math.min(maxSeconds, clockPartsToSeconds(nextParts));

    onChange(nextSeconds);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={`${id}-hours`}>{label}</Label>
        {helpText ? (
          <FieldHelpTooltip content={helpText} fieldLabel={label} />
        ) : null}
      </div>
      <div
        aria-describedby={hintId}
        aria-label={label}
        className="flex items-center gap-2"
        role="group"
      >
        {(["hours", "minutes", "seconds"] as DurationPart[]).map(
          (part, index) => (
            <div className="flex items-center gap-2" key={part}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="font-mono text-base font-semibold text-muted-foreground"
                >
                  :
                </span>
              ) : null}
              <Input
                aria-label={segmentLabels[part]}
                className="h-10 w-16 text-center font-mono text-base tabular-nums"
                disabled={disabled}
                id={`${id}-${part}`}
                inputMode="numeric"
                maxLength={2}
                onChange={(event) => {
                  handlePartChange(part, event.currentTarget.value);
                }}
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
                pattern="[0-9]*"
                value={padSegment(parts[part])}
              />
            </div>
          ),
        )}
      </div>
      <p className="text-xs text-muted-foreground" id={hintId}>
        {hint}
      </p>
    </div>
  );
}
