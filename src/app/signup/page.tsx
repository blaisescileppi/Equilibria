import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <div className="py-8">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
