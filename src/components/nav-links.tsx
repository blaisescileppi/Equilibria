"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

// Add the education tab here when it exists.
const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/logs", label: "Daily log" },
  { href: "/cycles", label: "Periods" },
  { href: "/meals", label: "Meals" },
  { href: "/board", label: "Meal ideas" },
  { href: "/insights", label: "Insights" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm",
              active ? "bg-brand-soft font-medium text-brand-ink" : "text-stone-600 hover:bg-stone-100",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
