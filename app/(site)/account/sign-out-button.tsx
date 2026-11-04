"use client";

import { useTransition } from "react";

import { signOutMember } from "./actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOutMember())}
      className="min-h-11 text-sm text-brand underline underline-offset-4 hover:text-brand-hover disabled:text-muted"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
