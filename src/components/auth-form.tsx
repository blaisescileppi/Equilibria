"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { fieldErrors, loginSchema, signupSchema } from "@/lib/validation";
import { Alert, Button, Card, Field } from "./ui";

/** Only follow same-site paths, so a crafted link can't bounce users to another site. */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/dashboard";
  }
  return next;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    // Same schema the server uses, for instant feedback before a round trip.
    const parsed = (isSignup ? signupSchema : loginSchema).safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(null);
    const result = await api(`/api/auth/${mode}`, { method: "POST", body: parsed.data });
    if (!result.ok) {
      setPending(false);
      setErrors(result.fields);
      setFormError(result.error);
      return;
    }
    router.push(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        {isSignup
          ? "Your logs are private to your account."
          : "Sign in to pick up where you left off."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        {formError && <Alert>{formError}</Alert>}

        {isSignup && (
          <Field label="Display name" name="displayName" error={errors.displayName} hint="Shown on meal ideas you post.">
            {(props) => <input {...props} autoComplete="nickname" maxLength={40} />}
          </Field>
        )}
        <Field label="Email" name="email" error={errors.email}>
          {(props) => <input {...props} type="email" autoComplete="email" />}
        </Field>
        <Field
          label="Password"
          name="password"
          error={errors.password}
          hint={isSignup ? "8 to 72 characters." : undefined}
        >
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          )}
        </Field>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-600">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-brand underline">
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </Card>
  );
}
