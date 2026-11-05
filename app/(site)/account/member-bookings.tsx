import Link from "next/link";

import { STATUS_LABELS } from "@/lib/booking/labels";
import type { MemberBooking } from "@/lib/booking/member-bookings";
import { formatLocalDate, formatPrice } from "@/lib/format";
import { CancelButton } from "./cancel-button";

export function BookingRow({
  booking,
  bookAgain = false,
}: {
  booking: MemberBooking;
  bookAgain?: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold text-ink">
          {formatLocalDate(booking.date, "long")}, {booking.start}–{booking.end}
        </p>
        <p className="text-sm text-muted">{STATUS_LABELS[booking.status]}</p>
      </div>
      <div className="text-muted">
        <p>
          {booking.serviceName}
          {booking.optionNames.length > 0 &&
            ` · ${booking.optionNames.join(", ")}`}
        </p>
        <p className="text-sm">
          From{" "}
          <span className="text-accent-ink">
            {formatPrice(booking.pricePence)}
          </span>{" "}
          {booking.depositPaidPence &&
            ` · ${formatPrice(booking.depositPaidPence)} deposit paid`}{" "}
          · Ref <span className="font-mono">{booking.ref}</span>
        </p>
      </div>
      {booking.canCancel && (
        <CancelButton
          kind="booking"
          id={booking.id}
          warning={
            booking.depositPaidPence
              ? `Your ${formatPrice(booking.depositPaidPence)} deposit is non-refundable, so it won't be returned.`
              : undefined
          }
        />
      )}
      {bookAgain && booking.bookAgainHref && (
        <Link
          href={booking.bookAgainHref}
          className="inline-flex min-h-11 w-fit items-center rounded-full border border-field px-5 text-sm font-semibold text-ink transition-colors hover:border-brand"
        >
          Book again
        </Link>
      )}
    </li>
  );
}
