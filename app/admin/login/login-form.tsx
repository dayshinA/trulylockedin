"use client";

import { FirebaseError } from "firebase/app";
import {
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
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
        // The httpOnly session cookie is the only session; keep nothing in browser storage.
        await setPersistence(auth, inMemoryPersistence);
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
        <span className="text-sand">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="min-h-12 rounded-sm border border-brown bg-espresso px-3 text-base text-cream outline-none focus:border-gold"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-sand">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 rounded-sm border border-brown bg-espresso px-3 text-base text-cream outline-none focus:border-gold"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-gold-light">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-gold font-semibold text-espresso transition-colors hover:bg-gold-light disabled:bg-brown disabled:text-sand"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
