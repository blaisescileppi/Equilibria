import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth/current-user";
import { LogoutButton } from "./logout-button";
import { NavLinks } from "./nav-links";
import { ButtonLink } from "./ui";

// The logo renders immediately as part of the static shell. Only the part
// that depends on who is signed in waits for the session, behind Suspense.
export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand-ink">
          Equilibria
        </Link>
        <Suspense fallback={<div className="h-9 flex-1" />}>
          <UserNav />
        </Suspense>
      </div>
    </header>
  );
}

async function UserNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="ml-auto flex gap-2">
        <ButtonLink href="/login" variant="ghost">
          Sign in
        </ButtonLink>
        <ButtonLink href="/signup">Get started</ButtonLink>
      </div>
    );
  }

  return (
    <>
      <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
        <NavLinks />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-stone-600 md:inline">{user.displayName}</span>
        <LogoutButton />
      </div>
    </>
  );
}
