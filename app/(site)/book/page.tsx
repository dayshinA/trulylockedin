import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { buildCatalogue, isOnlineService } from "@/lib/booking/catalogue";
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
  const { service: requested } = await searchParams;
  const repo = bookingRepository();

  let catalogue: BookableCategory[];
  let today: string;
  let maxAdvanceDays: number;
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
          // No duration means no slots to offer.
          isOnlineService(s, category) && s.durationMin !== null
            ? [
                {
                  id: s.id,
                  name: s.name,
                  description: s.description,
                  durationMin: s.durationMin,
                  priceFromPence: s.priceFromPence,
                  priceLabel: s.priceLabel,
                  depositNote: s.depositNote,
                  options: s.options,
                  optionsSelectionMode: s.optionsSelectionMode,
                  optionsRequired: s.optionsRequired,
                },
              ]
            : [],
        ),
      }))
      .filter((category) => category.services.length > 0);
    today = todayLocal(new Date(), settings.timezone);
    maxAdvanceDays = settings.maxAdvanceDays;
  } catch (error) {
    console.error("Booking page failed to load", error);
    return <Unavailable />;
  }

  if (catalogue.length === 0) return <Unavailable />;

  return (
    <BookingFlow
      catalogue={catalogue}
      today={today}
      maxAdvanceDays={maxAdvanceDays}
      // From "Book this" links on /services; ignored if unknown or hidden.
      initialServiceId={typeof requested === "string" ? requested : undefined}
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
