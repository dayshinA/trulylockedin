"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  CASH_NOTE,
  depositFor,
  owesOnTheDay,
} from "@/lib/booking/deposit-rules";
import { hasPremiumPrice, quoteService } from "@/lib/booking/quote";
import { addDays } from "@/lib/booking/time";
import { Field, FormAlert, inputClass } from "@/components/site/form-field";
import { useErrorFocus } from "@/lib/use-error-focus";
import { MemberBar } from "@/components/site/member-bar";
import { TermsConsent } from "@/components/site/terms-consent";
import { PremiumNotice } from "./premium-notice";
import {
  formatDuration,
  formatLocalDate,
  formatPrice,
  formatPriceFrom,
  PRICED_ON_THE_DAY,
} from "@/lib/format";
import type { Slot } from "@/types/booking";
import type { MemberProfile } from "@/types/member";
import {
  abandonDeposit,
  createBooking,
  getOpenDays,
  getSlots,
} from "./actions";
import {
  saveBookingAccess,
  settleBookingAccess,
  unsettledBookings,
} from "@/lib/checkout-access";
import { DayGrid } from "./day-grid";
import {
  photosBusy,
  ReferencePhotosField,
  uploadedPhotoIds,
  type ReferencePhoto,
} from "./reference-photos-field";
import {
  HEADER_CLEARANCE_PX,
  ServicePicker,
  totalsOf,
  type BookableCategory,
  type BookableService,
} from "./service-picker";

type Step = "service" | "time" | "details";

type FieldErrors = Partial<Record<string, string[]>>;

export function BookingFlow({
  catalogue,
  today,
  firstDay,
  maxAdvanceDays,
  depositPence,
  premiumFrom,
  initialServiceId,
  initialOptionIds = [],
  member,
}: {
  catalogue: BookableCategory[];
  today: string;
  // The first day that can have times (today + minimum notice).
  firstDay: string;
  maxAdvanceDays: number;
  depositPence: number;
  premiumFrom: string | null;
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
  const [date, setDate] = useState<string | null>(
    startsOnTime ? firstDay : null,
  );
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  // Days in the window with a free time for the chosen service and options;
  // null while loading (or if it failed: then every day can be tapped).
  const [openDays, setOpenDays] = useState<string[] | null>(null);
  const latestDaysRequest = useRef(0);
  // Set when the client taps a day, so a late answer doesn't move them.
  const pickedDay = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [photos, setPhotos] = useState<ReferencePhoto[]>([]);
  const uploading = photosBusy(photos);
  const [loadingSlots, startSlots] = useTransition();
  const [submitting, startSubmit] = useTransition();
  // Stays true while the browser leaves for Stripe's payment page.
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const deposit = service
    ? depositFor(
        depositPence,
        service,
        totalsOf(service, optionIds, !!slot?.premium).pricePence,
      )
    : 0;
  // Ignore slot responses for a day the client has already moved away from.
  const latestRequest = useRef(0);
  const flowRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);
  const detailsRef = useRef<HTMLFormElement>(null);
  useErrorFocus(detailsRef, fieldErrors);

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

  // Back from Stripe's payment page with the browser's Back button: release
  // the time this tab was holding, or it would block the client's own retry.
  useEffect(() => {
    function releaseHolds() {
      for (const held of unsettledBookings("TLI-")) {
        settleBookingAccess(held.ref);
        void abandonDeposit(held);
      }
    }
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      setRedirecting(false);
      releaseHolds();
    }
    releaseHolds();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const lastDay = addDays(today, maxAdvanceDays);

  function loadSlots(
    forService: BookableService,
    forOptions: string[],
    forDate: string,
  ) {
    setSlots(null);
    setSlotError(null);
    fetchSlots(forService, forOptions, forDate);
  }

  function fetchSlots(
    forService: BookableService,
    forOptions: string[],
    forDate: string,
  ) {
    const request = ++latestRequest.current;
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

  // Greys out days without free times, and moves the client off a shown day
  // that has none (unless they've tapped a day since).
  function loadOpenDays(
    forService: BookableService,
    forOptions: string[],
    shownDay: string,
  ) {
    setOpenDays(null);
    fetchOpenDays(forService, forOptions, shownDay);
  }

  function fetchOpenDays(
    forService: BookableService,
    forOptions: string[],
    shownDay: string,
  ) {
    const request = ++latestDaysRequest.current;
    pickedDay.current = false;
    void getOpenDays({ serviceId: forService.id, optionIds: forOptions }).then(
      (result) => {
        if (request !== latestDaysRequest.current || !result.ok) return;
        setOpenDays(result.openDays);
        const firstOpen = result.openDays[0];
        if (!pickedDay.current && firstOpen && !result.openDays.includes(shownDay)) {
          setDate(firstOpen);
          loadSlots(forService, forOptions, firstOpen);
        }
      },
      () => {},
    );
  }

  // Arriving on the time step (see initialSelection): fetch the first day's
  // times and the open days once.
  const arrive = useEffectEvent(() => {
    if (!initial.startsOnTime || !initial.service) return;
    fetchSlots(initial.service, initial.optionIds, firstDay);
    fetchOpenDays(initial.service, initial.optionIds, firstDay);
  });
  useEffect(() => arrive(), []);

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
    const day = date ?? firstDay;
    setDate(day);
    loadSlots(forService, forOptions, day);
    loadOpenDays(forService, forOptions, day);
  }

  function chooseDate(next: string) {
    if (!service) return;
    pickedDay.current = true;
    setDate(next);
    setSlot(null);
    loadSlots(service, optionIds, next);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !date || !slot || uploading) return;
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
        referencePhotos: uploadedPhotoIds(photos),
        acceptTerms: form.get("acceptTerms") === "on",
        website: form.get("website"),
      });

      if (result.ok) {
        const { booking, cancelToken, checkoutUrl } = result;
        if (checkoutUrl) {
          saveBookingAccess(booking.ref, {
            token: cancelToken,
            photos: booking.referencePhotoCount,
          });
          setRedirecting(true);
          window.location.assign(checkoutUrl);
          return;
        }
        const fragment = new URLSearchParams({ t: cancelToken });
        if (booking.referencePhotoCount > 0) {
          fragment.set("photos", String(booking.referencePhotoCount));
        }
        router.push(
          `/book/${encodeURIComponent(booking.ref)}/thank-you#${fragment}`,
        );
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

  const summary = (
    <Summary
      service={service}
      optionIds={optionIds}
      date={step !== "service" ? date : null}
      slot={step === "details" ? slot : null}
      deposit={deposit}
      onChangeService={step !== "service" ? () => setStep("service") : null}
      onChangeTime={step === "details" ? () => setStep("time") : null}
    />
  );

  return (
    <div
      ref={flowRef}
      className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-16"
    >
      <div className="flex min-w-0 flex-col gap-8">
        {/* On phones the summary sits above the step, once there's
            something in it. */}
        {step !== "service" && (
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
              depositPence={depositPence}
              premiumFrom={premiumFrom}
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
                first={firstDay}
                last={lastDay}
                selected={date}
                openDays={openDays}
                onSelect={chooseDate}
              />
              <div className="flex flex-col gap-6">
                {formError && <FormAlert>{formError}</FormAlert>}

                <div aria-live="polite">
                  {openDays?.length === 0 ? (
                    <p className="text-muted">
                      There are no free times for this in the next{" "}
                      {Math.round(maxAdvanceDays / 7)} weeks. Please{" "}
                      <Link
                        href="/contact"
                        className="font-semibold text-brand underline decoration-accent underline-offset-4"
                      >
                        get in touch
                      </Link>{" "}
                      and we&rsquo;ll try to fit you in.
                    </p>
                  ) : loadingSlots || (!slots && !slotError) ? (
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
                      {premiumFrom &&
                        hasPremiumPrice(service) &&
                        slots?.some((s) => s.premium) && (
                          <PremiumNotice
                            variant="explain"
                            premiumFrom={premiumFrom}
                            usualPence={totalsOf(service, optionIds).pricePence}
                            premiumPence={
                              totalsOf(service, optionIds, true).pricePence
                            }
                          />
                        )}
                      {groupSlots(slots ?? [], date).map(([label, group]) => (
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
                                className={`group flex min-h-12 flex-col items-center justify-center rounded-sm border border-field py-1 text-ink transition-colors hover:border-brand hover:bg-brand hover:text-on-brand ${
                                  s.premium &&
                                  hasPremiumPrice(service)
                                    ? "surface-warm"
                                    : ""
                                }`}
                              >
                                {s.start}
                                {s.premium &&
                                  hasPremiumPrice(service) && (
                                    <>
                                      <span className="text-[0.625rem] leading-tight font-semibold tracking-wide text-accent-ink uppercase group-hover:text-on-brand">
                                        Premium
                                      </span>
                                      <span className="text-xs leading-tight font-semibold group-hover:text-on-brand">
                                        {formatPrice(
                                          totalsOf(service, optionIds, true)
                                            .pricePence,
                                        )}
                                      </span>
                                    </>
                                  )}
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

            {premiumFrom && totalsOf(service, optionIds, !!slot.premium).premium && (
              <PremiumNotice
                variant="selected"
                premiumFrom={premiumFrom}
                usualPence={totalsOf(service, optionIds).pricePence}
                premiumPence={totalsOf(service, optionIds, true).pricePence}
              />
            )}

            <MemberBar member={member} purpose="booking" />

            {/* Keyed so a sign-in (or sign-out) mid-form refills the fields. */}
            <form
              key={member?.email ?? "guest"}
              ref={detailsRef}
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
              <Field
                label="Email"
                hint="With your booking reference, this lets you check your booking later."
                error={fieldErrors.email}
              >
                <input
                  name="email"
                  type="email"
                  defaultValue={member?.email}
                  autoComplete="email"
                  inputMode="email"
                  required
                  className={inputClass}
                />
              </Field>
              <Field
                label="Phone (optional)"
                hint="Preferably a number on WhatsApp, so we have another way to reach you."
                error={fieldErrors.phone}
              >
                <input
                  name="phone"
                  type="tel"
                  defaultValue={member?.phone}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="07700 900123"
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

              <ReferencePhotosField
                photos={photos}
                setPhotos={setPhotos}
                error={fieldErrors.referencePhotos}
              />

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

              <TermsConsent error={fieldErrors.acceptTerms}>
                {deposit > 0 && ", including the non-refundable deposit,"}
              </TermsConsent>

              {formError && <FormAlert>{formError}</FormAlert>}

              {deposit > 0 && (
                <p className="max-w-prose text-sm text-muted">
                  Next you&rsquo;ll pay a{" "}
                  <span className="font-semibold text-ink">
                    {formatPrice(deposit)} deposit
                  </span>{" "}
                  on our secure payment page (card, Apple Pay or Google Pay).
                  Paying it confirms your booking, and it comes off the price
                  {service?.priceOnTheDay
                    ? " we set at your appointment."
                    : " on the day."} It&rsquo;s non-refundable if you cancel or
                  don&rsquo;t come, but we&rsquo;ll refund it if we have to
                  cancel.
                </p>
              )}

              {service &&
                owesOnTheDay(
                  {
                    priceOnTheDay: service.priceOnTheDay,
                    pricePence: totalsOf(service, optionIds, !!slot?.premium)
                      .pricePence,
                  },
                  deposit,
                ) && (
                  <p className="max-w-prose text-sm font-semibold text-ink">
                    {CASH_NOTE}
                  </p>
                )}

              <button
                type="submit"
                disabled={submitting || uploading || redirecting}
                className="min-h-12 rounded-full bg-brand px-10 font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-muted sm:w-fit"
              >
                {redirecting
                  ? "Opening payment…"
                  : submitting
                    ? "Booking…"
                    : uploading
                      ? "Uploading photos…"
                      : deposit > 0
                        ? `Pay ${formatPrice(deposit)} deposit`
                        : "Confirm booking"}
              </button>
            </form>
          </section>
        )}

      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24">{summary}</div>
      </aside>
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

// Splits a day's times into the parts of the day people think in. On a day
// that closes after midnight, the late starts fall on the next date.
function groupSlots(slots: Slot[], date: string | null): [string, Slot[]][] {
  const nextDay = slots.find((slot) => slot.date !== date)?.date;
  const groups: [string, Slot[]][] = [
    ["Morning", []],
    ["Afternoon", []],
    ["Evening", []],
    [
      nextDay
        ? `After midnight (${formatLocalDate(nextDay, "chip")})`
        : "After midnight",
      [],
    ],
  ];
  for (const slot of slots) {
    const hour = Number(slot.start.slice(0, 2));
    groups[
      slot.date !== date ? 3 : hour < 12 ? 0 : hour < 17 ? 1 : 2
    ][1].push(slot);
  }
  return groups.filter(([, group]) => group.length > 0);
}

// What's been picked so far: a sidebar on desktop, above the step on phones.
function Summary({
  service,
  optionIds,
  date,
  slot,
  deposit,
  onChangeService,
  onChangeTime,
}: {
  service: BookableService | null;
  optionIds: string[];
  date: string | null;
  slot: Slot | null;
  deposit: number;
  onChangeService: (() => void) | null;
  onChangeTime: (() => void) | null;
}) {
  const totals = service && totalsOf(service, optionIds, !!slot?.premium);
  const usual = service && totalsOf(service, optionIds);
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
                {formatDuration(totals.durationMin)}
              </span>
            </>
          ) : (
            <span className="text-muted">Not chosen yet</span>
          )}
        </SummaryRow>
        {service && totals && (
          <SummaryRow label="Price" onChange={null}>
            <span className="block text-ink">
              <span className="font-semibold">
                {service.priceOnTheDay
                  ? PRICED_ON_THE_DAY
                  : formatPriceFrom(totals.pricePence)}
              </span>
              {totals.premium && usual && (
                <>
                  {" "}
                  <span className="text-muted line-through">
                    {formatPrice(usual.pricePence)}
                  </span>
                </>
              )}
            </span>
            {totals.premium && (
              <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-on-accent uppercase">
                Premium time price
              </span>
            )}
            {deposit > 0 && (
              <span className="block text-muted">
                {formatPrice(deposit)} deposit to book
                {service.priceOnTheDay && ", taken off the final price"}
              </span>
            )}
          </SummaryRow>
        )}
        <SummaryRow label="When" onChange={onChangeTime}>
          {date && slot ? (
            <span className="text-ink">
              {formatLocalDate(slot.date, "long")}, {slot.start}–{slot.end}
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
          className="min-h-11 shrink-0 px-2 text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
        >
          Change
        </button>
      )}
    </div>
  );
}
