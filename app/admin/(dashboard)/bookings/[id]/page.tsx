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
import type { BookingStatus } from "@/types/booking";
import { saveAdminNotesAction, setBookingStatusAction } from "../actions";
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
import { StatusBadge } from "../booking-list";

export const metadata: Metadata = {
  title: "Booking",
};

// Order the owner sees the buttons in; only allowed transitions are shown.
const NEXT_STATUSES: Exclude<BookingStatus, "pending">[] = [
  "confirmed",
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
          ["Price from", formatPrice(booking.service.priceFromPence)],
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

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {actions.map((status) => (
            <form key={status} action={setBookingStatusAction}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className={
                  status === "confirmed"
                    ? primaryButton
                    : status === "cancelled" || status === "no_show"
                      ? dangerButton
                      : outlineButton
                }
              >
                {STATUS_ACTIONS[status]}
              </button>
            </form>
          ))}
        </div>
      )}

      <form action={saveAdminNotesAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={booking.id} />
        <label htmlFor="adminNotes" className="text-sm text-muted">
          Private notes (only you can see these)
        </label>
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
