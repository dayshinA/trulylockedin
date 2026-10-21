import type { Metadata } from "next";
import Link from "next/link";

import { verifyAdmin } from "@/lib/auth/dal";
import {
  BOOKING_VIEWS,
  loadBookingList,
  type BookingView,
} from "@/lib/booking/admin-views";
import { bookingRepository } from "@/lib/booking/server";
import { PageHeader, primaryButton, Tabs } from "../_components/admin-ui";
import { BookingsByDate } from "./booking-list";

export const metadata: Metadata = {
  title: "Bookings",
};

const VIEW_LABELS: Record<BookingView, string> = {
  upcoming: "Upcoming",
  pending: "To confirm",
  past: "Past 30 days",
  cancelled: "Cancelled",
};

const EMPTY: Record<BookingView, string> = {
  upcoming: "No upcoming bookings.",
  pending: "Nothing waiting for confirmation.",
  past: "No bookings in the last 30 days.",
  cancelled: "No upcoming cancellations.",
};

export default async function BookingsPage({
  searchParams,
}: PageProps<"/admin/bookings">) {
  await verifyAdmin();
  const { view: raw } = await searchParams;
  const view: BookingView = BOOKING_VIEWS.includes(raw as BookingView)
    ? (raw as BookingView)
    : "upcoming";

  const { today, bookings } = await loadBookingList(
    bookingRepository(),
    view,
    new Date(),
  );

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Bookings"
        actions={
          <Link href="/admin/bookings/new" className={primaryButton}>
            New booking
          </Link>
        }
      />
      <Tabs
        label="Filter bookings"
        items={BOOKING_VIEWS.map((v) => ({
          href:
            v === "upcoming" ? "/admin/bookings" : `/admin/bookings?view=${v}`,
          label: VIEW_LABELS[v],
          current: v === view,
        }))}
      />
      <BookingsByDate bookings={bookings} today={today} empty={EMPTY[view]} />
    </div>
  );
}
