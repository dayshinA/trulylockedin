"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { BookingSummary } from "@/lib/booking/manage";
import { cancelMyBooking, getMyBooking } from "../actions";
import { BookingDetails } from "../booking-details";

// The token lives in the URL fragment (#t=…), which browsers never send to the
// server or in Referer headers, so it is read here and passed to the action.
function readToken(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; booking: BookingSummary; message?: string };

export function ManageBooking({ bookingRef }: { bookingRef: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    getMyBooking({ ref: bookingRef, token: readToken() }).then((result) => {
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", booking: result.booking }
          : { kind: "error", message: result.error },
      );
    });
    return () => {
      active = false;
    };
  }, [bookingRef]);

  async function cancel() {
    const result = await cancelMyBooking({
      ref: bookingRef,
      token: readToken(),
    });
    setState((previous) =>
      result.ok
        ? {
            kind: "ready",
            booking: result.booking,
            message: "Your booking has been cancelled.",
          }
        : previous.kind === "ready"
          ? { ...previous, message: result.error }
          : { kind: "error", message: result.error },
    );
  }

  if (state.kind === "loading") {
    return <p className="mt-8 text-muted">Loading your booking…</p>;
  }

  if (state.kind === "error") {
    return (
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-lg">{state.message}</p>
        <div className="mt-4 flex flex-wrap gap-x-6">
          <Link
            href="/book/find"
            className="inline-flex min-h-11 items-center text-brand decoration-accent decoration-2 underline-offset-4 hover:underline"
          >
            Find it with your reference and email
          </Link>
          <Link
            href="/book"
            className="inline-flex min-h-11 items-center text-brand decoration-accent decoration-2 underline-offset-4 hover:underline"
          >
            Make a new booking
          </Link>
        </div>
      </div>
    );
  }

  return (
    <BookingDetails
      booking={state.booking}
      message={state.message}
      onCancel={cancel}
    />
  );
}
