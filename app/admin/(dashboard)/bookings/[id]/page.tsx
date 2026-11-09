import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { STATUS_ACTIONS } from "@/lib/booking/labels";
import { canTransition } from "@/lib/booking/rules";
import { bookingRepository } from "@/lib/booking/server";
import { utcMsToLocal } from "@/lib/booking/time";
import { REFERENCE_RETENTION_DAYS } from "@/lib/booking/reference-photos";
import { formatDuration, formatLocalDate, formatPrice } from "@/lib/format";
import type { Booking, BookingStatus } from "@/types/booking";
import {
  retryRefundAction,
  saveAdminNotesAction,
  setBookingStatusAction,
} from "../actions";
import { inputClass } from "../../_components/admin-form";
import {
  Badge,
  dangerButton,
  DetailList,
  outlineButton,
  PageHeader,
  primaryButton,
  textLink,
} from "../../_components/admin-ui";
import { Tip } from "../../_components/help";
import { StatusBadge } from "../booking-list";

export const metadata: Metadata = {
  title: "Booking",
};

// Order the owner sees the buttons in; only allowed transitions are shown.
const NEXT_STATUSES: Exclude<BookingStatus, "awaiting_deposit" | "confirmed">[] = [
  "completed",
  "no_show",
  "cancelled",
];

export default async function BookingDetailPage({
  params,
}: PageProps<"/admin/bookings/[id]">) {
  await verifyAdmin();
  const { id } = await params;
  const repo = bookingRepository();
  const [booking, settings] = await Promise.all([
    repo.getBooking(id),
    repo.getSettings(),
  ]);
  if (!booking) notFound();
  const bookedOn = utcMsToLocal(
    Date.parse(booking.createdAt),
    settings.timezone,
  );

  const { client } = booking;
  const whatsapp =
    client.phone && `https://wa.me/${client.phone.replace(/^\+/, "")}`;
  const actions = NEXT_STATUSES.filter((s) => canTransition(booking.status, s));

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/bookings", label: "All bookings" }}
        eyebrow={`${formatLocalDate(booking.date, "long")}, ${booking.start}–${booking.end}`}
        title={client.name}
        actions={
          <>
            {booking.memberId && <Badge tone="accent">Member</Badge>}
            <StatusBadge status={booking.status} />
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        {client.phone && whatsapp && (
          <>
            <a href={`tel:${client.phone}`} className={primaryButton}>
              Call {client.phone}
            </a>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={outlineButton}
            >
              WhatsApp
            </a>
          </>
        )}
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className={client.phone ? outlineButton : primaryButton}
          >
            {client.phone ? "Email" : `Email ${client.email}`}
          </a>
        )}
      </div>

      <DetailList
        rows={[
          [
            "Service",
            `${booking.service.name} (${formatDuration(booking.service.durationMin)})`,
          ],
          ...(booking.service.options?.length
            ? ([
                [
                  "Options",
                  booking.service.options.map((o) => o.name).join(", "),
                ],
              ] as [string, string][])
            : []),
          booking.service.priceOnTheDay
            ? ["Price", "Set on the day: you price it at the appointment"]
            : [
                "Price from",
                `${formatPrice(booking.service.priceFromPence)}${booking.service.premium ? " (premium time)" : ""}`,
              ],
          ...depositRows(booking, settings.timezone),
          [
            "Reference",
            <span key="ref" className="font-mono">
              {booking.ref}
            </span>,
          ],
          ...(client.email
            ? ([["Email", client.email]] as [string, string][])
            : []),
          [
            "Client notes",
            <span key="notes" className="whitespace-pre-wrap">
              {client.notes ?? "—"}
            </span>,
          ],
          ["Booked", `${formatLocalDate(bookedOn.date)} at ${bookedOn.time}`],
          [
            "Booked by",
            booking.source === "admin" ? (
              "You (manual booking)"
            ) : booking.memberId ? (
              <Link
                key="member"
                href={`/admin/members/${booking.memberId}`}
                className={textLink}
              >
                Client, online, signed in as a member
              </Link>
            ) : (
              "Client, online, as a guest"
            ),
          ],
          ...(booking.termsVersion
            ? ([
                [
                  "Agreed to",
                  `Terms last updated ${formatLocalDate(booking.termsVersion)}`,
                ],
              ] as [string, string][])
            : []),
        ]}
      />

      {booking.referencePhotos && booking.referencePhotos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-semibold">
            Reference photos
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {booking.referencePhotos.map((_, index) => {
              const src = `/api/admin/bookings/${booking.id}/photos/${index}`;
              return (
                <li key={index}>
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square overflow-hidden rounded-sm bg-surface"
                  >
                    {/* Served by an admin-only route (private Cloudinary
                        asset), so next/image can't fetch it. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${src}?size=thumb`}
                      alt={`Reference photo ${index + 1} from ${client.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted">
            Tap a photo to open it full size. Photos are deleted{" "}
            {REFERENCE_RETENTION_DAYS} days after the appointment, or when the
            booking is cancelled.
          </p>
        </section>
      )}

      {booking.deposit?.status === "refund_failed" && (
        <div className="flex flex-col gap-3 border-l-2 border-ink pl-4">
          <p>
            The {formatPrice(booking.deposit.amountPence)} deposit refund
            didn&rsquo;t go through. This usually means there isn&rsquo;t
            enough in your Stripe balance yet. Try again later, or refund it
            from the payment in your Stripe Dashboard.
          </p>
          <form action={retryRefundAction}>
            <input type="hidden" name="id" value={booking.id} />
            <button type="submit" className={outlineButton}>
              Try the refund again
            </button>
          </form>
        </div>
      )}

      {actions.length > 0 && (
        <Tip>
          After the appointment, tap <strong>Mark completed</strong>, or{" "}
          <strong>Mark no-show</strong> if they didn&rsquo;t come. Neither
          sends the client anything; they just keep your records tidy.{" "}
          <strong>Cancel booking</strong> frees the time on the website and
          emails the client to say it&rsquo;s cancelled
          {booking.deposit?.status === "paid"
            ? ", and refunds their deposit"
            : ""}
          . You can&rsquo;t undo a cancellation, so if you only need to move
          the time, make a new booking first and then cancel this one.
        </Tip>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {actions.map((status) =>
            status === "cancelled" && booking.deposit?.status === "paid" ? (
              <details key={status} className="w-full">
                <summary className={`${dangerButton} w-fit list-none [&::-webkit-details-marker]:hidden`}>
                  {STATUS_ACTIONS.cancelled}
                </summary>
                <div className="mt-4 flex flex-col gap-3">
                  <p>
                    {client.name} paid a{" "}
                    {formatPrice(booking.deposit.amountPence)} deposit.
                    Cancelling from here refunds it to their card. If they
                    asked to cancel, they lose their deposit: keep the booking
                    and tell them to cancel through their booking link, or mark
                    it as a no-show.
                  </p>
                  <form action={setBookingStatusAction}>
                    <input type="hidden" name="id" value={booking.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button type="submit" className={dangerButton}>
                      Cancel and refund{" "}
                      {formatPrice(booking.deposit.amountPence)}
                    </button>
                  </form>
                </div>
              </details>
            ) : (
              <form key={status} action={setBookingStatusAction}>
                <input type="hidden" name="id" value={booking.id} />
                <input type="hidden" name="status" value={status} />
                <button
                  type="submit"
                  className={
                    status === "cancelled" || status === "no_show"
                      ? dangerButton
                      : outlineButton
                  }
                >
                  {STATUS_ACTIONS[status]}
                </button>
              </form>
            ),
          )}
        </div>
      )}

      <form action={saveAdminNotesAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={booking.id} />
        <label htmlFor="adminNotes" className="text-sm text-muted">
          Private notes (only you can see these)
        </label>
        <span className="-mt-1 text-xs text-muted">
          For anything you want to remember: products used, allergies, what
          to do next time. Clients never see these notes.
        </span>
        <textarea
          id="adminNotes"
          name="adminNotes"
          rows={4}
          defaultValue={booking.adminNotes ?? ""}
          className={`${inputClass} py-2`}
        />
        <button type="submit" className={outlineButton}>
          Save notes
        </button>
      </form>
    </div>
  );
}

function depositRows(
  booking: Booking,
  timeZone: string,
): [string, string][] {
  const deposit = booking.deposit;
  if (!deposit) return [];
  const amount = formatPrice(deposit.amountPence);
  const at = (iso?: string) => {
    if (!iso) return "";
    const local = utcMsToLocal(Date.parse(iso), timeZone);
    return ` on ${formatLocalDate(local.date)} at ${local.time}`;
  };
  switch (deposit.status) {
    case "awaiting":
      return [["Deposit", `${amount}, not paid yet`]];
    case "paid":
      return [
        ["Deposit", `${amount} paid online${at(deposit.paidAt)}`],
        [
          "Left to pay",
          booking.service.priceOnTheDay
            ? `Your price on the day, minus the ${amount} deposit`
            : `${formatPrice(Math.max(0, booking.service.priceFromPence - deposit.amountPence))} from`,
        ],
      ];
    case "refunded":
      return [["Deposit", `${amount} refunded${at(deposit.refundedAt)}`]];
    case "refund_failed":
      return [["Deposit", `${amount} paid, refund failed`]];
  }
}
