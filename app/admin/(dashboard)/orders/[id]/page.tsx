import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { formatLocalDate, formatPrice } from "@/lib/format";
import { AddressBlock } from "@/components/site/address-block";
import {
  canTransitionOrder,
  orderStatusAction,
  paymentLabel,
  refundablePence,
} from "@/lib/shop/orders";
import { orderRepository } from "@/lib/shop/server";
import type { OrderStatus } from "@/types/shop";
import {
  refundOrderAction,
  saveOrderNotesAction,
  setOrderStatusAction,
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
import { OrderStatusBadge } from "../order-list";

export const metadata: Metadata = {
  title: "Order",
};

// Order the owner sees the buttons in; only allowed transitions are shown.
const NEXT_STATUSES: OrderStatus[] = [
  "ready",
  "collected",
  "pending",
  "cancelled",
];

const placedAt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/London",
});

export default async function OrderDetailPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  await verifyAdmin();
  const { id } = await params;
  const order = await orderRepository().getOrder(id);
  if (!order) notFound();

  const { client } = order;
  const readyText = `Hi ${client.name.split(" ")[0]}, your order ${order.ref} ${
    order.delivery ? "has been posted" : "is ready to collect"
  }.`;
  const whatsapp = `https://wa.me/${client.phone.replace(/^\+/, "")}${
    order.status === "ready" ? `?text=${encodeURIComponent(readyText)}` : ""
  }`;
  const actions = NEXT_STATUSES.filter((s) =>
    canTransitionOrder(order.status, s),
  );
  const refundable = refundablePence(order);
  const payment = order.payment;

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/orders", label: "All orders" }}
        eyebrow={`Ordered ${placedAt.format(new Date(order.createdAt))}`}
        title={client.name}
        actions={
          <>
            {order.memberId && <Badge tone="accent">Member</Badge>}
            {order.delivery && <Badge tone="accent">Delivery</Badge>}
            <OrderStatusBadge order={order} />
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <a href={`tel:${client.phone}`} className={primaryButton}>
          Call {client.phone}
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={outlineButton}
        >
          {order.status !== "ready"
            ? "WhatsApp"
            : order.delivery
              ? "WhatsApp: it's posted"
              : "WhatsApp: it's ready"}
        </a>
        {client.email && (
          <a
            href={`mailto:${client.email}?subject=${encodeURIComponent(`Your order ${order.ref}`)}`}
            className={outlineButton}
          >
            Email
          </a>
        )}
      </div>

      <ul className="border-t border-line">
        {order.items.map((item) => (
          <li
            key={item.productId}
            className="flex justify-between gap-4 border-b border-line py-4"
          >
            <span>
              {item.quantity} × {item.name}
              <span className="text-sm text-muted">
                {" "}
                ({formatPrice(item.pricePence)} each)
              </span>
            </span>
            <span className="shrink-0">
              {formatPrice(item.pricePence * item.quantity)}
            </span>
          </li>
        ))}
        <li className="flex justify-between gap-4 border-b border-line py-4 text-lg">
          <span>
            {payment
              ? order.delivery
                ? "Total (free delivery)"
                : "Total"
              : "Total to take"}
          </span>
          <span className="shrink-0 font-semibold text-brand">
            {formatPrice(order.totalPence)}
          </span>
        </li>
      </ul>

      <DetailList
        rows={[
          [
            "Reference",
            <span key="ref" className="font-mono">
              {order.ref}
            </span>,
          ],
          order.delivery
            ? [
                "Post to",
                <span key="address" className="select-all">
                  <AddressBlock address={order.delivery} />
                </span>,
              ]
            : ["Collection", "In the salon"],
          [
            "Payment",
            payment?.status === "paid"
              ? `${formatPrice(payment.amountPence)} paid online${payment.paidAt ? ` on ${placedAt.format(new Date(payment.paidAt))}` : ""}`
              : payment?.status === "refunded"
                ? `${formatPrice(payment.amountPence)} refunded${payment.refundedAt ? ` on ${placedAt.format(new Date(payment.refundedAt))}` : ""}`
                : payment?.status === "refund_failed"
                  ? `${formatPrice(payment.amountPence)} paid online, refund failed`
                  : payment
                    ? paymentLabel(order)
                    : `Pays ${formatPrice(order.totalPence)} in the salon`,
          ],
          ...(client.email
            ? ([["Email", client.email]] as [string, string][])
            : []),
          [
            "Customer notes",
            <span key="notes" className="whitespace-pre-wrap">
              {client.notes ?? "—"}
            </span>,
          ],
          [
            "Ordered by",
            order.memberId ? (
              <Link
                key="member"
                href={`/admin/members/${order.memberId}`}
                className={textLink}
              >
                Signed in as a member
              </Link>
            ) : (
              "A guest"
            ),
          ],
          ...(order.termsVersion
            ? ([
                [
                  "Agreed to",
                  `Terms last updated ${formatLocalDate(order.termsVersion)}`,
                ],
              ] as [string, string][])
            : []),
        ]}
      />

      {payment?.status === "refund_failed" && (
        <p className="border-l-2 border-ink pl-4">
          The refund didn&rsquo;t go through. This usually means there
          isn&rsquo;t enough in your Stripe balance yet. Try again below later,
          or refund it from the payment in your Stripe Dashboard.
        </p>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {actions.map((status) =>
            status === "cancelled" && refundable > 0 ? (
              <details key={status} className="w-full">
                <summary
                  className={`${dangerButton} w-fit list-none [&::-webkit-details-marker]:hidden`}
                >
                  {orderStatusAction(order, status)}
                </summary>
                <div className="mt-4 flex flex-col gap-3">
                  <p>
                    {client.name} paid {formatPrice(refundable)} online.
                    Cancelling refunds it to their card and emails them.
                  </p>
                  <form action={setOrderStatusAction}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button type="submit" className={dangerButton}>
                      Cancel and refund {formatPrice(refundable)}
                    </button>
                  </form>
                </div>
              </details>
            ) : (
              <form key={status} action={setOrderStatusAction}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value={status} />
                <button
                  type="submit"
                  className={
                    status === "ready" || status === "collected"
                      ? primaryButton
                      : status === "cancelled"
                        ? dangerButton
                        : outlineButton
                  }
                >
                  {orderStatusAction(order, status)}
                </button>
              </form>
            ),
          )}
        </div>
      )}

      {refundable > 0 && (
        <details className="flex flex-col gap-3">
          <summary
            className={`${outlineButton} w-fit list-none [&::-webkit-details-marker]:hidden`}
          >
            {payment?.status === "refund_failed"
              ? "Try the refund again"
              : "Refund customer"}
          </summary>
          <div className="mt-4 flex flex-col gap-3">
            <p>
              This gives {client.name} back the full{" "}
              {formatPrice(refundable)} they paid online, and emails them. The
              order stays as it is: cancel it as well if nothing will be sent
              or collected.
            </p>
            <form action={refundOrderAction}>
              <input type="hidden" name="id" value={order.id} />
              <button type="submit" className={dangerButton}>
                Refund {formatPrice(refundable)}
              </button>
            </form>
          </div>
        </details>
      )}

      <form action={saveOrderNotesAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={order.id} />
        <label htmlFor="adminNotes" className="text-sm text-muted">
          Private notes (only you can see these)
        </label>
        <textarea
          id="adminNotes"
          name="adminNotes"
          rows={4}
          defaultValue={order.adminNotes ?? ""}
          className={`${inputClass} py-2`}
        />
        <button type="submit" className={outlineButton}>
          Save notes
        </button>
      </form>
    </div>
  );
}
