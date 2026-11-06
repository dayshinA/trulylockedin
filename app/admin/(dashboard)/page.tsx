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
import { PageGuide } from "./_components/help";
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

  const [{ today, todays, upcoming }, newOrders] = await Promise.all([
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

      <PageGuide
        id="overview"
        title="Welcome to your admin"
      >
          <li>
            This page is your day at a glance: any <strong>new shop orders</strong>,
            today&rsquo;s appointments, and everything booked for the next 7
            days. Tap any row to see the client&rsquo;s details.
          </li>
          <li>
            Clients book themselves on the website, so you don&rsquo;t need to
            do anything for a booking to happen. You&rsquo;ll get an email each
            time someone books, cancels or orders.
          </li>
          <li>
            Booked someone by phone or in person? Tap{" "}
            <strong>New booking</strong> so the time is taken off the website
            and nobody else can book it.
          </li>
          <li>
            Use the menu to change your <strong>opening hours</strong>{" "}
            (Availability), <strong>prices</strong> (Services), your{" "}
            <strong>photos</strong> (Portfolio) and the{" "}
            <strong>words on the website</strong> (Content). Each page has its
            own help box like this one.
          </li>
          <li>
            Nothing you change here ever moves or deletes a booking that&rsquo;s
            already been made.
          </li>
      </PageGuide>

      {newOrders.length > 0 && (
        <Section
          title="New orders"
          count={newOrders.length}
          description="Shop orders waiting for you to pack them. Open one to mark it ready or posted."
          action={
            <Link href="/admin/orders" className={textLink}>
              All orders
            </Link>
          }
        >
          <OrderRows orders={newOrders} empty="" />
        </Section>
      )}

      <Section
        title="Today"
        description="Appointments today, in time order. After each one, open it and mark it completed or a no-show."
      >
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
        Before clients can book online, the website needs your opening hours,
        your booking rules and at least one service. Press the button below to
        fill these in with sensible starting values. Nothing is shown to
        clients until you press it, and you can change everything afterwards
        under Availability and Services.
      </PageHeader>
      <form action={seedBookingDataAction}>
        <button type="submit" className={primaryButton}>
          Set up booking defaults
        </button>
      </form>
    </div>
  );
}
