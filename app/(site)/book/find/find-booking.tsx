"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { Field, FormAlert, inputClass, primaryButtonClass } from "@/components/site/form-field";
import type { BookingSummary } from "@/lib/booking/manage";
import { cancelMyBooking, getMyBooking } from "../actions";
import { BookingDetails } from "../booking-details";
import { useErrorFocus } from "@/lib/use-error-focus";

type Found = {
  credentials: { ref: string; email: string };
  booking: BookingSummary;
  message?: string;
};

// Guests look a booking up with its reference and the email they booked
// with. The server answers the same way for a wrong reference or email.
export function FindBooking() {
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ ref?: string[]; email?: string[] }>({});
  const [searching, startSearch] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useErrorFocus(formRef, missing);

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = {
      ref: String(form.get("ref") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
    };
    setError(null);
    setMissing({
      ...(!credentials.ref && { ref: ["Enter your booking reference."] }),
      ...(!credentials.email && { email: ["Enter your email address."] }),
    });
    if (!credentials.ref || !credentials.email) return;
    startSearch(async () => {
      const result = await getMyBooking(credentials);
      if (result.ok) setFound({ credentials, booking: result.booking });
      else setError(result.error);
    });
  }

  async function cancel() {
    if (!found) return;
    const result = await cancelMyBooking(found.credentials);
    setFound(
      result.ok
        ? {
            ...found,
            booking: result.booking,
            message: "Your booking has been cancelled.",
          }
        : { ...found, message: result.error },
    );
  }

  if (found) {
    return (
      <>
        <BookingDetails
          booking={found.booking}
          message={found.message}
          onCancel={cancel}
        />
        <div className="mt-10 flex flex-wrap gap-x-6 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setFound(null)}
            className="inline-flex min-h-11 items-center text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
          >
            Look up another booking
          </button>
          <Link
            href="/book"
            className="inline-flex min-h-11 items-center text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
          >
            Make a new booking
          </Link>
        </div>
      </>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={search}
      className="mt-10 flex flex-col gap-5"
      noValidate
    >
      <Field label="Booking reference" hint="For example TLI-7KQ2ABCD"
        error={missing.ref}
      >
        <input
          name="ref"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          className={`${inputClass} font-mono uppercase`}
        />
      </Field>
      <Field label="Email you booked with" error={missing.email}>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className={inputClass}
        />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <button
        type="submit"
        disabled={searching}
        className={`${primaryButtonClass} sm:w-fit`}
      >
        {searching ? "Finding…" : "Find my booking"}
      </button>
      <p className="text-sm text-muted">
        Have an account? Bookings made while signed in are listed under{" "}
        <Link href="/account" className="text-brand underline-offset-4 hover:underline pointer-coarse:underline">
          your account
        </Link>
        .
      </p>
    </form>
  );
}
