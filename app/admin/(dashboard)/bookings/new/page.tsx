import type { Metadata } from "next";
import Link from "next/link";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { todayLocal } from "@/lib/booking/time";
import { PageHeader } from "../../_components/admin-ui";
import { PageGuide } from "../../_components/help";
import { ManualBookingForm } from "./manual-booking-form";

export const metadata: Metadata = {
  title: "New booking",
};

export default async function NewBookingPage() {
  await verifyAdmin();
  const repo = bookingRepository();
  const [categories, services, settings] = await Promise.all([
    repo.listCategories(),
    repo.listServices(),
    repo.getSettings(),
  ]);

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/bookings", label: "All bookings" }}
        title="New booking"
      />
      <PageGuide
        id="new-booking"
      >
          <li>
            Use this when a client books by phone, DM or in person. The time
            is taken off the website straight away, so nobody else can book
            it.
          </li>
          <li>
            You can pick <strong>any time</strong>, even outside your opening
            hours or on a closed day. The only thing it stops is booking more
            clients at once than you have chairs.
          </li>
          <li>
            Bookings you add here are confirmed immediately and{" "}
            <strong>don&rsquo;t take a deposit</strong>. Sort payment with the
            client yourself.
          </li>
          <li>
            If you add the client&rsquo;s email, they get a confirmation email
            with a link to view or cancel their booking.
          </li>
      </PageGuide>
      {services.length === 0 ? (
        <p className="text-muted">
          Add a service first under{" "}
          <Link
            href="/admin/services"
            className="text-brand underline-offset-4 hover:underline pointer-coarse:underline"
          >
            Services
          </Link>
          .
        </p>
      ) : (
        <ManualBookingForm
          categories={categories.map(({ id, name }) => ({ id, name }))}
          services={services.map((s) => ({
            id: s.id,
            categoryId: s.categoryId,
            name: s.name,
            priceFromPence: s.priceFromPence,
            premiumPricePence: s.premiumPricePence,
            durationMin: s.durationMin,
            active: s.active,
            options: s.options,
            optionsSelectionMode: s.optionsSelectionMode,
            optionsRequired: s.optionsRequired,
            priceOnTheDay: s.priceOnTheDay,
          }))}
          today={todayLocal(new Date(), settings.timezone)}
          premiumFrom={settings.premiumFrom}
        />
      )}
    </div>
  );
}
