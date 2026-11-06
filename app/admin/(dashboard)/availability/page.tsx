import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { todayLocal } from "@/lib/booking/time";
import { formatDuration, formatLocalDate } from "@/lib/format";
import type { BookingSettings, DateOverride } from "@/types/booking";
import {
  Badge,
  outlineButton,
  PageHeader,
  Section,
} from "../_components/admin-ui";
import { PageGuide, Tip } from "../_components/help";
import { deleteOverrideAction } from "./actions";
import {
  BookingRulesForm,
  OverrideForm,
  WeeklyHoursForm,
} from "./availability-forms";

export const metadata: Metadata = {
  title: "Availability",
};

export default async function AvailabilityPage() {
  await verifyAdmin();
  const repo = bookingRepository();
  const settings = await repo.getSettings();
  const today = todayLocal(new Date(), settings.timezone);
  const [weekly, overrides] = await Promise.all([
    repo.getWeekly(),
    repo.listOverrides(today),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-14">
      <PageHeader title="Availability">
        This page decides which days and times clients can pick when they book
        online.
      </PageHeader>

      <HowItWorks settings={settings} />

      <Section
        title="Opening hours"
        description="Opening and closing time for each day, the gap between start times, and how many chairs are free."
      >
        <WeeklyHoursForm weekly={weekly} settings={settings} />
      </Section>

      <Section
        title="Special dates"
        description="Holidays, days off, shorter days, or one-off extra times."
      >
        <Tip>
          Going on holiday or taking a day off? Add each date here as
          &ldquo;Closed all day&rdquo;, and clients won&rsquo;t be able to book
          it. If someone already booked that day, their booking stays: contact
          them and cancel it from Bookings. Dates disappear from this list once
          they&rsquo;ve passed.
        </Tip>
        {overrides.length > 0 ? (
          <ul className="border-t border-line">
            {overrides.map((override) => (
              <li
                key={override.date}
                className="flex items-center gap-4 border-b border-line py-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-semibold">
                    {formatLocalDate(override.date, "long")}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    {override.closed && <Badge tone="alert">Closed</Badge>}
                    {!override.closed && describeOverride(override)}
                  </span>
                </span>
                <form action={deleteOverrideAction}>
                  <input type="hidden" name="date" value={override.date} />
                  <button type="submit" className={outlineButton}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No special dates coming up.</p>
        )}
        <details className="group border-b border-line">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 font-semibold text-brand transition-colors hover:text-brand-hover">
            Add a special date
            <span aria-hidden className="group-open:rotate-90">
              ›
            </span>
          </summary>
          <div className="pt-2 pb-8">
            <OverrideForm today={today} />
          </div>
        </details>
      </Section>

      <Section
        title="Booking rules"
        description="Defaults for every day, plus the rules every online booking follows."
      >
        <Tip tone="warning">
          These rules apply to every online booking from the moment you save.
          Bookings already made stay exactly as they are.
        </Tip>
        <BookingRulesForm settings={settings} />
      </Section>
    </div>
  );
}

function describeOverride(override: DateOverride): string {
  if (override.closed) return "Closed";
  const parts: string[] = [];
  if (override.windows) {
    parts.push(
      `Open ${override.windows.map((w) => `${w.start}–${w.end}`).join(", ")}`,
    );
  }
  if (override.stepMin) parts.push(`every ${formatDuration(override.stepMin)}`);
  if (override.chairs) {
    parts.push(`${override.chairs} chair${override.chairs === 1 ? "" : "s"}`);
  }
  if (override.blockedSlots?.length) {
    parts.push(`Blocked ${override.blockedSlots.join(", ")}`);
  }
  if (override.extraSlots?.length) {
    parts.push(`Extra ${override.extraSlots.join(", ")}`);
  }
  return parts.join(" · ") || "Normal hours";
}

// A worked example with the salon's own numbers, so the rules read as a day.
function HowItWorks({ settings }: { settings: BookingSettings }) {
  const { bufferMin, staggerMin, chairs } = settings;
  return (
    <PageGuide
      id="availability"
      title="How booking times work"
    >
        <li>
          <strong>Opening hours</strong> are your normal week. Clients are
          offered start times from opening, one every &ldquo;gap&rdquo;
          (e.g. every hour). Every appointment must finish by closing time,
          so long services get fewer start times.
        </li>
        <li>
          <strong>Chairs</strong> is how many clients you can look after at
          once (now {chairs}). Two clients never start less than{" "}
          {staggerMin} minutes apart, and each chair gets a {bufferMin}-minute
          break after every client. Clients never see chairs, only the times
          that are free.
        </li>
        <li>
          Example: open 13:00–03:00, every 1 hour, 2 chairs. A 4-hour retwist
          at 13:00 still leaves 14:00 free for a second client in the other
          chair; a third client can only start once one of them has finished.
        </li>
        <li>
          <strong>Special dates</strong> override your normal week for one
          day: a holiday, a short day, or an extra late slot.
        </li>
        <li>
          Nothing here ever moves or cancels a booking that&rsquo;s already
          been made. Want to check what clients see? Open{" "}
          <a
            href="/book"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand underline underline-offset-4"
          >
            the booking page ↗
          </a>
          .
        </li>
    </PageGuide>
  );
}
