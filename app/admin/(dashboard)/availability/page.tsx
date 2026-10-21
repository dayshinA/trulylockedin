import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { todayLocal } from "@/lib/booking/time";
import { formatLocalDate } from "@/lib/format";
import type { DateOverride } from "@/types/booking";
import {
  Badge,
  outlineButton,
  PageHeader,
  Section,
} from "../_components/admin-ui";
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
    repo.getWeeklyHours(),
    repo.listOverrides(today),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-14">
      <PageHeader title="Availability">
        When clients can book online. Changes never move existing bookings.
      </PageHeader>

      <Section title="Opening hours">
        <WeeklyHoursForm weekly={weekly} />
      </Section>

      <Section
        title="Special dates"
        description="Holidays, days off, shorter days, or one-off extra times."
      >
        {overrides.length > 0 ? (
          <ul className="border-t border-brown">
            {overrides.map((override) => (
              <li
                key={override.date}
                className="flex items-center gap-4 border-b border-brown py-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-semibold">
                    {formatLocalDate(override.date, "long")}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-sand">
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
          <p className="text-sm text-sand">No special dates coming up.</p>
        )}
        <details className="group border-b border-brown">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 font-semibold text-gold transition-colors hover:text-gold-light">
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

      <Section title="Booking rules">
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
  if (override.blockedSlots?.length) {
    parts.push(`Blocked ${override.blockedSlots.join(", ")}`);
  }
  if (override.extraSlots?.length) {
    parts.push(`Extra ${override.extraSlots.join(", ")}`);
  }
  return parts.join(" · ") || "Normal hours";
}
