"use client";

import { ArrowRight, ArrowUpRight, CalendarPlus, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { contactChannels } from "@/components/site/contact-links";
import { CopyButton } from "@/components/site/copy-button";
import { STATUS_LABELS } from "@/lib/booking/labels";
import type { BookingSummary } from "@/lib/booking/manage";
import { addDays, localToUtcMs } from "@/lib/booking/time";
import { formatDuration, formatPrice } from "@/lib/format";
import { LOCALE, SITE_NAME, TIMEZONE } from "@/lib/site";
import type { SiteContent } from "@/types/cms";
import { confirmDepositReturn, getMyBooking } from "../../actions";
import { depositRows } from "../../booking-details";
import {
  readBookingAccess,
  settleBookingAccess,
} from "@/lib/checkout-access";

type Contact = SiteContent["contact"];

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; booking: BookingSummary };

// #t={token}&photos={n}: the token never reaches the server's logs. Back
// from a deposit payment there's no fragment (Stripe must not see the token):
// it waits in sessionStorage instead, and ?session_id names the payment.
function readAccess(bookingRef: string) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const stored = readBookingAccess(bookingRef);
  return {
    token: params.get("t") ?? stored?.token ?? "",
    photos: Number(params.get("photos")) || stored?.photos || 0,
    sessionId: new URLSearchParams(window.location.search).get("session_id"),
  };
}

const PAID_NO_LINK =
  "Thank you, your deposit has been paid. We've emailed your confirmation. To see your booking on this device, use Find my booking with your reference and email.";

export function ThankYou({
  bookingRef,
  contact,
  bookingNotes,
  isMember,
}: {
  bookingRef: string;
  contact: Contact;
  bookingNotes: string[];
  isMember: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [fragment, setFragment] = useState({ token: "", photos: 0 });

  useEffect(() => {
    // Arriving from the form, the page would otherwise open where the form was.
    window.scrollTo({ top: 0, behavior: "instant" });
    const current = readAccess(bookingRef);
    let active = true;
    (async () => {
      // Confirms the booking if Stripe's webhook hasn't yet.
      if (current.sessionId) await confirmDepositReturn(current.sessionId);
      const result = await getMyBooking({
        ref: bookingRef,
        token: current.token,
      });
      if (!active) return;
      if (result.ok && result.booking.status !== "awaiting_deposit") {
        settleBookingAccess(bookingRef);
      }
      setFragment(current);
      setState(
        result.ok
          ? { kind: "ready", booking: result.booking }
          : {
              kind: "error",
              message:
                current.sessionId && !current.token
                  ? PAID_NO_LINK
                  : result.error,
            },
      );
    })();
    return () => {
      active = false;
    };
  }, [bookingRef]);

  if (state.kind === "error") {
    return (
      <>
        <section className="px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
          <div className="mx-auto max-w-2xl">
            <h1 className="mb-8 font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
              Your booking
            </h1>
            <p className="text-lg">{state.message}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/book/find" className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-8 font-semibold text-on-brand transition-colors hover:bg-brand-hover">
                Find it with your reference
              </Link>
              <TextLink href="/book">Make a new booking</TextLink>
            </div>
          </div>
        </section>
      </>
    );
  }

  const booking = state.kind === "ready" ? state.booking : null;
  const manageUrl = `/book/${encodeURIComponent(bookingRef)}#t=${fragment.token}`;

  return (
    <>
      <ThankYouHero booking={booking} />

      <section className="relative z-10 -mt-16 px-4 sm:-mt-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {booking ? (
            <Ticket
              booking={booking}
              photos={fragment.photos}
              location={locationOf(contact)}
            />
          ) : (
            <TicketSkeleton />
          )}
        </div>
      </section>

      {booking && (
        <>
          <section className="px-4 pt-10 sm:px-6">
            <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={manageUrl}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-8 text-sm font-semibold tracking-widest text-on-brand uppercase transition-colors hover:bg-brand-hover"
              >
                Manage my booking
              </Link>
              <p className="text-sm text-muted sm:max-w-sm">
                Bookmark that link to view or cancel later
                {isMember ? (
                  <>
                    . It&rsquo;s also saved in{" "}
                    <TextLink href="/account" inline>
                      your account
                    </TextLink>
                    .
                  </>
                ) : (
                  <>
                    , or use{" "}
                    <TextLink href="/book/find" inline>
                      Find my booking
                    </TextLink>{" "}
                    with your reference and email.
                  </>
                )}
              </p>
            </div>
          </section>

          <NextSteps
            booking={booking}
            contact={contact}
            bookingNotes={bookingNotes}
          />

          <Questions contact={contact} />

          <section className="px-4 pb-24 sm:px-6">
            <div className="mx-auto flex max-w-4xl flex-col items-start gap-2 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-display text-2xl font-semibold">
                While you wait
              </p>
              <div className="flex flex-wrap gap-x-8">
                <ArrowLink href="/work">Browse recent looks</ArrowLink>
                <ArrowLink href="/shop">Shop aftercare</ArrowLink>
                <ArrowLink href="/">Back to home</ArrowLink>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

// The burgundy band under the header. Renders before the booking has loaded
// (and as the Suspense fallback), so the headline never jumps.
export function ThankYouHero({ booking }: { booking?: BookingSummary | null }) {
  const firstName = booking?.clientName.trim().split(/\s+/)[0];
  const cancelled = booking?.status === "cancelled";
  const paying = booking?.status === "awaiting_deposit";

  return (
    <section className="surface-burgundy relative overflow-hidden px-4 pt-32 pb-36 sm:px-6 sm:pt-40 sm:pb-44">
      <Rings />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <CheckMark />
        <p className="mt-8 flex items-center gap-3 text-xs font-semibold tracking-[0.3em] text-accent-ink uppercase">
          <span aria-hidden className="h-0.5 w-8 bg-accent" />
          {booking
            ? cancelled
              ? "Booking cancelled"
              : paying
                ? "Checking your payment"
                : "You're booked in"
            : "Booking received"}
          <span aria-hidden className="h-0.5 w-8 bg-accent" />
        </p>
        <h1 className="mt-5 font-display text-6xl leading-[0.95] font-semibold sm:text-8xl">
          Thank you
          <span className="text-accent-ink">.</span>
        </h1>
        <p
          aria-live="polite"
          className={`mt-6 min-h-[3.5rem] max-w-lg text-lg text-muted transition-opacity duration-500 ${booking ? "opacity-100" : "opacity-0"}`}
        >
          {booking &&
            (cancelled
              ? booking.deposit?.status === "refunded" ||
                booking.deposit?.status === "refund_failed"
                ? "Your payment arrived after this time was released, so we couldn't keep it. Your deposit is being refunded."
                : "This booking has since been cancelled. We hope to see you another time."
              : paying
                ? `${firstName}, we're waiting for Stripe to confirm your deposit. Refresh this page in a minute; we'll also email you once it's through.`
                : `${firstName}, your appointment is confirmed. We can't wait to see you.`)}
        </p>
      </div>
    </section>
  );
}

function Ticket({
  booking,
  photos,
  location,
}: {
  booking: BookingSummary;
  photos: number;
  location: string;
}) {
  const day = dayParts(booking.date);
  const minutes = minutesBetween(booking.start, booking.end);
  const event = calendarEvent(booking, location);
  const cancelled = booking.status === "cancelled";

  return (
    <article
      aria-label="Your appointment"
      className="rise-in overflow-hidden rounded-sm border border-line bg-page shadow-2xl shadow-brand/15"
    >
      <div className="grid sm:grid-cols-[13rem_1fr]">
        {/* The date, set like the stub of a ticket. */}
        <div className="flex items-center gap-5 border-b border-dashed border-field px-6 py-6 sm:flex-col sm:items-start sm:justify-center sm:gap-3 sm:border-r sm:border-b-0 sm:px-8 sm:py-10">
          <p className="font-display text-7xl leading-none font-semibold lining-nums sm:text-8xl">
            {day.day}
          </p>
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-accent-ink uppercase">
              {day.weekday}
            </p>
            <p className="mt-1 text-muted">
              {day.month} {day.year}
            </p>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-10 sm:py-10">
          <p className="text-xs tracking-widest text-muted uppercase">
            Your appointment
          </p>
          <h2 className="mt-2 font-display text-3xl leading-tight font-semibold sm:text-4xl">
            {booking.serviceName}
          </h2>
          {booking.optionNames.length > 0 && (
            <p className="mt-1 text-ink">{booking.optionNames.join(", ")}</p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-3">
            <TicketItem label="Time">
              {booking.start}–{booking.end}
            </TicketItem>
            <TicketItem label="Length">{formatDuration(minutes)}</TicketItem>
            <TicketItem label="Price from">
              <span className="text-accent-ink">
                {formatPrice(booking.pricePence)}
              </span>
              {booking.premium && (
                <span className="block text-xs text-muted">Premium time</span>
              )}
            </TicketItem>
            {depositRows(booking).map(([label, value]) => (
              <TicketItem key={label} label={label}>
                {value}
              </TicketItem>
            ))}
            <TicketItem label="Status">
              <span className="inline-flex items-start gap-2">
                <span
                  aria-hidden
                  className={`mt-[0.55em] size-2 shrink-0 rounded-full ${booking.status === "confirmed" ? "bg-brand" : cancelled ? "bg-faint" : "bg-accent"}`}
                />
                {STATUS_LABELS[booking.status]}
              </span>
            </TicketItem>
            {photos > 0 && (
              <TicketItem label="Reference">
                {photos === 1 ? "1 photo sent" : `${photos} photos sent`}
              </TicketItem>
            )}
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-5 border-t border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <p className="text-xs tracking-widest text-muted uppercase">
            Booking reference
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-2xl font-semibold tracking-wider">
              {booking.ref}
            </span>
            <CopyButton text={booking.ref} />
          </p>
        </div>
        {event && !cancelled && <AddToCalendar event={event} />}
      </div>
    </article>
  );
}

function TicketItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs tracking-widest text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-semibold">{children}</dd>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div
      aria-hidden
      className="grid h-72 animate-pulse rounded-sm border border-line bg-page shadow-2xl shadow-brand/15 sm:grid-cols-[13rem_1fr]"
    >
      <div className="border-b border-dashed border-field sm:border-r sm:border-b-0" />
      <div className="flex flex-col gap-4 p-10">
        <div className="h-3 w-32 rounded-full bg-surface" />
        <div className="h-8 w-2/3 rounded-full bg-surface" />
        <div className="mt-6 h-3 w-1/2 rounded-full bg-surface" />
      </div>
    </div>
  );
}

type CalendarEvent = {
  title: string;
  details: string;
  location: string;
  startUtc: number;
  endUtc: number;
  uid: string;
};

function AddToCalendar({ event }: { event: CalendarEvent }) {
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", event.title);
  google.searchParams.set(
    "dates",
    `${icsTime(event.startUtc)}/${icsTime(event.endUtc)}`,
  );
  google.searchParams.set("details", event.details);
  if (event.location) google.searchParams.set("location", event.location);

  function downloadIcs() {
    const blob = new Blob([icsFile(event)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.uid.split("@")[0]}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const pill =
    "inline-flex min-h-11 items-center gap-2 rounded-full border border-field px-5 text-sm font-semibold text-ink transition-colors hover:border-brand";

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-xs tracking-widest text-muted uppercase">
        <CalendarPlus aria-hidden className="size-4" />
        Add to calendar
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={google.toString()}
          target="_blank"
          rel="noopener noreferrer"
          className={pill}
        >
          Google
        </a>
        <button type="button" onClick={downloadIcs} className={pill}>
          Apple / Outlook
        </button>
      </div>
    </div>
  );
}

function NextSteps({
  booking,
  contact,
  bookingNotes,
}: {
  booking: BookingSummary;
  contact: Contact;
  bookingNotes: string[];
}) {
  if (booking.status === "cancelled") return null;
  const paying = booking.status === "awaiting_deposit";

  const steps: { title: string; body: React.ReactNode }[] = [
    paying
      ? {
          title: "We're confirming your payment",
          body: (
            <>
              Your time is held while Stripe confirms your deposit. Check it
              any time with your reference on{" "}
              <TextLink href="/book/find" inline>
                Find my booking
              </TextLink>
              .
            </>
          ),
        }
      : {
          title: "Your time is held",
          body: "Your appointment is confirmed and the chair is yours. Pop it in your calendar so it doesn't sneak up on you.",
        },
    {
      title: "Before your visit",
      body:
        bookingNotes.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {bookingNotes.map((note) => (
              <li key={note} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-2.5 h-px w-3 shrink-0 bg-accent"
                />
                {note}
              </li>
            ))}
          </ul>
        ) : (
          "If your plans change, let us know or cancel online with your private link, so someone else can have the slot."
        ),
    },
    {
      title: "On the day",
      body: <Where contact={contact} />,
    },
  ];

  return (
    <section className="px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-4xl font-semibold sm:text-5xl">
          What happens next
        </h2>
        <Reveal stagger className="mt-10 grid gap-10 border-t border-line pt-10 md:grid-cols-3 md:gap-12">
          {steps.map((step, index) => (
            <div key={step.title}>
              <p className="font-display text-5xl leading-none font-semibold text-accent">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-4 font-display text-2xl font-semibold">
                {step.title}
              </h3>
              <div className="mt-3 text-muted">{step.body}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function Where({ contact }: { contact: Contact }) {
  if (contact.addressLines.length === 0) {
    return (
      <p>
        Arrive a few minutes early so we can start on time.
        {contact.area && <> We&rsquo;re in {contact.area}.</>} Get in touch if
        you need directions.
      </p>
    );
  }
  return (
    <div>
      <p>Arrive a few minutes early so we can start on time. Find us at:</p>
      <address className="mt-3 flex gap-2 text-ink not-italic">
        <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-accent-ink" />
        <span>
          {contact.addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </address>
      {contact.mapUrl && (
        <a
          href={contact.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-11 items-center gap-1 text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
        >
          Open in maps
          <ArrowUpRight aria-hidden className="size-4" />
        </a>
      )}
    </div>
  );
}

function Questions({ contact }: { contact: Contact }) {
  const channels = contactChannels(contact).filter(
    ({ label }) => label !== "TikTok",
  );
  if (channels.length === 0) return null;
  return (
    <section className="surface-burgundy px-4 py-16 sm:px-6 sm:py-20">
      <Reveal className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <div>
          <span aria-hidden className="mb-5 block h-0.5 w-12 bg-accent" />
          <h2 className="font-display text-4xl font-semibold">
            Any questions?
          </h2>
          <p className="mt-3 text-muted">
            Need to change something or want to check what to bring? Just get
            in touch, quoting your reference.
          </p>
        </div>
        <ul className="border-t border-line">
          {channels.map(({ label, value, href }) => {
            const external = href.startsWith("http");
            return (
              <li key={label} className="border-b border-line">
                <a
                  href={href}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="group flex min-h-11 items-baseline gap-4 py-4"
                >
                  <span className="w-24 shrink-0 text-sm text-muted">
                    {label}
                  </span>
                  <span className="min-w-0 flex-1 font-display text-xl font-semibold [overflow-wrap:anywhere] transition-colors group-hover:text-brand-hover sm:text-2xl">
                    {value}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-5 shrink-0 self-center text-accent-ink"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}

// A copper ring with a check that draws itself (motion permitting).
function CheckMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      className="size-20 text-accent sm:size-24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="32"
        cy="32"
        r="30"
        strokeWidth="2"
        pathLength={1}
        className="draw-stroke"
      />
      <path
        d="M20 33.5 28.5 42 45 24"
        strokeWidth="3"
        pathLength={1}
        className="draw-stroke [animation-delay:450ms]"
      />
    </svg>
  );
}

// Faint concentric rings behind the check: the disc from the home hero.
function Rings() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-[7.5rem] left-1/2 -translate-x-1/2 sm:top-[9rem]"
    >
      {[18, 30, 44, 60].map((size, index) => (
        <span
          key={size}
          className="ring-out absolute top-1/2 left-1/2 rounded-full border border-line"
          style={{
            width: `${size}rem`,
            height: `${size}rem`,
            marginLeft: `-${size / 2}rem`,
            marginTop: `-${size / 2}rem`,
            animationDelay: `${index * 120}ms`,
            opacity: 1 - index * 0.2,
          }}
        />
      ))}
    </div>
  );
}

function TextLink({
  href,
  inline = false,
  children,
}: {
  href: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`text-brand underline decoration-accent decoration-2 underline-offset-4 hover:text-brand-hover ${inline ? "" : "inline-flex min-h-11 items-center"}`}
    >
      {children}
    </Link>
  );
}

function ArrowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-2 font-semibold text-brand transition-colors hover:text-brand-hover"
    >
      {children}
      <ArrowRight
        aria-hidden
        className="size-4 text-accent transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}

function locationOf(contact: Contact): string {
  return contact.addressLines.length > 0
    ? contact.addressLines.join(", ")
    : contact.area;
}

// Calendar date parts, built at UTC noon like formatLocalDate.
function dayParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const at = new Date(Date.UTC(year, month - 1, day, 12));
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: "UTC" }).format(
      at,
    );
  return {
    day: String(day),
    weekday: part({ weekday: "long" }),
    month: part({ month: "long" }),
    year: String(year),
  };
}

function minutesBetween(start: string, end: string): number {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  // An end earlier than the start is after midnight.
  return (toMinutes(end) - toMinutes(start) + 24 * 60) % (24 * 60);
}

function calendarEvent(
  booking: BookingSummary,
  location: string,
): CalendarEvent | null {
  const startUtc = localToUtcMs(booking.date, booking.start, TIMEZONE);
  // An end earlier than the start is the next morning.
  const endDate =
    booking.end <= booking.start ? addDays(booking.date, 1) : booking.date;
  const endUtc = localToUtcMs(endDate, booking.end, TIMEZONE);
  if (startUtc === null || endUtc === null) return null;
  const service = [booking.serviceName, ...booking.optionNames].join(", ");
  return {
    title: `${SITE_NAME}: ${booking.serviceName}`,
    details: [
      service,
      `Booking reference: ${booking.ref}`,
    ]
      .filter(Boolean)
      .join("\n"),
    location,
    startUtc,
    endUtc,
    uid: `${booking.ref}@trulylockedin`,
  };
}

// 20261104T091500Z
function icsTime(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/[,;]/g, (c) => `\\${c}`)
    .replace(/\n/g, "\\n");
}

function icsFile(event: CalendarEvent): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE_NAME}//Booking//EN`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${icsTime(Date.now())}`,
    `DTSTART:${icsTime(event.startUtc)}`,
    `DTEND:${icsTime(event.endUtc)}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(event.details)}`,
    ...(event.location ? [`LOCATION:${icsText(event.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
