"use client";

import Link from "next/link";
import { useState } from "react";

import { OptionPicker } from "@/components/site/option-picker";
import { hasPremiumPrice, quoteService } from "@/lib/booking/quote";
import {
  formatDuration,
  formatPrice,
  formatPriceFrom,
  PRICED_ON_THE_DAY,
} from "@/lib/format";
import type { Service, ServiceCategory } from "@/types/booking";
import {
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../../_components/admin-form";
import { outlineButton, primaryButton } from "../../_components/admin-ui";
import { createManualBookingAction } from "../actions";

type ManualService = Pick<
  Service,
  | "id"
  | "categoryId"
  | "name"
  | "priceFromPence"
  | "premiumPricePence"
  | "durationMin"
  | "active"
  | "options"
  | "optionsSelectionMode"
  | "optionsRequired"
  | "priceOnTheDay"
>;

export function ManualBookingForm({
  categories,
  services,
  today,
  premiumFrom,
}: {
  categories: Pick<ServiceCategory, "id" | "name">[];
  services: ManualService[];
  today: string;
  premiumFrom: string | null;
}) {
  const { state, pending, onSubmit } = useAdminForm(createManualBookingAction);
  const errors = state.fieldErrors ?? {};
  const [serviceId, setServiceId] = useState("");
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [start, setStart] = useState("");
  // null = follow the start time; set once the owner ticks or unticks it.
  const [premiumChoice, setPremiumChoice] = useState<boolean | null>(null);
  const service = services.find((s) => s.id === serviceId);
  const hasPremium = !!service && hasPremiumPrice(service);
  // Late evening, or the small hours after a late night (the owner types the
  // real date, so 01:00 belongs to the night before).
  const lateStart =
    premiumFrom !== null && start !== "" && (start >= premiumFrom || start < "06:00");
  const premium = hasPremium && (premiumChoice ?? lateStart);
  const priced = service && quoteService(service, optionIds, "owner", premium);

  if (state.status === "success" && state.bookingId) {
    return <Booked state={state} />;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        label="Service"
        hint="Services hidden from the website are listed too, so you can still book them."
        error={errors.serviceId}
      >
        <select
          name="serviceId"
          value={serviceId}
          onChange={(event) => {
            setServiceId(event.target.value);
            setOptionIds([]);
          }}
          className={inputClass}
        >
          <option value="" disabled>
            Choose a service
          </option>
          {categories.map((category) => (
            <optgroup key={category.id} label={category.name}>
              {services
                .filter((s) => s.categoryId === category.id)
                .map((s) => (
                  // No duration means the end time can't be worked out.
                  <option
                    key={s.id}
                    value={s.id}
                    disabled={s.durationMin === null}
                  >
                    {s.name}
                    {s.durationMin === null
                      ? " (add a duration first)"
                      : ` (${formatDuration(s.durationMin)})`}
                    {s.active ? "" : " (hidden online)"}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </Field>

      {service && service.options.length > 0 && (
        <OptionPicker
          service={service}
          selected={optionIds}
          onChange={setOptionIds}
          owner
        />
      )}
      {priced?.ok && (
        <p className="-mt-2 text-sm text-muted" aria-live="polite">
          {formatDuration(priced.quote.durationMin)} ·{" "}
          {service?.priceOnTheDay
            ? PRICED_ON_THE_DAY
            : formatPriceFrom(priced.quote.pricePence)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" error={errors.date}>
          <input
            name="date"
            type="date"
            defaultValue={today}
            className={inputClass}
          />
        </Field>
        <Field label="Start time" error={errors.start}>
          <input
            name="start"
            type="time"
            step={300}
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted">
        Any time works, including outside opening hours, as long as a chair is
        free. After midnight, pick the next day&rsquo;s date (01:00 after a
        late Wednesday is Thursday).
      </p>
      {service && hasPremium && (
        <label className="flex min-h-11 items-start gap-3 py-2.5 text-sm">
          <input
            type="checkbox"
            name="premium"
            checked={premium}
            onChange={(event) => setPremiumChoice(event.target.checked)}
            className="mt-px size-5 shrink-0 accent-brand"
          />
          <span className="flex flex-col gap-0.5">
            <span>
              Premium price ({formatPrice(service.premiumPricePence!)} instead
              of {formatPrice(service.priceFromPence)})
            </span>
            <span className="text-xs text-muted">
              Ticked for you on late starts. Untick it to charge the normal
              price.
            </span>
          </span>
        </label>
      )}

      <Field label="Client name" error={errors.name}>
        <input name="name" autoComplete="off" className={inputClass} />
      </Field>
      <Field
        label="Client phone"
        hint="Shown on the booking so you can call or WhatsApp them."
        error={errors.phone}
      >
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <Field
        label="Client email (optional)"
        hint="If you add it, the client is emailed a confirmation with a link to view or cancel."
        error={errors.email}
      >
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <Field
        label="Client notes (optional)"
        hint="What the client asked for. The client can see these on their booking."
        error={errors.notes}
      >
        <textarea name="notes" rows={2} className={`${inputClass} py-2`} />
      </Field>
      <Field
        label="Private notes (optional)"
        hint="Only you can see these."
        error={errors.adminNotes}
      >
        <textarea name="adminNotes" rows={2} className={`${inputClass} py-2`} />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Booking…">
        Add booking
      </SubmitButton>
    </form>
  );
}

function Booked({
  state,
}: {
  state: { message?: string; bookingId?: string; managePath?: string };
}) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window === "undefined"
      ? state.managePath
      : `${window.location.origin}${state.managePath}`;

  return (
    <div className="flex flex-col gap-6 border-t border-line pt-6">
      <p className="font-display text-3xl font-semibold">
        {state.message} It&rsquo;s confirmed.
      </p>
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-muted">
          This is the client&rsquo;s private link to view or cancel their
          booking. If you added their email, it has already been emailed to
          them. Otherwise copy it and send it by text or WhatsApp now: for
          security it can&rsquo;t be shown again. Without an email, this
          link is the only way they can manage the booking online.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-sm border border-line bg-page p-3 text-xs">
            {link}
          </code>
          <button
            type="button"
            onClick={async () => {
              if (!link) return;
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
            className={outlineButton}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/bookings/${state.bookingId}`}
          className={primaryButton}
        >
          View booking
        </Link>
        <Link href="/admin/bookings" className={outlineButton}>
          All bookings
        </Link>
      </div>
    </div>
  );
}
