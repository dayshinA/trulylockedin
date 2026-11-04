"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { STATUS_LABELS } from "@/lib/booking/labels";
import type { BookingSummary } from "@/lib/booking/manage";
import { DetailRows } from "@/components/site/detail-rows";
import { formatLocalDate } from "@/lib/format";
import { cancelMyBooking, getMyBooking } from "../actions";

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
  const [confirming, setConfirming] = useState(false);
  const [cancelling, startCancel] = useTransition();

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

  function cancel() {
    startCancel(async () => {
      const result = await cancelMyBooking({
        ref: bookingRef,
        token: readToken(),
      });
      setConfirming(false);
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
    });
  }

  if (state.kind === "loading") {
    return <p className="mt-8 text-muted">Loading your booking…</p>;
  }

  if (state.kind === "error") {
    return (
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-lg">{state.message}</p>
        <Link
          href="/book"
          className="mt-4 inline-flex min-h-11 items-center text-brand decoration-accent decoration-2 underline-offset-4 hover:underline"
        >
          Make a new booking
        </Link>
      </div>
    );
  }

  const { booking, message } = state;
  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl font-semibold">
        {booking.serviceName}
      </h2>
      <div className="mt-6">
        <DetailRows
          rows={[
            ["Name", booking.clientName],
            ...(booking.optionNames.length > 0
              ? ([["Options", booking.optionNames.join(", ")]] as [
                  string,
                  string,
                ][])
              : []),
            [
              "When",
              `${formatLocalDate(booking.date, "long")}, ${booking.start}–${booking.end}`,
            ],
            ["Status", STATUS_LABELS[booking.status]],
            [
              "Reference",
              <span key="ref" className="font-mono">
                {booking.ref}
              </span>,
            ],
          ]}
        />
      </div>

      {message && (
        <p role="status" className="mt-5 font-semibold text-brand">
          {message}
        </p>
      )}

      {booking.canCancel ? (
        confirming ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <p className="w-full">Cancel this appointment?</p>
            <button
              type="button"
              onClick={cancel}
              disabled={cancelling}
              className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-page transition-colors hover:bg-brand disabled:bg-line disabled:text-muted"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel it"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-11 px-3 text-sm text-muted hover:text-ink"
            >
              Keep my booking
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-8 min-h-11 rounded-full border border-brand px-6 text-sm text-ink transition-colors hover:border-brand"
          >
            Cancel booking
          </button>
        )
      ) : (
        booking.status !== "cancelled" && (
          <p className="mt-8 text-muted">
            Need to change or cancel? Please contact us.
          </p>
        )
      )}
    </section>
  );
}
