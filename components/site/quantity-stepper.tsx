import { Minus, Plus } from "lucide-react";

import { MAX_QUANTITY } from "@/lib/shop/schemas";

const stepButton =
  "flex size-11 items-center justify-center text-cream transition-colors hover:text-gold disabled:text-caramel";

export function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Quantity"
      className="flex w-fit items-center rounded-sm border border-brown"
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="One fewer"
        className={stepButton}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <span aria-live="polite" className="w-8 text-center tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QUANTITY}
        aria-label="One more"
        className={stepButton}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
