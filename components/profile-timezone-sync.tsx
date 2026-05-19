"use client";

import { useEffect } from "react";

import { syncProfileTimezoneAction } from "@/lib/planner/actions";
import { getBrowserTimezone } from "@/lib/timezone";

function isSupportedInCurrentBrowser(timezone: string) {
  if (typeof Intl.supportedValuesOf !== "function") {
    return true;
  }

  try {
    return Intl.supportedValuesOf("timeZone").includes(timezone);
  } catch {
    return true;
  }
}

export function ProfileTimezoneSync({
  currentProfileTimezone,
}: {
  currentProfileTimezone: string | null;
}) {
  useEffect(() => {
    const browserTimezone = getBrowserTimezone();

    if (
      !browserTimezone ||
      browserTimezone === currentProfileTimezone ||
      !isSupportedInCurrentBrowser(browserTimezone)
    ) {
      return;
    }

    void syncProfileTimezoneAction(browserTimezone);
  }, [currentProfileTimezone]);

  return null;
}
