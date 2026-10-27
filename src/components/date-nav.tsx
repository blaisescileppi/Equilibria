"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, formatDate, type ISODate } from "@/lib/dates";

/** Previous / next day links plus a date picker, driven by ?date= in the URL. */
export function DateNav({ basePath, date, today }: { basePath: string; date: ISODate; today: ISODate }) {
  const router = useRouter();
  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-lg font-semibold">
          {date === today ? "Today" : formatDate(date, { weekday: "long" })}
        </p>
        {date === today && <p className="text-sm text-stone-600">{formatDate(date, { weekday: "long" })}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`${basePath}?date=${prev}`}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
          aria-label="Previous day"
        >
          ←
        </Link>
        <input
          type="date"
          aria-label="Choose a date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && router.push(`${basePath}?date=${e.target.value}`)}
          className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
        />
        {date < today ? (
          <Link
            href={`${basePath}?date=${next}`}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
            aria-label="Next day"
          >
            →
          </Link>
        ) : (
          <span className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-300" aria-hidden>
            →
          </span>
        )}
      </div>
    </div>
  );
}
