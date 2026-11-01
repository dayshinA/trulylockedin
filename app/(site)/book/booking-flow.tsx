"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { STATUS_LABELS } from "@/lib/booking/labels";
import { addDays } from "@/lib/booking/time";
import { DetailRows } from "@/components/site/detail-rows";
import { formatDuration, formatLocalDate, formatPriceFrom } from "@/lib/format";
import type { BookingStatus, Service, Slot } from "@/types/booking";
import { createBooking, getSlots } from "./actions";
import { DayGrid } from "./day-grid";

export type BookableService = Pick<
  Service,
  | "id"
  | "name"
  | "description"
  | "durationMin"
  | "priceFromPence"
  | "depositNote"
>;

type Step = "service" | "time" | "details" | "done";

type Confirmation = {
  ref: string;
  serviceName: string;
  date: string;
  start: string;
  end: string;
  status: BookingStatus;
  manageUrl: string;
};

type FieldErrors = Partial<Record<string, string[]>>;

const inputClass =
  "min-h-12 w-full rounded-sm border border-field bg-page px-3 text-base text-ink outline-none focus:border-brand";

export function BookingFlow({
  services,
  today,
  maxAdvanceDays,
  initialServiceId,
}: {
  services: BookableService[];
  today: string;
  maxAdvanceDays: number;
  initialServiceId?: string;
}) {
  const [initialService] = useState(
    () => services.find((s) => s.id === initialServiceId) ?? null,
  );
  const [step, setStep] = useState<Step>(initialService ? "time" : "service");
  const [service, setService] = useState<BookableService | null>(
    initialService,
  );
  const [date, setDate] = useState<string | null>(
    initialService ? today : null,
  );
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [loadingSlots, startSlots] = useTransition();
  const [submitting, startSubmit] = useTransition();
  // Ignore slot responses for a day the client has already moved away from.
  const latestRequest = useRef(0);

  // Arriving with ?service=…: fetch that service's times for today once.
  useEffect(() => {
    if (!initialService) return;
    const request = ++latestRequest.current;
    startSlots(async () => {
      const result = await getSlots({
        serviceId: initialService.id,
        date: today,
      });
      if (request !== latestRequest.current) return;
      if (result.ok) setSlots(result.slots);
      else setSlotError(result.error);
    });
  }, [initialService, today]);

  const lastDay = addDays(today, maxAdvanceDays);

  function loadSlots(forService: BookableService, forDate: string) {
    const request = ++latestRequest.current;
    setSlots(null);
    setSlotError(null);
    startSlots(async () => {
      const result = await getSlots({
        serviceId: forService.id,
        date: forDate,
      });
      if (request !== latestRequest.current) return;
      if (result.ok) setSlots(result.slots);
      else setSlotError(result.error);
    });
  }

  function chooseService(next: BookableService) {
    setService(next);
    setSlot(null);
    setStep("time");
    const firstDay = date ?? today;
    setDate(firstDay);
    loadSlots(next, firstDay);
  }

  function chooseDate(next: string) {
    if (!service) return;
    setDate(next);
    setSlot(null);
    loadSlots(service, next);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !date || !slot) return;
    const form = new FormData(event.currentTarget);
    setFormError(null);
    setFieldErrors({});

    startSubmit(async () => {
      const result = await createBooking({
        serviceId: service.id,
        date,
        start: slot.start,
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        notes: form.get("notes"),
        website: form.get("website"),
      });

      if (result.ok) {
        const { booking, cancelToken } = result;
        setConfirmation({
          ...booking,
          manageUrl: `/book/${booking.ref}#t=${cancelToken}`,
        });
        setStep("done");
        return;
      }

      setFormError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      if (result.reason === "slot_taken") {
        // Someone else got there first: show fresh times.
        setSlot(null);
        setStep("time");
        loadSlots(service, date);
      }
    });
  }

  const summary = step !== "done" && (
    <Summary
      service={service}
      date={step !== "service" ? date : null}
      slot={step === "details" ? slot : null}
      onChangeService={step !== "service" ? () => setStep("service") : null}
      onChangeTime={step === "details" ? () => setStep("time") : null}
    />
  );

  return (
    <div
      className={`mt-10 grid gap-10 ${step !== "done" ? "lg:grid-cols-[1fr_20rem] lg:gap-16" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-8">
        {/* On phones the summary sits above the step, once there's
            something in it. */}
        {step !== "service" && <div className="lg:hidden">{summary}</div>}

        {step === "service" && (
          <section aria-labelledby="choose-service">
            <StepHeading id="choose-service" number={1}>
              Choose a service
            </StepHeading>
            <ul className="mt-6 border-t border-line">
              {services.map((s) => (
                <li key={s.id} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => chooseService(s)}
                    className="group flex w-full items-baseline gap-6 py-5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-display text-2xl font-semibold transition-colors group-hover:text-brand-hover ${
                          s.id === service?.id ? "text-brand" : "text-ink"
                        }`}
                      >
                        {s.name}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {formatDuration(s.durationMin)}
                        {s.description ? ` · ${s.description}` : ""}
                      </span>
                      {s.depositNote && (
                        <span className="mt-1 block text-sm text-ink">
                          {s.depositNote}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-brand">
                      {formatPriceFrom(s.priceFromPence)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {step === "time" && service && (
          <section
            aria-labelledby="choose-time"
            className="flex flex-col gap-6"
          >
            <StepHeading
              id="choose-time"
              number={2}
              back={{
                label: "Back to services",
                onClick: () => setStep("service"),
              }}
            >
              Pick a day and time
            </StepHeading>

            <div className="grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-10">
              <DayGrid
                first={today}
                last={lastDay}
                selected={date}
                onSelect={chooseDate}
              />
              <div className="flex flex-col gap-6">
                {formError && (
                  <p role="alert" className="text-sm font-semibold text-brand">
                    {formError}
                  </p>
                )}

                <div aria-live="polite">
                  {loadingSlots || (!slots && !slotError) ? (
                    <p className="text-muted">Finding times…</p>
                  ) : slotError ? (
                    <p className="font-semibold text-brand">{slotError}</p>
                  ) : slots && slots.length === 0 ? (
                    <p className="text-muted">
                      No times available on{" "}
                      {date && formatLocalDate(date, "long")}. Try another day.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {groupSlots(slots ?? []).map(([label, group]) => (
                        <div key={label}>
                          <h3 className="text-sm text-muted">{label}</h3>
                          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {group.map((s) => (
                              <button
                                key={s.startUtc}
                                type="button"
                                onClick={() => {
                                  setSlot(s);
                                  setFormError(null);
                                  setStep("details");
                                }}
                                className="min-h-12 rounded-sm border border-line text-ink transition-colors hover:border-brand hover:text-brand-hover"
                              >
                                {s.start}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {step === "details" && service && date && slot && (
          <section
            aria-labelledby="your-details"
            className="flex flex-col gap-6"
          >
            <StepHeading
              id="your-details"
              number={3}
              back={{ label: "Back to times", onClick: () => setStep("time") }}
            >
              Your details
            </StepHeading>

            <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
              <Field label="Name" error={fieldErrors.name}>
                <input
                  name="name"
                  autoComplete="name"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Phone" error={fieldErrors.phone}>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="07700 900123"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Email (optional)" error={fieldErrors.email}>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Anything we should know? (optional)"
                error={fieldErrors.notes}
              >
                <textarea
                  name="notes"
                  rows={3}
                  className={`${inputClass} py-2`}
                />
              </Field>

              {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
              <div
                aria-hidden
                className="absolute -left-[9999px] h-0 overflow-hidden"
              >
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              {formError && (
                <p role="alert" className="text-sm font-semibold text-brand">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="min-h-12 rounded-full bg-brand px-10 font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-muted sm:w-fit"
              >
                {submitting ? "Booking…" : "Request booking"}
              </button>
            </form>
          </section>
        )}

        {step === "done" && confirmation && (
          <section aria-labelledby="booked" className="max-w-2xl">
            <h2
              id="booked"
              className="font-display text-4xl font-semibold sm:text-5xl"
            >
              {confirmation.status === "confirmed"
                ? "You're booked in"
                : "Request received"}
            </h2>
            <p className="mt-3 text-lg text-muted">
              {confirmation.status === "confirmed"
                ? "Your appointment is confirmed."
                : "We'll confirm your appointment shortly."}
            </p>
            <div className="mt-8">
              <DetailRows
                rows={[
                  ["Service", confirmation.serviceName],
                  [
                    "When",
                    `${formatLocalDate(confirmation.date, "long")}, ${confirmation.start}–${confirmation.end}`,
                  ],
                  ["Status", STATUS_LABELS[confirmation.status]],
                  [
                    "Reference",
                    <span key="ref" className="font-mono">
                      {confirmation.ref}
                    </span>,
                  ],
                ]}
              />
            </div>
            <p className="mt-8 text-muted">
              Save or bookmark this link to view or cancel your booking.
              It&rsquo;s private to you.
            </p>
            <Link
              href={confirmation.manageUrl}
              className="mt-4 inline-flex min-h-12 items-center rounded-full bg-brand px-8 text-sm font-semibold tracking-widest text-on-brand uppercase transition-colors hover:bg-brand-hover"
            >
              Manage my booking
            </Link>
          </section>
        )}
      </div>

      {step !== "done" && (
        <aside className="hidden lg:block">
          <div className="sticky top-24">{summary}</div>
        </aside>
      )}
    </div>
  );
}

function StepHeading({
  id,
  number,
  back,
  children,
}: {
  id: string;
  number: number;
  back?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div>
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          className="-ml-1 mb-4 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {back.label}
        </button>
      )}
      <p className="text-sm text-muted">Step {number} of 3</p>
      <h2
        id={id}
        className="mt-1 font-display text-3xl font-semibold sm:text-4xl"
      >
        {children}
      </h2>
    </div>
  );
}

// Splits a day's times into the parts of the day people think in.
function groupSlots(slots: Slot[]): [string, Slot[]][] {
  const groups: [string, Slot[]][] = [
    ["Morning", []],
    ["Afternoon", []],
    ["Evening", []],
  ];
  for (const slot of slots) {
    const hour = Number(slot.start.slice(0, 2));
    groups[hour < 12 ? 0 : hour < 17 ? 1 : 2][1].push(slot);
  }
  return groups.filter(([, group]) => group.length > 0);
}

// What's been picked so far: a sidebar on desktop, above the step on phones.
function Summary({
  service,
  date,
  slot,
  onChangeService,
  onChangeTime,
}: {
  service: BookableService | null;
  date: string | null;
  slot: Slot | null;
  onChangeService: (() => void) | null;
  onChangeTime: (() => void) | null;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Your appointment</h2>
      <dl className="mt-4 border-t border-line text-sm">
        <SummaryRow label="Service" onChange={onChangeService}>
          {service ? (
            <>
              <span className="block text-ink">{service.name}</span>
              <span className="block text-muted">
                {formatDuration(service.durationMin)} ·{" "}
                {formatPriceFrom(service.priceFromPence)}
              </span>
            </>
          ) : (
            <span className="text-muted">Not chosen yet</span>
          )}
        </SummaryRow>
        <SummaryRow label="When" onChange={onChangeTime}>
          {date && slot ? (
            <span className="text-ink">
              {formatLocalDate(date, "long")}, {slot.start}–{slot.end}
            </span>
          ) : date ? (
            <>
              <span className="block text-ink">
                {formatLocalDate(date, "long")}
              </span>
              <span className="block text-muted">Pick a time</span>
            </>
          ) : (
            <span className="text-muted">Not chosen yet</span>
          )}
        </SummaryRow>
      </dl>
    </div>
  );
}

function SummaryRow({
  label,
  onChange,
  children,
}: {
  label: string;
  onChange: (() => void) | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3">
      <div>
        <dt className="text-xs tracking-widest text-muted uppercase">{label}</dt>
        <dd className="mt-1">{children}</dd>
      </div>
      {onChange && (
        <button
          type="button"
          onClick={onChange}
          className="min-h-11 shrink-0 px-2 text-brand underline-offset-4 hover:underline"
        >
          Change
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-muted">{label}</span>
      {children}
      {error?.[0] && <span className="font-semibold text-brand">{error[0]}</span>}
    </label>
  );
}
