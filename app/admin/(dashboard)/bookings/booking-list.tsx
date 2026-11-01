import Link from "next/link";

import { groupByDate } from "@/lib/booking/admin-views";
import { STATUS_LABELS } from "@/lib/booking/labels";
import { formatLocalDate } from "@/lib/format";
import type { Booking, BookingStatus } from "@/types/booking";
import {
  Badge,
  type BadgeTone,
  Eyebrow,
  rowLink,
  rowList,
  rowTitle,
} from "../_components/admin-ui";

const TONE: Record<BookingStatus, BadgeTone> = {
  pending: "attention",
  confirmed: "accent",
  cancelled: "struck",
  completed: "muted",
  no_show: "alert",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function BookingRows({ bookings }: { bookings: Booking[] }) {
  return (
    <ul className={rowList}>
      {bookings.map((booking) => (
        <li key={booking.id}>
          <Link href={`/admin/bookings/${booking.id}`} className={rowLink}>
            <span className="w-24 shrink-0 text-sm text-brand tabular-nums">
              {booking.start}–{booking.end}
            </span>
            <span className="min-w-0 flex-1">
              <span className={rowTitle}>{booking.client.name}</span>
              <span className="block truncate text-sm text-muted">
                {booking.service.name}
              </span>
            </span>
            <StatusBadge status={booking.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function BookingsByDate({
  bookings,
  today,
  empty,
}: {
  bookings: Booking[];
  today: string;
  empty: string;
}) {
  if (bookings.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <div className="flex flex-col gap-8">
      {groupByDate(bookings).map(([date, group]) => (
        <section key={date} className="flex flex-col gap-3">
          <Eyebrow>
            {date === today ? "Today" : formatLocalDate(date, "long")}
          </Eyebrow>
          <BookingRows bookings={group} />
        </section>
      ))}
    </div>
  );
}
