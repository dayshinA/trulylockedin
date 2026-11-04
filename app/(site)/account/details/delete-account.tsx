"use client";

import { useState, useTransition } from "react";

import { Field, FormAlert, inputClass } from "@/components/site/form-field";
import { deleteAccount } from "../actions";

export function DeleteAccount() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirmation = new FormData(event.currentTarget).get("confirm");
    setError(null);
    // Redirects to /account on success.
    startTransition(async () => {
      const result = await deleteAccount(confirmation);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <details className="border-t border-line pt-6">
      <summary className="min-h-11 cursor-pointer text-sm text-muted hover:text-ink">
        Delete your account
      </summary>
      <form
        onSubmit={onSubmit}
        className="mt-4 flex flex-col gap-5"
        noValidate
      >
        <p className="text-sm text-muted">
          This removes your account and signs you out everywhere. Bookings and
          orders you have already made stay with the salon, so they still go
          ahead. To cancel one, use the link you were given at the time.
        </p>
        <Field label="Type DELETE to confirm">
          <input
            name="confirm"
            autoComplete="off"
            autoCapitalize="characters"
            className={inputClass}
          />
        </Field>
        {error && <FormAlert>{error}</FormAlert>}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-ink px-8 font-semibold text-page transition-colors hover:bg-brand disabled:bg-line disabled:text-muted sm:w-fit"
        >
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </form>
    </details>
  );
}
