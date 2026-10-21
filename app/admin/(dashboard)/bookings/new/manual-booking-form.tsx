"use client";

import Link from "next/link";
import { useState } from "react";

import { formatDuration } from "@/lib/format";
import type { Service } from "@/types/booking";
import {
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../../_components/admin-form";
import { outlineButton, primaryButton } from "../../_components/admin-ui";
import { createManualBookingAction } from "../actions";

export function ManualBookingForm({
  services,
  today,
}: {
  services: Pick<Service, "id" | "name" | "durationMin" | "active">[];
  today: string;
}) {
  const { state, pending, onSubmit } = useAdminForm(createManualBookingAction);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success" && state.bookingId) {
    return <Booked state={state} />;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Service" error={errors.serviceId}>
        <select name="serviceId" defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose a service
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({formatDuration(s.durationMin)})
              {s.active ? "" : " (hidden online)"}
            </option>
          ))}
        </select>
      </Field>

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
          <input name="start" type="time" step={300} className={inputClass} />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-sand">
        Any time works, including outside opening hours. It just can&rsquo;t
        overlap another appointment.
      </p>

      <Field label="Client name" error={errors.name}>
        <input name="name" autoComplete="off" className={inputClass} />
      </Field>
      <Field label="Client phone" error={errors.phone}>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <Field label="Client email (optional)" error={errors.email}>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <Field label="Client notes (optional)" error={errors.notes}>
        <textarea name="notes" rows={2} className={`${inputClass} py-2`} />
      </Field>
      <Field label="Private notes (optional)" error={errors.adminNotes}>
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
    <div className="flex flex-col gap-6 border-t border-brown pt-6">
      <p className="font-display text-3xl font-semibold">
        {state.message} It&rsquo;s confirmed.
      </p>
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-sand">
          Client&rsquo;s private link to view or cancel. Send it now if you want
          them to have it; it can&rsquo;t be shown again.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-sm border border-brown bg-espresso p-3 text-xs">
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
