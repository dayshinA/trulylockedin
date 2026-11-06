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
import { PageGuide } from "../_components/help";
import { BookingsByDate } from "./booking-list";

export const metadata: Metadata = {
  title: "Bookings",
};

const VIEW_LABELS: Record<BookingView, string> = {
  upcoming: "Upcoming",
  past: "Past 30 days",
  cancelled: "Cancelled",
};

const EMPTY: Record<BookingView, string> = {
  upcoming: "No upcoming bookings.",
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
      <PageGuide
        id="bookings"
      >
          <li>
            <strong>Upcoming</strong> lists every appointment still to come,
            grouped by day. <strong>Past 30 days</strong> shows recent ones,
            newest first. <strong>Cancelled</strong> shows upcoming bookings
            that were cancelled.
          </li>
          <li>
            The coloured label shows where each booking is up to.{" "}
            <strong>Confirmed</strong>: it&rsquo;s going ahead.{" "}
            <strong>Completed</strong>: the client came.{" "}
            <strong>No-show</strong>: they didn&rsquo;t turn up.{" "}
            <strong>Cancelled</strong>: the time is free again.
          </li>
          <li>
            <strong>Premium</strong> means it&rsquo;s a late-evening booking at
            the premium price. <strong>Photo</strong> means the client sent
            reference pictures.
          </li>
          <li>
            Tap a booking to call or message the client, add private notes,
            or change its status.
          </li>
          <li>
            <strong>New booking</strong> is for clients who booked by phone, DM
            or in person. It takes the time off the website straight away.
          </li>
      </PageGuide>
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
