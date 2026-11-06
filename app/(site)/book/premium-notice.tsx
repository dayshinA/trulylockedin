import { Moon } from "lucide-react";

import { formatPrice } from "@/lib/format";

// Premium times in plain words, with this appointment's two prices.
// "explain": on the time step, before a time is picked.
// "selected": once the client has picked a premium time.
export function PremiumNotice({
  variant,
  premiumFrom,
  usualPence,
  premiumPence,
}: {
  variant: "explain" | "selected";
  premiumFrom: string;
  usualPence: number;
  premiumPence: number;
}) {
  return (
    <div className="flex gap-3 border-l-2 border-accent bg-accent/10 px-4 py-3 text-sm">
      <Moon aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-ink">
          {variant === "explain"
            ? "About premium times"
            : "You've picked a premium time"}
        </p>
        <p className="text-muted">
          {variant === "explain" ? (
            <>
              Appointments starting at {premiumFrom} or later, or after
              midnight, are premium times and cost a little more. They&rsquo;re
              marked &ldquo;Premium&rdquo; below.
            </>
          ) : (
            <>
              Appointments starting at {premiumFrom} or later, or after
              midnight, have a premium price.
            </>
          )}
        </p>
        <p className="text-ink">
          {variant === "explain" ? "At a premium time this appointment is " : "Your price is "}
          <span className="font-bold text-ink">
            from {formatPrice(premiumPence)}
          </span>{" "}
          instead of {formatPrice(usualPence)}.
        </p>
      </div>
    </div>
  );
}
