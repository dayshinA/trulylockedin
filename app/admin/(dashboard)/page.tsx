import type { Metadata } from "next";
import Link from "next/link";

import { verifyAdmin } from "@/lib/auth/dal";
import { loadOverview } from "@/lib/booking/admin-views";
import { bookingRepository } from "@/lib/booking/server";
import { adminDb } from "@/lib/firebase/admin";
import { formatLocalDate } from "@/lib/format";
import { isBookingConfigured } from "@/lib/seed";
import { orderRepository } from "@/lib/shop/server";
import {
  PageHeader,
  primaryButton,
  Section,
  textLink,
} from "./_components/admin-ui";
import { seedBookingDataAction } from "./actions";
import { BookingRows, BookingsByDate } from "./bookings/booking-list";
import { OrderRows } from "./orders/order-list";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminOverviewPage() {
  await verifyAdmin();
  const configured = await isBookingConfigured(adminDb());
  if (!configured) return <BookingSetup />;

  const [{ today, todays, pending, upcoming }, newOrders] = await Promise.all([
    loadOverview(bookingRepository(), new Date()),
    orderRepository().listOrders({ statuses: ["pending"] }),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-14">
      <PageHeader
        eyebrow={formatLocalDate(today, "long")}
        title="Overview"
        actions={
          <Link href="/admin/bookings/new" className={primaryButton}>
            New booking
          </Link>
        }
      />

      {pending.length > 0 && (
        <Section title="To confirm" count={pending.length}>
          <BookingsByDate bookings={pending} today={today} empty="" />
        </Section>
      )}

      {newOrders.length > 0 && (
        <Section
          title="New orders"
          count={newOrders.length}
          action={
            <Link href="/admin/orders" className={textLink}>
              All orders
            </Link>
          }
        >
          <OrderRows orders={newOrders} empty="" />
        </Section>
      )}

      <Section title="Today">
        {todays.length > 0 ? (
          <BookingRows bookings={todays} />
        ) : (
          <p className="text-muted">No appointments today.</p>
        )}
      </Section>

      <Section
        title="Next 7 days"
        action={
          <Link href="/admin/bookings" className={textLink}>
            All bookings
          </Link>
        }
      >
        <BookingsByDate
          bookings={upcoming}
          today={today}
          empty="Nothing booked in the next week."
        />
      </Section>
    </div>
  );
}

function BookingSetup() {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader eyebrow="Getting started" title="Set up online booking">
        Online booking needs opening hours, booking rules and at least one
        service. This adds sensible defaults (Tue–Sat hours, 30-minute slots,
        15-minute buffer, 24 hours’ notice, 8 weeks ahead) and sample services.
        You can change all of it later.
      </PageHeader>
      <form action={seedBookingDataAction}>
        <button type="submit" className={primaryButton}>
          Set up booking defaults
        </button>
      </form>
    </div>
  );
}
