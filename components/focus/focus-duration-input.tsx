"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFocusClock, parseFocusClock } from "@/lib/focus/time";
import { cn } from "@/lib/utils";

type FocusDurationInputProps = {
  className?: string;
  disabled?: boolean;
  id: string;
  label?: string;
  onChange: (value: string) => void;
  value: string;
};

function getNormalizedClock(value: string) {
  const parsedSeconds = parseFocusClock(value);

  return parsedSeconds ? formatFocusClock(parsedSeconds) : value;
}

export function FocusDurationInput({
  className,
  disabled,
  id,
  label = "Duration",
  onChange,
  value,
}: FocusDurationInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-describedby={`${id}-hint`}
        className="font-mono text-base tabular-nums"
        disabled={disabled}
        id={id}
        inputMode="numeric"
        maxLength={8}
        onBlur={(event) => {
          onChange(getNormalizedClock(event.currentTarget.value));
        }}
        onChange={(event) => {
          onChange(event.currentTarget.value.replace(/[^\d:]/g, ""));
        }}
        placeholder="HH:MM:SS"
        value={value}
      />
      <p className="text-xs text-muted-foreground" id={`${id}-hint`}>
        HH:MM:SS, up to 99:59:59.
      </p>
    </div>
  );
}
