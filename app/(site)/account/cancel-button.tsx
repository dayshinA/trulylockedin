"use client";

import { useState, useTransition } from "react";

import { cancelBookingAsMember, cancelOrderAsMember } from "./actions";

const ACTIONS = {
  booking: {
    run: cancelBookingAsMember,
    label: "Cancel booking",
    question: "Cancel this appointment?",
  },
  order: {
    run: cancelOrderAsMember,
    label: "Cancel order",
    question: "Cancel this order?",
  },
} as const;

// Two taps: "Cancel …" → "Yes, cancel it". The page refreshes on success.
export function CancelButton({
  kind,
  id,
}: {
  kind: keyof typeof ACTIONS;
  id: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const action = ACTIONS[kind];

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await action.run(id);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="text-ink">{action.question}</span>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="min-h-11 font-semibold text-brand underline underline-offset-4 hover:text-brand-hover disabled:text-muted"
          >
            {pending ? "Cancelling…" : "Yes, cancel it"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="min-h-11 text-muted hover:text-ink"
          >
            Keep it
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-11 w-fit text-sm text-brand underline underline-offset-4 hover:text-brand-hover"
        >
          {action.label}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-brand">
          {error}
        </p>
      )}
    </div>
  );
}
