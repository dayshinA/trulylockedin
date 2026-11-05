"use client";

import { useState, useTransition } from "react";

import { DetailRows } from "@/components/site/detail-rows";
import { STATUS_LABELS } from "@/lib/booking/labels";
import type { BookingSummary } from "@/lib/booking/manage";
import { formatLocalDate, formatPrice } from "@/lib/format";

// What the client hears about each status, under the details.
const STATUS_NOTES: Record<BookingSummary["status"], string> = {
  awaiting_deposit:
    "We're waiting for your deposit payment to go through. If you left the payment page, this time will be released shortly.",
  confirmed: "Your appointment is confirmed. See you then!",
  cancelled: "This booking has been cancelled.",
  completed: "Thanks for visiting us.",
  no_show: "We missed you at this appointment.",
};

// The client's view of one booking, with a two-tap cancel. Shared by the
// private manage link (/book/{ref}) and "Find my booking" (/book/find).
export function BookingDetails({
  booking,
  message,
  onCancel,
}: {
  booking: BookingSummary;
  message?: string;
  // Resolves once the cancel request has finished (the parent updates state).
  onCancel: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, startCancel] = useTransition();

  function cancel() {
    startCancel(async () => {
      await onCancel();
      setConfirming(false);
    });
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl font-semibold">
        {booking.serviceName}
      </h2>
      <p
        className={`mt-3 text-lg ${booking.status === "cancelled" ? "text-muted" : "text-ink"}`}
      >
        <span className="font-semibold">{STATUS_LABELS[booking.status]}.</span>{" "}
        {STATUS_NOTES[booking.status]}
      </p>
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
            ["Price from", formatPrice(booking.pricePence)],
            ...depositRows(booking),
            ...(booking.notes
              ? ([
                  [
                    "Your notes",
                    <span key="notes" className="whitespace-pre-wrap">
                      {booking.notes}
                    </span>,
                  ],
                ] as [string, React.ReactNode][])
              : []),
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
            <p className="w-full">
              Cancel this appointment?
              {booking.deposit?.status === "paid" && (
                <>
                  {" "}
                  Your {formatPrice(booking.deposit.amountPence)} deposit is
                  non-refundable, so it won&rsquo;t be returned.
                </>
              )}
            </p>
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
        booking.status !== "cancelled" &&
        booking.status !== "completed" &&
        booking.status !== "no_show" && (
          <p className="mt-8 text-muted">
            Need to change or cancel? Please contact us.
          </p>
        )
      )}
    </section>
  );
}

// Deposit and what's left to pay, once a deposit was taken.
export function depositRows(
  booking: Pick<BookingSummary, "deposit" | "pricePence">,
): [string, string][] {
  const deposit = booking.deposit;
  if (!deposit || deposit.status === "awaiting") return [];
  if (deposit.status === "paid") {
    return [
      ["Deposit paid", formatPrice(deposit.amountPence)],
      [
        "Left to pay",
        `${formatPrice(Math.max(0, booking.pricePence - deposit.amountPence))} from, at your appointment`,
      ],
    ];
  }
  return [
    [
      "Deposit",
      deposit.status === "refunded"
        ? `${formatPrice(deposit.amountPence)} refunded`
        : `${formatPrice(deposit.amountPence)}, refund in progress`,
    ],
  ];
}
