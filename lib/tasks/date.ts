export function getDateInTimeZone(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    }).formatToParts(date);

    const day = parts.find((part) => part.type === "day")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const year = parts.find((part) => part.type === "year")?.value;

    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall through to UTC if the stored timezone is invalid.
  }

  return date.toISOString().slice(0, 10);
}
