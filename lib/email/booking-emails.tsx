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
//   "confirmed" with their private manage link (owner bookings made in the
//   admin only email the client). Every booking is confirmed once made.
// - client_cancelled (link, Find my booking or account): the owner hears
//   about it, and the client gets a confirmation (a paid deposit is kept).
// - status_changed (by the owner): the client hears about a cancellation;
//   completed and no-show send nothing.
// - deposit_paid: a held booking's deposit went through, so it's confirmed;
//   same emails as "created" (the private link isn't known any more, so the
//   client's email points to Find my booking). Nothing is sent while a booking
//   is only held.
// - late_payment_refunded: the payment arrived after the hold had gone; both
//   sides hear it was refunded.
export type BookingEmailEvent =
  | { kind: "created"; ref: string; cancelToken: string }
  | { kind: "deposit_paid"; id: string }
  | { kind: "late_payment_refunded"; id: string }
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
    case "deposit_paid":
      await toOwner(config, booking, "new");
      await toClient(config, booking, content, {
        href: `${config.siteUrl}/book/find`,
        label: "View my booking",
      });
      return;
    case "late_payment_refunded":
      await toOwner(config, booking, "late_payment");
      await toClient(
        config,
        booking,
        content,
        { href: `${config.siteUrl}/book`, label: "Book another time" },
        { latePayment: true },
      );
      return;
    case "client_cancelled":
      await toOwner(config, booking, "cancelled");
      await toClient(
        config,
        booking,
        content,
        { href: `${config.siteUrl}/book`, label: "Book another time" },
        { cancelledByClient: true },
      );
      return;
    case "status_changed":
      if (booking.status === "cancelled") {
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
    b.service.priceOnTheDay
      ? { label: "Price", value: "Set at the appointment" }
      : {
          label: "Price from",
          value: `${formatPrice(b.service.priceFromPence)}${b.service.premium ? " (premium time)" : ""}`,
        },
    ...depositRows(b),
  ];
}

function depositRows(b: Booking): EmailRow[] {
  const deposit = b.deposit;
  if (!deposit || deposit.status === "awaiting") return [];
  const amount = formatPrice(deposit.amountPence);
  if (deposit.status === "paid" && b.status === "cancelled") {
    return [{ label: "Deposit", value: `${amount} paid, non-refundable` }];
  }
  if (deposit.status === "paid") {
    return [
      { label: "Deposit paid", value: amount },
      {
        label: "Left to pay",
        value: b.service.priceOnTheDay
          ? "The rest, at the appointment: the deposit comes off the price set on the day"
          : `${formatPrice(Math.max(0, b.service.priceFromPence - deposit.amountPence))} from, at the appointment`,
      },
    ];
  }
  return [
    {
      label: "Deposit",
      value:
        deposit.status === "refunded"
          ? `${amount} refunded`
          : `${amount}, refund not yet sent`,
    },
  ];
}

// For the client, once the salon has given the deposit back.
function refundParagraph(b: Booking): string[] {
  const deposit = b.deposit;
  if (deposit?.status === "refunded") {
    return [
      `We've refunded your ${formatPrice(deposit.amountPence)} deposit to the card you paid with. It usually shows within 5 to 10 working days.`,
    ];
  }
  if (deposit?.status === "refund_failed") {
    return [
      `We'll refund your ${formatPrice(deposit.amountPence)} deposit to the card you paid with.`,
    ];
  }
  return [];
}

async function toOwner(
  config: EmailConfig,
  b: Booking,
  what: "new" | "cancelled" | "late_payment",
) {
  if (!config.ownerTo) return;
  const first = b.client.name.split(" ")[0];
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

  const refundFailed = b.deposit?.status === "refund_failed";
  const copy =
    what === "late_payment"
      ? {
          subject: `Deposit refunded: ${b.client.name}, ${shortWhen(b)}`,
          heading: "A late deposit was refunded",
          paragraphs: [
            `${b.client.name}'s deposit arrived after their held time had been released and booked by someone else, so the booking wasn't made.`,
            refundFailed
              ? "The automatic refund didn't go through. Please refund it from the booking in the admin, or from your Stripe Dashboard."
              : "Their deposit has been refunded automatically and they've been told.",
          ],
          button: "Open in the admin",
        }
      : what === "cancelled"
      ? {
          subject: `Cancelled: ${b.client.name}, ${shortWhen(b)}`,
          heading: `${first} cancelled`,
          paragraphs: [
            `${b.client.name} cancelled their appointment online. The time is free again for other clients.`,
            ...(b.deposit?.status === "paid"
              ? [
                  `You keep their ${formatPrice(b.deposit.amountPence)} deposit (non-refundable when the client cancels).`,
                ]
              : []),
          ],
          button: "Open in the admin",
        }
      : {
          subject: `New booking: ${b.client.name}, ${shortWhen(b)}`,
          heading: "New booking",
          paragraphs: [
            b.deposit?.status === "paid"
              ? `${b.client.name} booked online and paid the ${formatPrice(b.deposit.amountPence)} deposit. It's confirmed.`
              : `${b.client.name} booked online. It's confirmed; cancel it from the admin if you can't keep it.`,
          ],
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
  {
    latePayment = false,
    cancelledByClient = false,
  }: { latePayment?: boolean; cancelledByClient?: boolean } = {},
) {
  if (!config.customerEmails || !b.client.email) return;
  const first = b.client.name.split(" ")[0];
  const contact = content?.contact;

  const copy =
    cancelledByClient
      ? {
          subject: `Booking cancelled: ${formatLocalDate(b.date, "short")} at ${b.start}`,
          heading: "Your booking is cancelled",
          paragraphs: [
            `Hi ${first}, this confirms you've cancelled the appointment below.`,
            ...(b.deposit?.status === "paid"
              ? [
                  `As the ${formatPrice(b.deposit.amountPence)} deposit is non-refundable when a booking is cancelled by the client, it hasn't been refunded.`,
                ]
              : []),
            "You're welcome to book another time online, or reply to this email if you have any questions.",
          ],
          button: link,
        }
      : b.status === "cancelled"
      ? {
          subject: `Your appointment on ${formatLocalDate(b.date, "short")} has been cancelled`,
          heading: "Your appointment has been cancelled",
          paragraphs: [
            latePayment
              ? `Hi ${first}, we're sorry, but your payment came through after your held time had been released, and it has since been booked.`
              : `Hi ${first}, we're sorry, but we've had to cancel your appointment below.`,
            ...refundParagraph(b),
            "You're welcome to book another time online, or reply to this email if you have any questions.",
          ],
          button: { label: "Book another time", href: `${config.siteUrl}/book` },
        }
      : {
          subject: `Booking confirmed: ${formatLocalDate(b.date, "short")} at ${b.start}`,
          heading: "Your booking is confirmed",
          paragraphs: [
            `Hi ${first}, we're looking forward to seeing you.`,
            ...(b.deposit?.status === "paid"
              ? [
                  `Thank you for your ${formatPrice(b.deposit.amountPence)} deposit. It comes off the price on the day. It's non-refundable if you cancel or miss the appointment, but we'll refund it if we have to cancel.`,
                ]
              : []),
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
