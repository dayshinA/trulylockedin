import "server-only";

import { after } from "next/server";

import { STATUS_LABELS } from "@/lib/booking/labels";
import { bookingRepository } from "@/lib/booking/server";
import { getSiteContent } from "@/lib/data/public";
import { formatDuration, formatLocalDate, formatPrice } from "@/lib/format";
import type { Booking } from "@/types/booking";
import type { SiteContent } from "@/types/cms";
import { MessageEmail, type EmailRow } from "./message-email";
import { emailConfig, sendEmail, type EmailConfig } from "./send";

// Booking emails, sent after the response so they never slow down or fail the
// booking itself.
// - created: the owner hears about online bookings; the client gets
//   "request received" / "confirmed" with their private manage link (owner
//   bookings made in the admin only email the client).
// - client_cancelled: the owner hears about it.
// - status_changed (by the owner): the client hears about confirmed and
//   cancelled; the other statuses send nothing.
export type BookingEmailEvent =
  | { kind: "created"; ref: string; cancelToken: string }
  | { kind: "client_cancelled"; by: { id: string } | { ref: string } }
  | { kind: "status_changed"; id: string };

export function notifyBooking(event: BookingEmailEvent): void {
  after(() =>
    sendBookingEmails(event).catch((error) =>
      console.error("Booking email failed", event.kind, error),
    ),
  );
}

async function sendBookingEmails(event: BookingEmailEvent) {
  const config = emailConfig();
  if (!config) return;
  const repo = bookingRepository();
  const key =
    event.kind === "created"
      ? { ref: event.ref }
      : event.kind === "client_cancelled"
        ? event.by
        : { id: event.id };
  const booking =
    "ref" in key ? await repo.getBookingByRef(key.ref) : await repo.getBooking(key.id);
  if (!booking) return;
  const content = await getSiteContent().catch(() => null);

  switch (event.kind) {
    case "created":
      if (booking.source !== "admin") await toOwner(config, booking, "new");
      await toClient(config, booking, content, {
        href: `${config.siteUrl}/book/${booking.ref}#t=${event.cancelToken}`,
        label: "Manage my booking",
      });
      return;
    case "client_cancelled":
      await toOwner(config, booking, "cancelled");
      return;
    case "status_changed":
      if (booking.status === "confirmed" || booking.status === "cancelled") {
        await toClient(config, booking, content, {
          href: `${config.siteUrl}/book/find`,
          label: "View my booking",
        });
      }
      return;
  }
}

const when = (b: Booking) =>
  `${formatLocalDate(b.date, "long")}, ${b.start}–${b.end}`;
const shortWhen = (b: Booking) =>
  `${formatLocalDate(b.date, "short")} ${b.start}`;

function serviceLines(b: Booking): string[] {
  const options = (b.service.options ?? []).map((o) => o.name);
  return options.length ? [b.service.name, options.join(", ")] : [b.service.name];
}

function appointmentRows(b: Booking): EmailRow[] {
  return [
    { label: "Service", value: serviceLines(b) },
    { label: "When", value: when(b) },
    { label: "Length", value: formatDuration(b.service.durationMin) },
    { label: "Price from", value: formatPrice(b.service.priceFromPence) },
  ];
}

async function toOwner(
  config: EmailConfig,
  b: Booking,
  what: "new" | "cancelled",
) {
  if (!config.ownerTo) return;
  const first = b.client.name.split(" ")[0];
  const pending = b.status === "pending";
  const rows: EmailRow[] = [
    { label: "Client", value: b.client.name },
    ...(b.client.phone ? [{ label: "Phone", value: b.client.phone }] : []),
    ...(b.client.email ? [{ label: "Email", value: b.client.email }] : []),
    ...appointmentRows(b),
    ...(b.client.notes ? [{ label: "Their notes", value: b.client.notes }] : []),
    ...(b.referencePhotos?.length
      ? [{ label: "Photos", value: `${b.referencePhotos.length} attached` }]
      : []),
    { label: "Reference", value: b.ref },
  ];

  const copy =
    what === "cancelled"
      ? {
          subject: `Cancelled: ${b.client.name}, ${shortWhen(b)}`,
          heading: `${first} cancelled`,
          paragraphs: [
            `${b.client.name} cancelled their appointment online. The time is free again for other clients.`,
          ],
          button: "Open in the admin",
        }
      : pending
        ? {
            subject: `New booking request: ${b.client.name}, ${shortWhen(b)}`,
            heading: "New booking request",
            paragraphs: [
              `${b.client.name} asked to book. It's held for them until you confirm or cancel it.`,
            ],
            button: "Confirm in the admin",
          }
        : {
            subject: `New booking: ${b.client.name}, ${shortWhen(b)}`,
            heading: "New booking",
            paragraphs: [`${b.client.name} booked online. It's already confirmed.`],
            button: "Open in the admin",
          };

  await sendEmail(config, {
    to: config.ownerTo,
    subject: copy.subject,
    replyTo: b.client.email,
    react: (
      <MessageEmail
        preview={`${b.service.name} · ${when(b)}`}
        heading={copy.heading}
        paragraphs={[
          ...copy.paragraphs,
          ...(b.client.email ? ["Reply to this email to write to them."] : []),
        ]}
        rows={rows}
        button={{
          label: copy.button,
          href: `${config.siteUrl}/admin/bookings/${b.id}`,
        }}
        footer={["Sent by your website."]}
      />
    ),
  });
}

async function toClient(
  config: EmailConfig,
  b: Booking,
  content: SiteContent | null,
  link: { href: string; label: string },
) {
  if (!config.customerEmails || !b.client.email) return;
  const first = b.client.name.split(" ")[0];
  const contact = content?.contact;

  const copy =
    b.status === "cancelled"
      ? {
          subject: `Your appointment on ${formatLocalDate(b.date, "short")} has been cancelled`,
          heading: "Your appointment has been cancelled",
          paragraphs: [
            `Hi ${first}, we're sorry, but we've had to cancel your appointment below.`,
            "You're welcome to book another time online, or reply to this email if you have any questions.",
          ],
          button: { label: "Book another time", href: `${config.siteUrl}/book` },
        }
      : b.status === "confirmed"
        ? {
            subject: `Booking confirmed: ${formatLocalDate(b.date, "short")} at ${b.start}`,
            heading: "Your booking is confirmed",
            paragraphs: [`Hi ${first}, we're looking forward to seeing you.`],
            button: link,
          }
        : {
            subject: `Booking request received: ${formatLocalDate(b.date, "short")} at ${b.start}`,
            heading: "We've got your booking request",
            paragraphs: [
              `Hi ${first}, thank you for booking. Your time is held for you, and we'll email you as soon as it's confirmed.`,
            ],
            button: link,
          };

  const showAddress = b.status === "confirmed" && contact?.addressLines.length;
  const rows: EmailRow[] = [
    ...appointmentRows(b),
    { label: "Status", value: STATUS_LABELS[b.status] },
    { label: "Reference", value: b.ref },
    ...(showAddress ? [{ label: "Where", value: contact.addressLines }] : []),
  ];
  const policies =
    b.status === "cancelled" ? [] : (content?.policies.booking ?? []);

  await sendEmail(config, {
    to: b.client.email,
    subject: copy.subject,
    replyTo: config.ownerTo ?? contact?.email,
    react: (
      <MessageEmail
        preview={`${b.service.name} · ${when(b)}`}
        heading={copy.heading}
        paragraphs={[...copy.paragraphs, ...policies]}
        rows={rows}
        button={copy.button}
        links={
          showAddress && contact.mapUrl
            ? [{ label: "Open in Maps", href: contact.mapUrl }]
            : []
        }
        footer={clientFooter(contact)}
      />
    ),
  });
}

export function clientFooter(contact: SiteContent["contact"] | undefined) {
  return [
    "Truly Locked In",
    ...(contact?.phone ? [`Call or text ${contact.phone}`] : []),
    "Reply to this email if you have any questions.",
  ];
}
