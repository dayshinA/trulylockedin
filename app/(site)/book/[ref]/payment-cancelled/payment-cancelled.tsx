"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { abandonDeposit } from "../../actions";
import {
  readBookingAccess,
  settleBookingAccess,
} from "@/lib/checkout-access";

type State =
  | { kind: "loading" }
  | { kind: "released"; serviceId: string | null }
  | { kind: "paid" };

// Releases the held time straight away (instead of when Stripe's page
// expires), unless it turns out the deposit was paid after all.
export function PaymentCancelled({ bookingRef }: { bookingRef: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const access = readBookingAccess(bookingRef);
    let active = true;
    (async () => {
      const result = access
        ? await abandonDeposit({ ref: bookingRef, token: access.token })
        : { serviceId: null, outcome: "unchanged" as const };
      if (!active) return;
      settleBookingAccess(bookingRef);
      setState(
        result.outcome === "paid"
          ? { kind: "paid" }
          : { kind: "released", serviceId: result.serviceId },
      );
    })();
    return () => {
      active = false;
    };
  }, [bookingRef]);

  const button =
    "inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-8 font-semibold text-on-brand transition-colors hover:bg-brand-hover";

  if (state.kind === "loading") {
    return <p className="mt-8 text-muted">Just a moment…</p>;
  }

  if (state.kind === "paid") {
    return (
      <div className="mt-8 flex flex-col items-start gap-6">
        <p className="text-lg">
          Your deposit did go through, so your booking is confirmed.
        </p>
        <Link
          href={`/book/${encodeURIComponent(bookingRef)}/thank-you`}
          className={button}
        >
          See your booking
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-start gap-6">
      <p className="text-lg">
        No payment was taken, so you haven&rsquo;t been booked in. The time
        you picked has been released.
      </p>
      <p className="text-muted">
        A deposit is needed to confirm a booking. You can pick a time again
        whenever you&rsquo;re ready.
      </p>
      <Link
        href={
          state.serviceId
            ? `/book?service=${encodeURIComponent(state.serviceId)}`
            : "/book"
        }
        className={button}
      >
        Try again
      </Link>
    </div>
  );
}
