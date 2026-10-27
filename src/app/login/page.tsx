import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

// The form reads ?next= from the URL, which isn't known at build time, so
// it renders inside Suspense while the rest of the page is prerendered.
export default function LoginPage() {
  return (
    <div className="py-8">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
