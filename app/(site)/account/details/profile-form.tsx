"use client";

import { useState, useTransition } from "react";

import {
  Field,
  FormAlert,
  inputClass,
  primaryButtonClass,
} from "@/components/site/form-field";
import { saveProfile, type ProfileResult } from "../actions";

// Submitted with onSubmit + startTransition (not <form action>) so React
// doesn't reset the inputs after a failed save.
export function ProfileForm({
  name,
  email,
  phone,
}: {
  name: string;
  email: string;
  phone?: string;
}) {
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldErrors = result?.status === "invalid" ? result.fieldErrors : {};

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setResult(await saveProfile(formData)));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Name" error={fieldErrors.name}>
        <input
          name="name"
          defaultValue={name}
          autoComplete="name"
          required
          className={inputClass}
        />
      </Field>
      <Field
        label="Email"
        hint="This is the email you sign in with. It can't be changed here."
      >
        <input
          value={email}
          readOnly
          className={`${inputClass} text-muted`}
        />
      </Field>
      <Field
        label="Phone (optional)"
        hint="Used to fill in your bookings."
        error={fieldErrors.phone}
      >
        <input
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          autoComplete="tel"
          inputMode="tel"
          placeholder="07700 900123"
          className={inputClass}
        />
      </Field>

      {result?.status === "error" && <FormAlert>{result.message}</FormAlert>}
      {result?.status === "saved" && !pending && (
        <p role="status" className="text-sm text-ink">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} sm:w-fit`}
      >
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
