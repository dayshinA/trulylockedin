import type { Metadata } from "next";
import Link from "next/link";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { todayLocal } from "@/lib/booking/time";
import { PageHeader } from "../../_components/admin-ui";
import { ManualBookingForm } from "./manual-booking-form";

export const metadata: Metadata = {
  title: "New booking",
};

export default async function NewBookingPage() {
  await verifyAdmin();
  const repo = bookingRepository();
  const [services, settings] = await Promise.all([
    repo.listServices(),
    repo.getSettings(),
  ]);

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/bookings", label: "All bookings" }}
        title="New booking"
      />
      {services.length === 0 ? (
        <p className="text-sand">
          Add a service first under{" "}
          <Link
            href="/admin/services"
            className="text-gold underline-offset-4 hover:underline"
          >
            Services
          </Link>
          .
        </p>
      ) : (
        <ManualBookingForm
          services={services.map(({ id, name, durationMin, active }) => ({
            id,
            name,
            durationMin,
            active,
          }))}
          today={todayLocal(new Date(), settings.timezone)}
        />
      )}
    </div>
  );
}
