"use client";

import { useState, useTransition } from "react";

import { AddressBlock } from "@/components/site/address-block";
import { DetailRows } from "@/components/site/detail-rows";
import { OrderLines } from "@/components/site/order-lines";
import type { OrderSummary } from "@/lib/shop/manage";
import { formatPrice } from "@/lib/format";
import {
  orderStatusLabel,
  paymentLabel,
  refundablePence,
} from "@/lib/shop/orders";

// The customer's view of one order, with a two-tap cancel. Shared by the
// private link (/shop/order/{ref}) and "Find my order" (/shop/order/find).
export function OrderDetails({
  order,
  message,
  onCancel,
}: {
  order: OrderSummary;
  message?: string;
  // Resolves once the cancel request has finished (the parent updates state).
  onCancel: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, startCancel] = useTransition();

  function cancel() {
    startCancel(async () => {
      await onCancel();
      setConfirming(false);
    });
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl font-semibold">
        {orderStatusLabel(order)}
      </h2>
      <div className="mt-6">
        <OrderLines
          items={order.items}
          totalLabel={
            order.payment
              ? order.delivery
                ? "Total, free delivery"
                : "Total"
              : order.status === "collected"
                ? "Total"
                : "To pay on collection"
          }
          totalPence={order.totalPence}
        />
      </div>
      <div className="mt-6">
        <DetailRows
          rows={[
            ["Name", order.clientName],
            [
              "Reference",
              <span key="ref" className="font-mono">
                {order.ref}
              </span>,
            ],
            order.delivery
              ? [
                  "Delivery to",
                  <AddressBlock key="address" address={order.delivery} />,
                ]
              : ["Collection", "From the salon"],
            ["Payment", paymentLabel(order)],
          ]}
        />
      </div>

      {message && (
        <p role="status" className="mt-5 font-semibold text-brand">
          {message}
        </p>
      )}

      {order.canCancel ? (
        confirming ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <p className="w-full">
              Cancel this order?
              {refundablePence(order) > 0 &&
                ` We'll refund ${formatPrice(refundablePence(order))} to the card you paid with.`}
            </p>
            <button
              type="button"
              onClick={cancel}
              disabled={cancelling}
              className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-page transition-colors hover:bg-brand disabled:bg-line disabled:text-muted"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel it"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-11 px-3 text-sm text-muted hover:text-ink"
            >
              Keep my order
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-8 min-h-11 rounded-full border border-brand px-6 text-sm text-ink transition-colors hover:border-brand"
          >
            Cancel order
          </button>
        )
      ) : (
        order.status === "ready" && (
          <p className="mt-8 text-muted">
            Need to change or cancel? Please contact us.
          </p>
        )
      )}
    </section>
  );
}
