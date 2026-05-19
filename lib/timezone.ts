const DEFAULT_TIMEZONE = "UTC";

function normalizeTimezoneInput(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidTimezone(value: unknown): value is string {
  const timezone = normalizeTimezoneInput(value);

  if (!timezone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getFirstValidTimezone(
  ...candidates: Array<string | null | undefined>
) {
  for (const candidate of candidates) {
    if (isValidTimezone(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getTimezoneFallback(
  ...candidates: Array<string | null | undefined>
) {
  return getFirstValidTimezone(...candidates) ?? DEFAULT_TIMEZONE;
}

export function getBrowserTimezone() {
  if (typeof window === "undefined") {
    return null;
  }

  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!isValidTimezone(resolved)) {
    return null;
  }

  return resolved;
}
