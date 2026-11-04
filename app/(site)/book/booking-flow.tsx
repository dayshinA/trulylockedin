"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { STATUS_LABELS } from "@/lib/booking/labels";
import { quoteService } from "@/lib/booking/quote";
import { addDays } from "@/lib/booking/time";
import { DetailRows } from "@/components/site/detail-rows";
import { Field, inputClass } from "@/components/site/form-field";
import { MemberBar } from "@/components/site/member-bar";
import {
  formatDuration,
  formatLocalDate,
  formatPrice,
  formatPriceFrom,
} from "@/lib/format";
import type { BookingStatus, Slot } from "@/types/booking";
import type { MemberProfile } from "@/types/member";
import { createBooking, getSlots } from "./actions";
import { DayGrid } from "./day-grid";
import {
  HEADER_CLEARANCE_PX,
  ServicePicker,
  totalsOf,
  type BookableCategory,
  type BookableService,
} from "./service-picker";

type Step = "service" | "time" | "details" | "done";

type Confirmation = {
  ref: string;
  serviceName: string;
  optionNames: string[];
  pricePence: number;
  date: string;
  start: string;
  end: string;
  status: BookingStatus;
  manageUrl: string;
};

type FieldErrors = Partial<Record<string, string[]>>;

export function BookingFlow({
  catalogue,
  today,
  maxAdvanceDays,
  initialServiceId,
  initialOptionIds = [],
  member,
}: {
  catalogue: BookableCategory[];
  today: string;
  maxAdvanceDays: number;
  initialServiceId?: string;
  initialOptionIds?: string[];
  member: MemberProfile | null;
}) {
  const [initial] = useState(() =>
    initialSelection(catalogue, initialServiceId, initialOptionIds),
  );
  const { service: initialService, startsOnTime } = initial;
  const [step, setStep] = useState<Step>(startsOnTime ? "time" : "service");
  const [service, setService] = useState<BookableService | null>(
    initialService,
  );
  // Starts collapsed so the list fits on a screen, unless there's only one
  // category or the client arrived with a service in mind.
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>(() =>
    catalogue.length === 1
      ? [catalogue[0].id]
      : catalogue
          .filter((category) =>
            category.services.some((s) => s.id === initialService?.id),
          )
          .map((category) => category.id),
  );
  const [optionIds, setOptionIds] = useState<string[]>(initial.optionIds);
  const [date, setDate] = useState<string | null>(startsOnTime ? today : null);
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
  const flowRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);

  // The steps differ a lot in height, so leaving a long list from far down would
  // otherwise land the client in the footer.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    const top = flowRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < HEADER_CLEARANCE_PX) {
      window.scrollBy({ top: top - HEADER_CLEARANCE_PX, behavior: "instant" });
    }
  }, [step]);

  // Arriving on the time step (see initialSelection): fetch today's times once.
  useEffect(() => {
    if (!initial.startsOnTime || !initial.service) return;
    const request = ++latestRequest.current;
    const { service: first, optionIds: firstOptions } = initial;
    startSlots(async () => {
      const result = await getSlots({
        serviceId: first.id,
        optionIds: firstOptions,
        date: today,
      });
      if (request !== latestRequest.current) return;
      if (result.ok) setSlots(result.slots);
      else setSlotError(result.error);
    });
  }, [initial, today]);

  const lastDay = addDays(today, maxAdvanceDays);

  function loadSlots(
    forService: BookableService,
    forOptions: string[],
    forDate: string,
  ) {
    const request = ++latestRequest.current;
    setSlots(null);
    setSlotError(null);
    startSlots(async () => {
      const result = await getSlots({
        serviceId: forService.id,
        optionIds: forOptions,
        date: forDate,
      });
      if (request !== latestRequest.current) return;
      if (result.ok) setSlots(result.slots);
      else setSlotError(result.error);
    });
  }

  function toggleCategory(categoryId: string) {
    if (!openCategoryIds.includes(categoryId)) {
      setOpenCategoryIds([...openCategoryIds, categoryId]);
      return;
    }
    setOpenCategoryIds(openCategoryIds.filter((id) => id !== categoryId));
    // Don't keep a service chosen where the client can no longer see it.
    const holdsChoice = catalogue
      .find((category) => category.id === categoryId)
      ?.services.some((s) => s.id === service?.id);
    if (holdsChoice) clearService();
  }

  function toggleService(next: BookableService) {
    if (next.id === service?.id) {
      clearService();
      return;
    }
    setService(next);
    setOptionIds([]);
    setSlot(null);
  }

  function clearService() {
    setService(null);
    setOptionIds([]);
    setSlot(null);
  }

  function goToTimes(forService: BookableService, forOptions: string[]) {
    setStep("time");
    const firstDay = date ?? today;
    setDate(firstDay);
    loadSlots(forService, forOptions, firstDay);
  }

  function chooseDate(next: string) {
    if (!service) return;
    setDate(next);
    setSlot(null);
    loadSlots(service, optionIds, next);
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
        optionIds,
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
        loadSlots(service, optionIds, date);
      }
    });
  }

  const summary = step !== "done" && (
    <Summary
      service={service}
      optionIds={optionIds}
      date={step !== "service" ? date : null}
      slot={step === "details" ? slot : null}
      onChangeService={step !== "service" ? () => setStep("service") : null}
      onChangeTime={step === "details" ? () => setStep("time") : null}
    />
  );

  return (
    <div
      ref={flowRef}
      className={`mt-10 grid gap-10 ${step !== "done" ? "lg:grid-cols-[1fr_20rem] lg:gap-16" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-8">
        {/* On phones the summary sits above the step, once there's
            something in it. */}
        {step !== "service" && step !== "done" && (
          <div className="lg:hidden">{summary}</div>
        )}

        {step === "service" && (
          <section aria-labelledby="choose-service">
            <StepHeading id="choose-service" number={1}>
              Choose a service
            </StepHeading>
            {initial.serviceMissing && (
              <p className="mb-6 border-l-2 border-brand pl-4 text-ink">
                That service can&rsquo;t be booked online any more. Choose
                another below or get in touch.
              </p>
            )}
            <ServicePicker
              catalogue={catalogue}
              openCategoryIds={openCategoryIds}
              service={service}
              optionIds={optionIds}
              onToggleCategory={toggleCategory}
              onToggleService={toggleService}
              onOptionsChange={setOptionIds}
              onContinue={() => {
                if (service) goToTimes(service, optionIds);
              }}
            />
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
                                className="min-h-12 rounded-sm border border-field text-ink transition-colors hover:border-brand hover:bg-brand hover:text-on-brand"
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

            <MemberBar member={member} purpose="booking" />

            {/* Keyed so a sign-in (or sign-out) mid-form refills the fields. */}
            <form
              key={member?.email ?? "guest"}
              onSubmit={submit}
              className="flex flex-col gap-5"
              noValidate
            >
              <Field label="Name" error={fieldErrors.name}>
                <input
                  name="name"
                  defaultValue={member?.name}
                  autoComplete="name"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Phone" error={fieldErrors.phone}>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={member?.phone}
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
                  defaultValue={member?.email}
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
                  ...(confirmation.optionNames.length > 0
                    ? ([["Options", confirmation.optionNames.join(", ")]] as [
                        string,
                        string,
                      ][])
                    : []),
                  ["Price from", formatPrice(confirmation.pricePence)],
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
            {member && (
              <p className="mt-6 text-muted">
                It&rsquo;s also saved in{" "}
                <Link
                  href="/account"
                  className="text-brand underline underline-offset-4 hover:text-brand-hover"
                >
                  your account
                </Link>
                .
              </p>
            )}
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


// Where the flow opens for a ?service=…&options=… link. It skips to the time
// step when there's nothing left to choose: the service has no options, or the
// link names a valid choice (e.g. "Book again"). Unknown option ids are dropped.
function initialSelection(
  catalogue: BookableCategory[],
  serviceId: string | undefined,
  requestedOptionIds: string[],
) {
  const service =
    catalogue
      .flatMap((category) => category.services)
      .find((s) => s.id === serviceId) ?? null;
  if (!service) {
    return {
      service: null,
      optionIds: [],
      startsOnTime: false,
      serviceMissing: serviceId !== undefined,
    };
  }

  const known = new Set(service.options.map((o) => o.id));
  const optionIds = requestedOptionIds.filter((id) => known.has(id));
  const valid = quoteService(service, optionIds).ok;
  return {
    service,
    optionIds: valid ? optionIds : [],
    startsOnTime:
      valid && (service.options.length === 0 || optionIds.length > 0),
    serviceMissing: false,
  };
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
  optionIds,
  date,
  slot,
  onChangeService,
  onChangeTime,
}: {
  service: BookableService | null;
  optionIds: string[];
  date: string | null;
  slot: Slot | null;
  onChangeService: (() => void) | null;
  onChangeTime: (() => void) | null;
}) {
  const totals = service && totalsOf(service, optionIds);
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Your appointment</h2>
      <dl className="mt-4 border-t border-line text-sm">
        <SummaryRow label="Service" onChange={onChangeService}>
          {service && totals ? (
            <>
              <span className="block text-ink">{service.name}</span>
              {totals.options.length > 0 && (
                <span className="block text-ink">
                  {totals.options.map((o) => o.name).join(", ")}
                </span>
              )}
              <span className="block text-muted">
                {formatDuration(totals.durationMin)} ·{" "}
                {formatPriceFrom(totals.pricePence)}
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
          className="min-h-11 shrink-0 px-2 text-brand decoration-accent decoration-2 underline-offset-4 hover:underline"
        >
          Change
        </button>
      )}
    </div>
  );
}
