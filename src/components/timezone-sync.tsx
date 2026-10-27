"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Tells the server which time zone the browser is in, so "today" on the
// server matches the user's calendar. Refreshes once if it changed.
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie.match(/(?:^|; )tz=([^;]*)/)?.[1];
    if (current && decodeURIComponent(current) === timeZone) return;
    document.cookie = `tz=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
