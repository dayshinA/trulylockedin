"use client";

import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRef, useState, useTransition } from "react";

import { FormNotice } from "@/components/forms/field-error";
import { clientAuth } from "@/lib/firebase/client";
import { useErrorFocus } from "@/lib/use-error-focus";
import { Field, inputClass } from "../(dashboard)/_components/admin-form";
import { createSession } from "./actions";

function signInErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/invalid-email":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Incorrect email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a few minutes and try again.";
      case "auth/network-request-failed":
        return "No connection. Check your internet and try again.";
    }
  }
  return "Sign-in failed. Please try again.";
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ email?: string[]; password?: string[] }>({});
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useErrorFocus(formRef, missing);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setError(null);
    const empty = {
      ...(!email && { email: ["Enter your email address."] }),
      ...(!password && { password: ["Enter your password."] }),
    };
    setMissing(empty);
    if (!email || !password) return;
    startTransition(async () => {
      const auth = clientAuth();
      let idToken: string;
      try {
        const { user } = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        idToken = await user.getIdToken();
      } catch (err) {
        setError(signInErrorMessage(err));
        return;
      }

      // Redirects to /admin on success.
      const result = await createSession(idToken);
      await signOut(auth);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field label="Email" error={missing.email}>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className={inputClass}
        />
      </Field>
      <Field label="Password" error={missing.password}>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      {error && <FormNotice>{error}</FormNotice>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-brand font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-muted"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
