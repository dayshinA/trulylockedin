import "server-only";

import { after } from "next/server";

import { getSiteContent } from "@/lib/data/public";
import { formatPrice } from "@/lib/format";
import { addressLines } from "@/lib/shop/address";
import {
  fulfilmentLabel,
  itemCount,
  orderStatusLabel,
  paymentLabel,
} from "@/lib/shop/orders";
import { orderRepository } from "@/lib/shop/server";
import type { SiteContent } from "@/types/cms";
import type { Order } from "@/types/shop";
import { clientFooter } from "./booking-emails";
import { MessageEmail, type EmailRow } from "./message-email";
import { emailConfig, sendEmail, type EmailConfig } from "./send";

// Shop order emails, sent after the response (see booking-emails.tsx).
// - created (pay in the salon): the owner hears about it; the customer gets
//   "order received" with their private order link.
// - paid: an online payment went through; same emails as "created" (the
//   private link isn't known any more, so it points to Find my order).
//   Nothing is sent while an order is only awaiting payment.
// - customer_cancelled: the owner hears about it; the customer gets a
//   confirmation (with the refund, if they'd paid online).
// - status_changed (by the owner): the customer hears about ready/posted and
//   cancelled; "back to new" and collected/delivered send nothing.
// - refunded: the owner pressed "Refund customer"; the customer hears.
export type OrderEmailEvent =
  | { kind: "created"; ref: string; cancelToken: string }
  | { kind: "paid"; id: string }
  | { kind: "refunded"; id: string }
  | { kind: "customer_cancelled"; by: { id: string } | { ref: string } }
  | { kind: "status_changed"; id: string };

export function notifyOrder(event: OrderEmailEvent): void {
  after(() =>
    sendOrderEmails(event).catch((error) =>
      console.error("Order email failed", event.kind, error),
    ),
  );
}

async function sendOrderEmails(event: OrderEmailEvent) {
  const config = emailConfig();
  if (!config) return;
  const repo = orderRepository();
  const key =
    event.kind === "created"
      ? { ref: event.ref }
      : event.kind === "customer_cancelled"
        ? event.by
        : { id: event.id };
  const order =
    "ref" in key ? await repo.getOrderByRef(key.ref) : await repo.getOrder(key.id);
  if (!order) return;
  const content = await getSiteContent().catch(() => null);

  switch (event.kind) {
    case "created":
      await toOwner(config, order, "new");
      await toCustomer(config, order, content, {
        href: `${config.siteUrl}/shop/order/${order.ref}#t=${event.cancelToken}`,
        label: "View my order",
      });
      return;
    case "paid":
      await toOwner(config, order, "new");
      await toCustomer(config, order, content, {
        href: `${config.siteUrl}/shop/order/find`,
        label: "View my order",
      });
      return;
    case "refunded":
      await toCustomer(
        config,
        order,
        content,
        { href: `${config.siteUrl}/shop/order/find`, label: "View my order" },
        "refunded",
      );
      return;
    case "customer_cancelled":
      await toOwner(config, order, "cancelled");
      await toCustomer(
        config,
        order,
        content,
        { href: `${config.siteUrl}/shop`, label: "Back to the shop" },
        "customer_cancelled",
      );
      return;
    case "status_changed":
      if (order.status === "ready" || order.status === "cancelled") {
        await toCustomer(config, order, content, {
          href: `${config.siteUrl}/shop/order/find`,
          label: "View my order",
        });
      }
      return;
  }
}

const itemLines = (o: Order) =>
  o.items.map(
    (item) =>
      `${item.quantity} × ${item.name} (${formatPrice(item.pricePence * item.quantity)})`,
  );

function orderRows(o: Order): EmailRow[] {
  return [
    { label: "Items", value: itemLines(o) },
    { label: "Total", value: formatPrice(o.totalPence) },
    { label: fulfilmentLabel(o), value: o.delivery ? addressLines(o.delivery) : "Collect from the salon" },
    { label: "Payment", value: paymentLabel(o) },
  ];
}

// For the customer, once an online payment was given back.
function refundParagraph(o: Order): string[] {
  const payment = o.payment;
  if (payment?.status === "refunded") {
    return [
      `We've refunded ${formatPrice(payment.amountPence)} to the card you paid with. It usually shows within 5 to 10 working days.`,
    ];
  }
  if (payment?.status === "refund_failed") {
    return [
      `We'll refund ${formatPrice(payment.amountPence)} to the card you paid with.`,
    ];
  }
  return [];
}

async function toOwner(config: EmailConfig, o: Order, what: "new" | "cancelled") {
  if (!config.ownerTo) return;
  const count = itemCount(o.items);
  const summary = `${count} item${count === 1 ? "" : "s"}, ${formatPrice(o.totalPence)}`;
  const copy =
    what === "cancelled"
      ? {
          subject: `Order cancelled: ${o.client.name} (${o.ref})`,
          heading: "Order cancelled",
          paragraph:
            o.payment?.status === "refunded"
              ? `${o.client.name} cancelled their order online, so there's nothing to prepare. Their ${formatPrice(o.payment.amountPence)} payment was refunded automatically.`
              : o.payment?.status === "refund_failed"
                ? `${o.client.name} cancelled their order online. The automatic refund didn't go through: refund them from the order in the admin.`
                : `${o.client.name} cancelled their order online, so there's nothing to prepare.`,
        }
      : {
          subject: `New order: ${o.client.name}, ${summary}`,
          heading: "New order",
          paragraph:
            o.payment?.status === "paid"
              ? o.delivery
                ? `${o.client.name} ordered for delivery and paid ${formatPrice(o.payment.amountPence)} online.`
                : `${o.client.name} ordered to collect from the salon and paid ${formatPrice(o.payment.amountPence)} online.`
              : `${o.client.name} ordered to collect from the salon and will pay when they collect.`,
        };

  await sendEmail(config, {
    to: config.ownerTo,
    subject: copy.subject,
    replyTo: o.client.email,
    react: (
      <MessageEmail
        preview={summary}
        heading={copy.heading}
        paragraphs={[
          copy.paragraph,
          ...(o.client.email ? ["Reply to this email to write to them."] : []),
        ]}
        rows={[
          { label: "Customer", value: o.client.name },
          { label: "Phone", value: o.client.phone },
          ...(o.client.email ? [{ label: "Email", value: o.client.email }] : []),
          ...orderRows(o),
          ...(o.client.notes ? [{ label: "Their notes", value: o.client.notes }] : []),
          { label: "Reference", value: o.ref },
        ]}
        button={{ label: "Open in the admin", href: `${config.siteUrl}/admin/orders/${o.id}` }}
        footer={["Sent by your website."]}
      />
    ),
  });
}

async function toCustomer(
  config: EmailConfig,
  o: Order,
  content: SiteContent | null,
  link: { href: string; label: string },
  reason?: "refunded" | "customer_cancelled",
) {
  if (!config.customerEmails || !o.client.email) return;
  const first = o.client.name.split(" ")[0];
  const contact = content?.contact;
  const paidOnline = o.payment?.status === "paid";

  const copy =
    reason === "refunded"
      ? {
          subject: `Refund for your order ${o.ref}`,
          heading: "We've refunded your order",
          paragraph: `Hi ${first}, we've refunded your payment for the order below. Reply to this email if you have any questions.`,
        }
      : reason === "customer_cancelled"
      ? {
          subject: `Order cancelled: ${o.ref}`,
          heading: "Your order is cancelled",
          paragraph: `Hi ${first}, this confirms you've cancelled the order below.`,
        }
      : o.status === "cancelled"
      ? {
          subject: `Your order ${o.ref} has been cancelled`,
          heading: "Your order has been cancelled",
          paragraph: `Hi ${first}, we're sorry, but we've had to cancel your order. Reply to this email if you have any questions.`,
        }
      : o.status === "ready"
        ? o.delivery
          ? {
              subject: `Your order ${o.ref} has been posted`,
              heading: "Your order is on its way",
              paragraph: `Hi ${first}, your order has been posted to the address below.`,
            }
          : {
              subject: `Your order ${o.ref} is ready to collect`,
              heading: "Your order is ready to collect",
              paragraph: paidOnline
                ? `Hi ${first}, your order is ready. Pick it up from the salon whenever suits you; it's already paid.`
                : `Hi ${first}, your order is ready. Pick it up from the salon whenever suits you and pay when you collect.`,
            }
        : {
            subject: `Order received: ${o.ref}`,
            heading: "Thank you for your order",
            paragraph: o.delivery
              ? `Hi ${first}, we've got your order and we're preparing it. We'll email you when it's posted.`
              : `Hi ${first}, we've got your order and we're preparing it. We'll email you when it's ready to collect.`,
          };

  const collectHere =
    o.status === "ready" && !o.delivery && contact?.addressLines.length;

  await sendEmail(config, {
    to: o.client.email,
    subject: copy.subject,
    replyTo: config.ownerTo ?? contact?.email,
    react: (
      <MessageEmail
        preview={copy.heading}
        heading={copy.heading}
        paragraphs={[
          copy.paragraph,
          ...(o.status === "cancelled" || reason === "refunded"
            ? refundParagraph(o)
            : []),
        ]}
        rows={[
          ...orderRows(o),
          { label: "Status", value: orderStatusLabel(o) },
          { label: "Reference", value: o.ref },
          ...(collectHere ? [{ label: "Collect from", value: contact.addressLines }] : []),
        ]}
        button={link}
        links={
          collectHere && contact.mapUrl
            ? [{ label: "Open in Maps", href: contact.mapUrl }]
            : []
        }
        footer={clientFooter(contact)}
      />
    ),
  });
}
