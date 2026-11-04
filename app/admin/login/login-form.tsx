"use client";

import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useState, useTransition } from "react";

import { clientAuth } from "@/lib/firebase/client";
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
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setError(null);
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-muted">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="min-h-12 rounded-sm border border-field bg-page px-3 text-base text-ink outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-muted">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 rounded-sm border border-field bg-page px-3 text-base text-ink outline-none focus:border-brand"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-brand">
          {error}
        </p>
      )}

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
