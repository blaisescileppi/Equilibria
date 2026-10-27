"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh(); // re-render server components that showed the user
  }

  return (
    <Button variant="secondary" onClick={logout} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
