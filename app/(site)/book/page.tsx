import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { FindCallout } from "@/components/site/find-callout";
import { getMember } from "@/lib/auth/member-dal";
import { buildCatalogue, isBookableOnline } from "@/lib/booking/catalogue";
import { bookingRepository } from "@/lib/booking/server";
import { todayLocal } from "@/lib/booking/time";
import { BookingFlow } from "./booking-flow";
import type { BookableCategory } from "./service-picker";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Choose a service, pick a time and book your appointment.",
};

export default function BookPage({ searchParams }: PageProps<"/book">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      <h1 className="font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
        Book an appointment
      </h1>
      <FindCallout
        className="mt-8"
        title="Already booked?"
        text="See the details of your appointment, or cancel it."
        href="/book/find"
        label="Find my booking"
      />
      <Suspense fallback={<p className="mt-10 text-muted">Loading services…</p>}>
        <BookingLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Services and booking rules are read live: they decide what can be booked.
async function BookingLoader({
  searchParams,
}: {
  searchParams: PageProps<"/book">["searchParams"];
}) {
  await connection();
  const { service: requested, options: requestedOptions } = await searchParams;
  const repo = bookingRepository();
  // Null for guests; a failed session check also just means "guest".
  const member = await getMember();

  let catalogue: BookableCategory[];
  let today: string;
  let firstDay: string;
  let maxAdvanceDays: number;
  let depositPence: number;
  let premiumFrom: string | null;
  try {
    const [categories, all, settings] = await Promise.all([
      repo.listCategories(),
      repo.listServices({ activeOnly: true }),
      repo.getSettings(),
    ]);
    catalogue = buildCatalogue(categories, all)
      .map(({ id, name, services, ...category }) => ({
        id,
        name,
        services: services.flatMap((s) =>
          // The null check repeats isBookableOnline's so TypeScript narrows it.
          isBookableOnline(s, category) && s.durationMin !== null
            ? [
                {
                  id: s.id,
                  name: s.name,
                  description: s.description,
                  durationMin: s.durationMin,
                  priceFromPence: s.priceFromPence,
                  premiumPricePence: s.premiumPricePence,
                  priceLabel: s.priceLabel,
                  depositNote: s.depositNote,
                  depositRequired: s.depositRequired,
                  priceOnTheDay: s.priceOnTheDay,
                  options: s.options,
                  optionsSelectionMode: s.optionsSelectionMode,
                  optionsRequired: s.optionsRequired,
                },
              ]
            : [],
        ),
      }))
      .filter((category) => category.services.length > 0);
    const now = new Date();
    today = todayLocal(now, settings.timezone);
    // Days before this can't have any times because of the minimum notice.
    firstDay = todayLocal(
      new Date(now.getTime() + settings.minNoticeHours * 3_600_000),
      settings.timezone,
    );
    maxAdvanceDays = settings.maxAdvanceDays;
    depositPence = settings.depositPence;
    premiumFrom = settings.premiumFrom;
  } catch (error) {
    console.error("Booking page failed to load", error);
    return <Unavailable />;
  }

  if (catalogue.length === 0) return <Unavailable />;

  return (
    <BookingFlow
      catalogue={catalogue}
      today={today}
      firstDay={firstDay}
      maxAdvanceDays={maxAdvanceDays}
      depositPence={depositPence}
      premiumFrom={premiumFrom}
      // From "Book this" links on /services and "Book again" on /account.
      // Unknown or hidden services and options are ignored.
      initialServiceId={typeof requested === "string" ? requested : undefined}
      initialOptionIds={
        typeof requestedOptions === "string"
          ? requestedOptions.split(",").filter(Boolean)
          : []
      }
      member={
        member
          ? { name: member.name, email: member.email, phone: member.phone }
          : null
      }
    />
  );
}

function Unavailable() {
  return (
    <p className="mt-10 max-w-xl border-t border-line pt-6 text-lg text-muted">
      Online booking isn&rsquo;t open yet. Please{" "}
      <Link
        href="/contact"
        className="text-brand underline underline-offset-4 hover:text-brand-hover"
      >
        get in touch
      </Link>{" "}
      to book.
    </p>
  );
}
