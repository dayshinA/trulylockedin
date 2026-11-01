import type {
  BookingMode,
  BookingRejection,
  Service,
  ServiceOption,
} from "@/types/booking";

export type ServiceQuote = {
  // The selected options, in the service's display order.
  options: ServiceOption[];
  pricePence: number;
  // Null when the service's own duration isn't set: the total isn't known.
  durationMin: number | null;
};

export type QuoteResult =
  | { ok: true; quote: ServiceQuote }
  | { ok: false; reason: "options_required" | "invalid_options" };

type Priced = Pick<
  Service,
  | "priceFromPence"
  | "durationMin"
  | "options"
  | "optionsSelectionMode"
  | "optionsRequired"
>;

// Final price = base + selected options. Final duration likewise. The owner may
// leave a required option unpicked: their manual booking form has no picker.
export function quoteService(
  service: Priced,
  optionIds: readonly string[],
  mode: BookingMode = "client",
): QuoteResult {
  const selected = new Set(optionIds);
  const options = service.options.filter((option) => selected.has(option.id));

  if (options.length !== selected.size) {
    return { ok: false, reason: "invalid_options" };
  }
  if (service.optionsSelectionMode === "single" && options.length > 1) {
    return { ok: false, reason: "invalid_options" };
  }
  if (service.optionsRequired && options.length === 0 && mode !== "owner") {
    return { ok: false, reason: "options_required" };
  }

  return {
    ok: true,
    quote: {
      options,
      pricePence: options.reduce(
        (total, option) => total + option.pricePence,
        service.priceFromPence,
      ),
      durationMin:
        service.durationMin === null
          ? null
          : options.reduce(
              (total, option) => total + (option.durationMin ?? 0),
              service.durationMin,
            ),
    },
  };
}

export type BookingQuoteResult =
  | { ok: true; quote: ServiceQuote & { durationMin: number } }
  | { ok: false; reason: BookingRejection };

// A booking also needs to know how long it takes, or it can't be placed on the day.
export function quoteForBooking(
  service: Priced,
  optionIds: readonly string[],
  mode?: BookingMode,
): BookingQuoteResult {
  const result = quoteService(service, optionIds, mode);
  if (!result.ok) return result;
  const { durationMin } = result.quote;
  if (durationMin === null) return { ok: false, reason: "service_unavailable" };
  return { ok: true, quote: { ...result.quote, durationMin } };
}
