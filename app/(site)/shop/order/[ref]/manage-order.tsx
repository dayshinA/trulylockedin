"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { DetailRows } from "@/components/site/detail-rows";
import { OrderLines } from "@/components/site/order-lines";
import type { OrderSummary } from "@/lib/shop/manage";
import { ORDER_STATUS_LABELS } from "@/lib/shop/orders";
import { cancelMyOrder, getMyOrder } from "../../actions";

// The token lives in the URL fragment (#t=…), which browsers never send to the
// server or in Referer headers, so it is read here and passed to the action.
function readToken(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; order: OrderSummary; message?: string };

export function ManageOrder({ orderRef }: { orderRef: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [confirming, setConfirming] = useState(false);
  const [cancelling, startCancel] = useTransition();

  useEffect(() => {
    let active = true;
    getMyOrder({ ref: orderRef, token: readToken() }).then((result) => {
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", order: result.order }
          : { kind: "error", message: result.error },
      );
    });
    return () => {
      active = false;
    };
  }, [orderRef]);

  function cancel() {
    startCancel(async () => {
      const result = await cancelMyOrder({ ref: orderRef, token: readToken() });
      setConfirming(false);
      setState((previous) =>
        result.ok
          ? {
              kind: "ready",
              order: result.order,
              message: "Your order has been cancelled.",
            }
          : previous.kind === "ready"
            ? { ...previous, message: result.error }
            : { kind: "error", message: result.error },
      );
    });
  }

  if (state.kind === "loading") {
    return <p className="mt-8 text-muted">Loading your order…</p>;
  }

  if (state.kind === "error") {
    return (
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-lg">{state.message}</p>
        <Link
          href="/shop"
          className="mt-4 inline-flex min-h-11 items-center text-brand underline-offset-4 hover:underline"
        >
          Go to the shop
        </Link>
      </div>
    );
  }

  const { order, message } = state;
  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl font-semibold">
        {ORDER_STATUS_LABELS[order.status]}
      </h2>
      <div className="mt-6">
        <OrderLines
          items={order.items}
          totalLabel={
            order.status === "collected" ? "Total" : "To pay on collection"
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
            <p className="w-full">Cancel this order?</p>
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
