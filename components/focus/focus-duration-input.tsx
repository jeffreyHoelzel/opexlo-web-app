"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
type SegmentInputs = Record<DurationPart, string>;

const durationParts: DurationPart[] = ["hours", "minutes", "seconds"];

const segmentLabels: Record<DurationPart, string> = {
  hours: "Hours",
  minutes: "Minutes",
  seconds: "Seconds",
};

function padSegment(value: number) {
  return String(value).padStart(2, "0");
}

function partsToInputs(totalSeconds: number): SegmentInputs {
  const parts = secondsToClockParts(totalSeconds);

  return {
    hours: padSegment(parts.hours),
    minutes: padSegment(parts.minutes),
    seconds: padSegment(parts.seconds),
  };
}

function getPartMax(part: DurationPart) {
  return part === "hours" ? 99 : 59;
}

function sanitizeSegment(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

function parseSegment(value: string, part: DurationPart) {
  const digits = sanitizeSegment(value);

  if (!digits) {
    return 0;
  }

  return Math.min(getPartMax(part), Number(digits));
}

function inputsToSeconds(inputs: SegmentInputs, maxSeconds: number) {
  return Math.min(
    maxSeconds,
    clockPartsToSeconds({
      hours: parseSegment(inputs.hours, "hours"),
      minutes: parseSegment(inputs.minutes, "minutes"),
      seconds: parseSegment(inputs.seconds, "seconds"),
    }),
  );
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
  const normalizedInputs = useMemo(() => partsToInputs(safeValue), [safeValue]);
  const [focusedPart, setFocusedPart] = useState<DurationPart | null>(null);
  const [inputs, setInputs] = useState<SegmentInputs>(normalizedInputs);
  const hintId = `${id}-hint`;

  useEffect(() => {
    if (focusedPart) {
      return;
    }

    setInputs(normalizedInputs);
  }, [focusedPart, normalizedInputs]);

  function updateInputs(nextInputs: SegmentInputs) {
    setInputs(nextInputs);
    onChange(inputsToSeconds(nextInputs, maxSeconds));
  }

  function handlePartChange(part: DurationPart, rawValue: string) {
    const nextInputs = {
      ...inputs,
      [part]: sanitizeSegment(rawValue),
    };

    updateInputs(nextInputs);
  }

  function handlePartBlur(part: DurationPart) {
    const nextInputs = {
      ...inputs,
      [part]: padSegment(parseSegment(inputs[part], part)),
    };

    setFocusedPart(null);
    updateInputs(nextInputs);
  }

  function stepPart(part: DurationPart, step: 1 | -1) {
    if (disabled) {
      return;
    }

    const currentValue = parseSegment(inputs[part], part);
    const nextValue = Math.max(
      0,
      Math.min(getPartMax(part), currentValue + step),
    );
    const nextInputs = {
      ...inputs,
      [part]: padSegment(nextValue),
    };

    updateInputs(nextInputs);
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
        className="flex flex-wrap items-center gap-2"
        role="group"
      >
        {durationParts.map((part, index) => {
          const segmentLabel = segmentLabels[part];

          return (
            <div className="flex items-center gap-2" key={part}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="font-mono text-base font-semibold text-muted-foreground"
                >
                  :
                </span>
              ) : null}
              <div className="relative w-20">
                <Input
                  aria-label={segmentLabel}
                  className="h-12 pr-7 text-center font-mono text-base tabular-nums"
                  disabled={disabled}
                  id={`${id}-${part}`}
                  inputMode="numeric"
                  maxLength={2}
                  onBlur={() => handlePartBlur(part)}
                  onChange={(event) => {
                    handlePartChange(part, event.currentTarget.value);
                  }}
                  onFocus={(event) => {
                    setFocusedPart(part);
                    event.currentTarget.select();
                  }}
                  pattern="[0-9]*"
                  value={inputs[part]}
                />
                <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col">
                  <button
                    aria-label={`Increase ${segmentLabel.toLowerCase()}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
                    disabled={disabled}
                    onClick={() => stepPart(part, 1)}
                    type="button"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    aria-label={`Decrease ${segmentLabel.toLowerCase()}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
                    disabled={disabled}
                    onClick={() => stepPart(part, -1)}
                    type="button"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground" id={hintId}>
        {hint}
      </p>
    </div>
  );
}
